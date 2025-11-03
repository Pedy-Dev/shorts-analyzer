//app\api\analyze-performance
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 하이브리드 설계:
 * - 서버: 채널 평균으로 C(Stop Coefficient) 결정 → 각 영상 CTR_proxy 계산 → 구조화 데이터 준비
 * - LLM(Gemini): 해석/병목 진단/실험안 제시 + C 보정 제안(delta_c)만 수행
 *
 * ⚠️ 전제: 클라이언트가 보내는 videos 항목에 아래 필드들이 포함됨
 *  - v.video_id, v.title, v.duration, v.published_at, v.views, v.likes, v.comments
 *  - v.analytics.averageViewDuration, v.analytics.averageViewPercentage, v.analytics.shares, v.analytics.subscribersGained
 */

export async function POST(request: NextRequest) {
  try {
    const { videos, channelInfo } = await request.json();

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: '분석할 영상 데이터가 없습니다' }, { status: 400 });
    }

    // Gemini API 키 확인 (클라이언트에서 header로 전달)
    const geminiApiKey = request.headers.get('x-gemini-api-key');
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API 키가 필요합니다' }, { status: 400 });
    }

    // 1) 채널 요약(평균치) 계산
    const channelSummary = summarizeChannel(videos);

    // 2) 서버에서 C(Stop Coefficient) 결정
    const stopCoef = decideStopCoef(channelSummary);

    // 3) 서버에서 CTR_proxy 계산 (0~1 clamp)
    const enrichedVideos = videos.map((v: any) => {
      const len = num(v.duration);
      const avgDur = num(v?.analytics?.averageViewDuration);
      const avgPctRaw = num(v?.analytics?.averageViewPercentage);
      const avgPct = avgPctRaw > 1 ? avgPctRaw / 100 : avgPctRaw; // 0~1
      const shares = num(v?.analytics?.shares);
      const subsGained = num(v?.analytics?.subscribersGained);

      const vtr = len > 0 ? avgDur / len : 0;
      const views = num(v.views);
      const engagementRate = views > 0 ? (num(v.likes) + num(v.comments) + shares) / views : 0;
      const subConv = views > 0 ? subsGained / views : 0;

      const ctrProxy = computeCtrProxy(avgDur, len, stopCoef);

      return {
        video_id: v.video_id,
        title: v.title,
        length_sec: len,
        published_at: v.published_at?.split('T')[0] || 'N/A',
        views,
        likes: num(v.likes),
        comments: num(v.comments),
        shares,
        subscribers_gained: subsGained,
        avg_view_dur_sec: avgDur,
        avg_view_pct: avgPct,          // 0~1
        vtr,                           // avgDur/len
        ctr_proxy: ctrProxy,           // 0~1 (서버 계산)
        engagement_rate: engagementRate,
        subscriber_conversion_rate: subConv,
      };
    });

    // 4) 벤치마크(중앙값 등) 계산
    const benchmarks = calculateBenchmarks(enrichedVideos);

    // 5) LLM에 전달할 페이로드 구성 (서버 계산값 포함)
    const payload = {
      channel_meta: {
        channel_name: channelInfo?.title || '알 수 없음',
        time_zone: 'Asia/Seoul',
        total_videos: enrichedVideos.length,
        // 서버 계산 평균치
        vtr_mean: channelSummary.vtrMean,                 // 0~1
        avg_view_pct_mean: channelSummary.avgViewPctMean, // 0~1
        duration_mean_sec: channelSummary.durMean,        // sec
        stop_coefficient_used: stopCoef,                  // 서버가 최종 사용한 C
      },
      benchmarks: {
        ctr_proxy: { p50: median(enrichedVideos.map(v => v.ctr_proxy)), target: 0.50 },
        avg_view_pct: { p50: benchmarks.medianViewPct, target: 0.90 },
        engagement_rate: { p50: benchmarks.medianEngagement, target: 0.05 },
      },
      videos: enrichedVideos,
    };

    const prompt = buildPromptForGemini(payload);

    // 6) Gemini 호출 (JSON 강제 + 낮은 temperature)
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    console.log('🤖 Gemini 분석 시작...');
    const result = await model.generateContent(prompt);
    const rawText = result?.response?.text() ?? '';
    console.log('✅ Gemini 분석 완료!');

    // 7) JSON 파싱 + 폴백
    const parsed = safeParseJSON(rawText);
    if (!parsed) {
      // 폴백: 텍스트에서 첫 JSON 블록 추출 시도
      const m = rawText.match(/\{[\s\S]*\}$/m);
      const fallback = m ? safeParseJSON(m[0]) : null;
      if (!fallback) {
        // 그래도 실패하면 텍스트 그대로 반환
        return NextResponse.json({
          success: true,
          llm_json_ok: false,
          llm_raw: rawText,
          server_used_stop_coefficient: stopCoef,
          videosAnalyzed: videos.length,
        });
      }
      return NextResponse.json({
        success: true,
        llm_json_ok: true,
        llm: fallback,
        server_used_stop_coefficient: stopCoef,
        videosAnalyzed: videos.length,
      });
    }

    return NextResponse.json({
      success: true,
      llm_json_ok: true,
      llm: parsed,
      server_used_stop_coefficient: stopCoef,
      videosAnalyzed: videos.length,
    });

  } catch (error: any) {
    console.error('❌ 분석 오류:', error);

    if (error?.message?.includes('overloaded')) {
      return NextResponse.json(
        { error: 'Gemini API가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '성과 분석 실패', details: error?.message },
      { status: 500 }
    );
  }
}

/* =========================
 * Utilities
 * ========================= */

function num(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/** 채널 평균치 자동 요약: vtrMean / avgViewPctMean / durMean */
function summarizeChannel(videos: any[]) {
  const n = Math.max(1, videos.length);
  let vtrSum = 0;
  let pctSum = 0;
  let durSum = 0;

  for (const v of videos) {
    const len = num(v?.duration);
    const avgDur = num(v?.analytics?.averageViewDuration);
    const avgPctRaw = num(v?.analytics?.averageViewPercentage);
    const avgPct = avgPctRaw > 1 ? avgPctRaw / 100 : avgPctRaw;

    if (len > 0) vtrSum += avgDur / len;
    pctSum += avgPct;
    durSum += len;
  }

  return {
    vtrMean: vtrSum / n,            // 0~1
    avgViewPctMean: pctSum / n,     // 0~1
    durMean: durSum / n,            // sec
  };
}

/** 서버에서 C(Stop Coefficient) 결정: 0.5~0.7 */
function decideStopCoef(s: { vtrMean: number; avgViewPctMean: number; durMean: number }) {
  let C = 0.60;
  if (s.vtrMean >= 0.60 || s.avgViewPctMean >= 0.90) C = 0.67;
  else if (s.vtrMean < 0.45) C = 0.53;

  if (s.durMean >= 45) C += 0.05;
  else if (s.durMean <= 20) C -= 0.05;

  return clamp01toRange(C, 0.5, 0.7);
}

function clamp01toRange(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

/** CTR_proxy 계산 (0~1 clamp) */
function computeCtrProxy(avgViewDurationSec: number, lenSec: number, C: number) {
  if (lenSec <= 0 || C <= 0) return 0;
  const x = avgViewDurationSec / (C * lenSec);
  return Math.max(0, Math.min(1, x));
}

/** 중앙값 */
function median(values: number[]) {
  const arr = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr[mid];
}

/** 벤치마크 계산 (avg_view_pct/engagement 중심) */
function calculateBenchmarks(videos: any[]) {
  const viewPctValues = videos
    .map((v) => num(v?.avg_view_pct))
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  const medianViewPct = viewPctValues.length ? viewPctValues[Math.floor(viewPctValues.length / 2)] : 0.85;

  const engagementValues = videos
    .map((v) => num(v?.engagement_rate))
    .filter((e) => e > 0)
    .sort((a, b) => a - b);

  const medianEngagement = engagementValues.length ? engagementValues[Math.floor(engagementValues.length / 2)] : 0.03;

  return { medianViewPct, medianEngagement };
}

/** JSON 파서 (실패 시 null) */
function safeParseJSON(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/* =========================
 * Prompt Builder (LLM에게 해석+보정만 시킴) - 한국어 버전
 * ========================= */
function buildPromptForGemini(payload: any) {
  // JSON으로 그대로 넘김
  const data = JSON.stringify(payload, null, 2);

  // 🔥 한국어 프롬프트로 변경
  const prompt = `
{
  "role": "system",
  "content": "당신은 YouTube Shorts 성장 분석가입니다. 서버가 이미 stop_coefficient (C)와 각 영상의 CTR_proxy를 계산했습니다. CTR_proxy를 재계산하지 마세요. 병목을 분석하고, 실험을 제안하며, 필요시 C 조정값(delta_c, -0.10~+0.10 범위)을 제안하세요. **모든 분석 결과는 반드시 한국어로 작성하되**, JSON 스키마는 그대로 유지하세요. 스키마에 정의된 형식만 출력하고, 마크다운이나 추가 설명은 넣지 마세요."
}

# INPUT_DATA (수정하지 마세요)
${data}

# 용어 정의
- CTR_proxy (0~1): 서버가 계산한 '진입 강도' 지표 (클릭률 근사치)
- avg_view_pct (0~1): 완주율 (영상 시청 완료 비율)
- engagement_rate: 참여율 = (좋아요 + 댓글 + 공유) / 조회수
- 목표 값:
  - CTR_proxy: 0.50
  - avg_view_pct: 0.90
  - engagement_rate: 0.05

# 병목 판단 규칙
- 진입력 병목: CTR_proxy < 0.50
- 완주력 병목: avg_view_pct < 0.90
- 참여 병목: engagement_rate < 0.05

# 필수 JSON 스키마 (정확히 이 형식으로 출력)
{
  "summary": [
    "1-2문장으로 핵심 인사이트를 숫자와 함께 설명",
    "..."
  ],
  "bottlenecks": {
    "entry": ["video_id", "..."],
    "completion": ["video_id", "..."],
    "engagement": ["video_id", "..."]
  },
  "top_videos": [
    {
      "video_id": "string",
      "title": "string",
      "why_it_worked": "성공 이유를 한국어로 간단히",
      "key_metrics": {
        "ctr_proxy": 0.00,
        "avg_view_pct": 0.00,
        "engagement_rate": 0.00,
        "views": 0
      }
    }
  ],
  "bottom_videos": [
    {
      "video_id": "string",
      "title": "string",
      "main_issue": "entry|completion|engagement",
      "key_metrics": {
        "ctr_proxy": 0.00,
        "avg_view_pct": 0.00,
        "engagement_rate": 0.00,
        "views": 0
      },
      "fix_suggestions": ["개선 방안을 한국어로", "..."]
    }
  ],
  "experiments_top5": [
    {
      "name": "실험명을 한국어로",
      "target": "video_id 또는 패턴",
      "expected_gain": "CTR_proxy +x%p 또는 avg_view_pct +x%p",
      "how": "구체적인 실행 방법을 한국어로"
    }
  ],
  "c_adjust_suggestion": {
    "delta_c": 0.00,
    "reason": "조정 이유를 한국어로"
  }
}

# 지시사항
- 제공된 숫자만 사용하세요. CTR_proxy를 재계산하지 마세요.
- JSON은 최소한으로 유지하고 유효해야 합니다. 추가 키는 넣지 마세요. 마크다운이나 JSON 외부의 설명은 금지됩니다.
- 퍼센트는 JSON에서 소수점으로 표시하세요 (예: 0.42, '42%' 아님).
- delta_c는 -0.10과 +0.10 사이여야 합니다. 변경이 필요 없으면 0.00으로 설정하고 간단한 이유를 적으세요.
- **모든 텍스트 설명과 제안은 반드시 한국어로 작성하세요.**
`;

  return prompt;
}