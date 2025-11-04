// app/api/analyze-performance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 채널 성과 분석 API
 * - 5대 지표: 조회수, 유효조회수, 평균 조회율, 바이럴 지수, 구독 전환율
 * - 조회수 = 알고리즘 평가 (노출량)
 * - 4단계 깔때기 분석
 * - 4가지 영상 타입 분류
 * - 대본 중심 분석
 * - 채널 총평가 (5가지 평가축)
 */

export async function POST(request: NextRequest) {
  try {
    const { videos, channelInfo } = await request.json();

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: '분석할 영상 데이터가 없습니다' }, { status: 400 });
    }

    // Gemini API 키 확인
    const geminiApiKey = request.headers.get('x-gemini-api-key');
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API 키가 필요합니다' }, { status: 400 });
    }

    // 1) 서버에서 핵심 지표만 계산
    const enrichedVideos = videos.map((v: any) => {
      const len = num(v.duration);
      const avgDur = num(v?.analytics?.averageViewDuration || v?.averageViewDuration);
      const avgPctRaw = num(v?.analytics?.averageViewPercentage || v?.averageViewPercentage);
      const avgPct = avgPctRaw > 1 ? avgPctRaw / 100 : avgPctRaw; // 0~1
      const shares = num(v?.analytics?.shares || v?.shares);
      const subsGained = num(v?.analytics?.subscribersGained || v?.subscribersGained);
      const views = num(v.views);
      const engagedViews = num(v?.engagedViews);
      const likes = num(v.likes);
      const comments = num(v.comments);

      // 바이럴 지수: 좋아요 + 댓글 + 공유
      const viralIndex = views > 0 ? (likes + comments + shares) / views : 0;

      // 구독 전환율
      const subConv = views > 0 ? subsGained / views : 0;

      // 유효조회율 (유효조회수/조회수)
      const engagedRate = views > 0 ? engagedViews / views : 0;

      return {
        video_id: v.video_id,
        title: v.title,
        length_sec: len,
        published_at: v.published_at?.split('T')[0] || 'N/A',
        views,
        engaged_views: engagedViews,
        engaged_rate: engagedRate,
        likes,
        comments,
        shares,
        subscribers_gained: subsGained,
        avg_view_pct: avgPct || 0,
        avg_view_duration: avgDur,
        viral_index: viralIndex || 0,
        subscriber_conversion_rate: subConv || 0,
        script: v.script || '',
      };
    });

    // 2) 벤치마크 계산
    const benchmarks = calculateBenchmarks(enrichedVideos);

    // 3) 성과별 그룹 분류 (조회수/유효조회수 기준)
    const groups = classifyVideosByPerformance(enrichedVideos);

    // 4) LLM에 전달할 페이로드 구성
    const payload = {
      channel_meta: {
        channel_name: channelInfo?.title || '알 수 없음',
        total_videos: enrichedVideos.length,
      },
      benchmarks: {
        avg_view_pct: { median: benchmarks.medianViewPct, p30_top: benchmarks.top30AvgViewPct },
        viral_index: { median: benchmarks.medianViral, p30_top: benchmarks.top30AvgViral },
        subscriber_conversion: { median: benchmarks.medianSubConv, p30_top: benchmarks.top30AvgSubConv },
        engaged_rate: { median: benchmarks.medianEngagedRate, p30_top: benchmarks.top30AvgEngagedRate },
      },
      performance_groups: groups,
      videos: enrichedVideos,
    };

    const prompt = buildPromptForGemini(payload);

    // 5) Gemini 호출
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    console.log('🤖 채널 성과 분석 시작...');
    const result = await model.generateContent(prompt);
    const rawText = result?.response?.text() ?? '';
    console.log('✅ 분석 완료!');

    // 6) JSON 파싱
    const parsed = safeParseJSON(rawText);
    if (!parsed) {
      const m = rawText.match(/\{[\s\S]*\}$/m);
      const fallback = m ? safeParseJSON(m[0]) : null;
      if (!fallback) {
        return NextResponse.json({
          success: true,
          llm_json_ok: false,
          llm_raw: rawText,
          videosAnalyzed: videos.length,
        });
      }
      return NextResponse.json({
        success: true,
        llm_json_ok: true,
        llm: fallback,
        videosAnalyzed: videos.length,
      });
    }

    return NextResponse.json({
      success: true,
      llm_json_ok: true,
      llm: parsed,
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

/** 중앙값 */
function median(values: number[]) {
  const arr = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr[mid];
}

/** 평균 */
function average(values: number[]) {
  const arr = values.filter((v) => Number.isFinite(v));
  if (arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

/** 벤치마크 계산 (상위 30% 평균 추가) */
function calculateBenchmarks(videos: any[]) {
  const viewPctValues = videos.map((v) => v.avg_view_pct).filter((p) => p > 0);
  const medianViewPct = viewPctValues.length ? median(viewPctValues) : 0.85;
  
  const viralValues = videos.map((v) => v.viral_index).filter((e) => e > 0);
  const medianViral = viralValues.length ? median(viralValues) : 0.02;

  const subConvValues = videos.map((v) => v.subscriber_conversion_rate).filter((s) => s > 0);
  const medianSubConv = subConvValues.length ? median(subConvValues) : 0.0005;

  const engagedRateValues = videos.map((v) => v.engaged_rate).filter((e) => e > 0);
  const medianEngagedRate = engagedRateValues.length ? median(engagedRateValues) : 0.5;

  // 상위 30% 평균 계산
  const topCount = Math.max(1, Math.floor(videos.length * 0.3));
  
  const sortedByViewPct = [...viewPctValues].sort((a, b) => b - a);
  const top30AvgViewPct = sortedByViewPct.length ? average(sortedByViewPct.slice(0, topCount)) : 0.90;

  const sortedByViral = [...viralValues].sort((a, b) => b - a);
  const top30AvgViral = sortedByViral.length ? average(sortedByViral.slice(0, topCount)) : 0.03;

  const sortedBySubConv = [...subConvValues].sort((a, b) => b - a);
  const top30AvgSubConv = sortedBySubConv.length ? average(sortedBySubConv.slice(0, topCount)) : 0.001;

  const sortedByEngagedRate = [...engagedRateValues].sort((a, b) => b - a);
  const top30AvgEngagedRate = sortedByEngagedRate.length ? average(sortedByEngagedRate.slice(0, topCount)) : 0.6;

  return { 
    medianViewPct, 
    medianViral, 
    medianSubConv, 
    medianEngagedRate,
    top30AvgViewPct,
    top30AvgViral,
    top30AvgSubConv,
    top30AvgEngagedRate,
  };
}

/** 성과별 영상 그룹 분류 (조회수/유효조회수 기준) */
function classifyVideosByPerformance(videos: any[]) {
  // 유효조회수 or 조회수로 정렬
  const sorted = [...videos].sort((a, b) => {
    const aViews = a.engaged_views || a.views;
    const bViews = b.engaged_views || b.views;
    return bViews - aViews;
  });

  // 상위 30%
  const topCount = Math.max(3, Math.floor(sorted.length * 0.3));
  const top = sorted.slice(0, topCount);

  // 하위 30%
  const bottomCount = Math.max(3, Math.floor(sorted.length * 0.3));
  const bottom = sorted.slice(-bottomCount);

  console.log(`✅ 그룹 분류: 상위 ${top.length}개, 하위 ${bottom.length}개`);

  return { top, bottom };
}

/** JSON 파서 */
function safeParseJSON(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/* =========================
 * 프롬프트 (채널 내 상대 평가 + 채널 총평가)
 * ========================= */
function buildPromptForGemini(payload: any) {
  const data = JSON.stringify(payload, null, 2);

  const prompt = `
{
  "role": "system",
  "content": "당신은 YouTube Shorts 성과 분석가입니다. 제공된 데이터를 기반으로 조회수/유효조회수 기준 상위/하위 그룹을 비교 분석하고, 대본 중심의 구체적 개선안을 제시하세요. **모든 분석 결과는 반드시 한국어로 작성**하되, JSON 스키마는 그대로 유지하세요."
}

# INPUT_DATA
${data}

# 5대 분석 지표 정의

## 1. 조회수 (views)
**의미:** 유튜브 알고리즘이 이 영상을 얼마나 많이 노출시켰는가

## 2. 유효조회수 (engaged_views)
**의미:** 진지하게 시청한 조회수 (바로 이탈 제외)
**평가:** engaged_views / views 비율로 "진지한 시청" 정도 측정

## 3. 평균 조회율 (avg_view_pct) = 시청 지속률
**의미:** 영상을 끝까지 봤는가 (완주력)
**평가 방법:**
- 이 채널의 상위 30% 평균(benchmarks.avg_view_pct.p30_top)과 비교하여 상대 평가
- 시청 지속률로 이탈 구간 추정:
  * 0.90 이상: 거의 완주 (마지막까지 시청)
  * 0.70-0.90: 후반부 일부 이탈
  * 0.50-0.70: 중반부 이탈
  * 0.50 미만: 초반 이탈

## 4. 바이럴 지수 (viral_index)
**의미:** (좋아요+댓글+공유)/조회수
**평가:** 이 채널의 상위 30% 평균(benchmarks.viral_index.p30_top)과 비교

## 5. 구독 전환율 (subscriber_conversion_rate)
**의미:** 구독자 증가/조회수
**평가:** 이 채널의 상위 30% 평균(benchmarks.subscriber_conversion.p30_top)과 비교

---

# 평가 기준: 채널 내 상대 평가

**중요:** 절대적 수치가 아닌, **이 채널 내에서의 상대적 위치**로 평가하세요.

예시:
- 채널 A의 상위 30% 평균 조회율이 0.75라면, 0.75가 이 채널의 "우수" 기준
- 채널 B의 상위 30% 평균 조회율이 0.60이라면, 0.60이 이 채널의 "우수" 기준

**절대값 비교 금지:**
- "90% 이상이면 우수" (X)
- "이 채널 상위 30% 평균보다 높으면 우수" (O)

---

# 4단계 깔때기 분석 프레임워크

\`\`\`
1단계: 알고리즘 평가 (조회수)
   ↓ 유튜브가 얼마나 많이 노출시켰나?
   
2단계: 실제 관심 (유효조회수)
   ↓ 클릭 후 바로 이탈? vs 진지하게 시청?
   
3단계: 시청 유지 (평균 조회율 = 시청 지속률)
   ↓ 끝까지 봤는가? 어느 구간에서 이탈했는가?
   
4단계: 상호작용 (바이럴 지수 + 구독 전환율)
   ↓ 좋아요/댓글/공유 남겼는가? 구독까지 했는가?
\`\`\`

---

# 4가지 영상 타입 분류 (채널 기준)

**판단 기준:** 각 지표를 **이 채널의 상위 30% 평균**과 비교

## A. 🚀 대박형
- 조회수: 채널 상위 30% 이상
- 평균 조회율: 채널 상위 30% 평균 이상
- 바이럴: 채널 상위 30% 평균 이상
- 구독전환: 채널 상위 30% 평균 이상
→ **4가지 모두 상위권 = 알고리즘도 좋아하고, 사람들도 끝까지 보고, 반응도 좋음!**

## B. 📢 알고리즘 선호형
- 조회수: 채널 상위 30% 이상
- 평균 조회율: 채널 중앙값 미만
- 바이럴: 채널 중앙값 미만
→ **유튜브가 많이 노출시켰는데, 사람들이 클릭 후 바로 이탈**
→ **원인:** 썸네일/제목 vs 내용 괴리 (쇼츠는 피드 노출이라 제목은 크게 영향 없음)
→ **개선:** 대본 개선 최우선! 특히 첫 3초

## C. 💎 숨은 보석형
- 조회수: 채널 중앙값 미만
- 평균 조회율: 채널 상위 30% 평균 이상
- 바이럴: 채널 상위 30% 평균 이상
- 구독전환: 채널 상위 30% 평균 이상
→ **본 사람들은 다 좋아하는데, 알고리즘이 안 밀어줌**
→ **원인:** 알고리즘 트리거 부족 (초기 반응 부족 등)
→ **개선:** 대본은 그대로! 초반 후킹 강화로 초기 반응 유도

## D. 📊 개선 필요형
- 조회수: 채널 중앙값 미만
- 평균 조회율: 채널 중앙값 미만
- 바이럴: 채널 중앙값 미만
→ **알고리즘도 안 밀어주고, 사람들도 안 봄**
→ **개선:** 전면 재검토

---

# 영상 시작 패턴 분석

**분류 기준:**
- A. 제목 나레이션형: 영상 제목을 그대로 나레이션으로 시작
- B. 서사형: 제목과 다른 서사적 도입
- C. 질문형: 질문으로 시작
- D. 충격형: 강한 단어/숫자로 시작

**평가 방법:**
1. 각 패턴별로 상위/하위 그룹 분포 확인
2. 어떤 패턴이 **이 채널에서** 효과적인지 데이터 기반 판단
3. 패턴별 장단점을 **실제 성과 데이터**로 도출

**중요:** "제목형은 뻔하다" 같은 일반론 금지! 
→ "이 채널에서는 제목형이 상위 그룹의 70%를 차지하므로 효과적"처럼 데이터 기반 판단

---

# 분석 프로세스

## 1단계: 상위 그룹 대본 분석
performance_groups.top의 영상들을 분석:
- **시작 패턴** (제목 나레이션형? 서사형? 질문형? 충격형? 비율은?)
- **첫 3초 패턴** (어떤 문장? 어떤 감정? 공통점은?)
- **스토리 전개 구조** (빠른 전개? 반전 있음? 몇 초마다 전환?)
- **감정 유발 요소** (어떤 감정? 어떤 단어? 빈도는?)
- **자주 쓰이는 핵심 문구** (실제 대본에서 반복되는 표현)
- **마무리 방식** (CTA? 질문? 여운? 비율은?)

## 2단계: 하위 그룹 대본 분석
performance_groups.bottom의 영상들을 분석:
- 상위 그룹과 **어떻게 다른가?**
- 시작 패턴이 효과적인가?
- 첫 3초가 평범한가?
- 전개가 느린가?
- 감정 유발 요소가 없는가?

## 3단계: 영상별 타입 분류
각 하위 그룹 영상을 4가지 타입으로 분류 (채널 기준 상대 평가)

## 4단계: 구체적 개선안 도출
각 영상마다:
- 어떤 타입인지
- 무엇이 문제인지
- **시청 지속률 기반 피드백** (이탈 구간 추정)
- **대본을 어떻게 고칠지 (구체적 예시)**

---

# 5단계: 채널 총평가 (5가지 평가축)

## 평가 관점 1: 콘텐츠 정체성 (Channel DNA)

**무엇을 평가하는가:**
- 상위 30% 영상들의 공통 패턴이 명확한가?
- 채널 전체에서 "성공 패턴"을 따르는 비율은?
- 하위 영상들은 왜 이 패턴에서 벗어났는가?

**평가 방법:**
1. 상위 그룹 대본에서 반복되는 요소 찾기 (시작 패턴, 전개 구조, 감정 트리거 등)
2. 전체 영상 중 이 요소를 가진 비율 계산
3. 10점 만점으로 점수 부여
   - 8-10점: 정체성 매우 명확 (상위 그룹의 80%+ 공통점 있음)
   - 5-7점: 정체성 보통 (50-80%)
   - 0-4점: 정체성 불명확 (50% 미만)

**출력 형식:**
{
  "channel_dna_score": {
    "score": 0-10,
    "core_identity": "이 채널의 핵심 정체성을 한 문장으로 (예: 일상 속 놀라운 반전 + 감정 자극)",
    "success_pattern_ratio": 0.00-1.00,
    "key_elements": ["요소1", "요소2", "요소3"],
    "recommendation": "정체성 강화를 위한 구체적 조언 (예: 앞으로 모든 영상에 반전 요소 필수 배치)"
  }
}

---

## 평가 관점 2: 대본 섹션별 완성도 (Script Quality)

**무엇을 평가하는가:**
- 첫 3초, 중반 전개, 마무리 각각의 강약점
- 상위 vs 하위 그룹의 각 섹션별 차이

**평가 방법:**
1. 각 섹션을 10점 만점으로 평가 (대본 내용 기반)
   - 첫 3초: 후킹력 (충격/호기심/감정 자극 정도)
   - 중반 전개: 몰입도 (반전/템포/스토리 전개)
   - 마무리: 여운 (CTA/질문/감정 강조)
2. 상위/하위 그룹 평균 비교
3. 가장 약한 섹션 파악

**출력 형식:**
{
  "script_quality": {
    "opening_3sec": {
      "score": 0-10,
      "top_group_avg": 0-10,
      "bottom_group_avg": 0-10,
      "issue": "하위 그룹의 문제점 (예: 진부한 질문형 시작이 70%)",
      "fix": "개선 방법 (예: 숫자/충격 요소로 시작 변경)"
    },
    "development": {
      "score": 0-10,
      "top_group_avg": 0-10,
      "bottom_group_avg": 0-10,
      "issue": "문제점",
      "fix": "개선 방법"
    },
    "ending": {
      "score": 0-10,
      "top_group_avg": 0-10,
      "bottom_group_avg": 0-10,
      "issue": "문제점",
      "fix": "개선 방법"
    },
    "weakest_section": "opening_3sec|development|ending"
  }
}

---

## 평가 관점 3: 시청 이탈 패턴 (Retention Pattern)

**무엇을 평가하는가:**
- 채널 전체의 평균 시청지속률(avg_view_pct)
- 상위 vs 하위 그룹의 시청지속률 차이
- 이탈이 주로 발생하는 구간 추정

**평가 방법:**
1. avg_view_pct 기반으로 이탈 시점 추정
   - 0.90 이상 → 거의 완주
   - 0.70-0.90 → 후반부 이탈
   - 0.50-0.70 → 중반부 이탈
   - 0.50 미만 → 초반 이탈
2. 대본 분석해서 이탈 원인 파악
3. 상위/하위 차이 분석

**출력 형식:**
{
  "retention_pattern": {
    "channel_avg_retention": 0.00-1.00,
    "top_group_avg": 0.00-1.00,
    "bottom_group_avg": 0.00-1.00,
    "critical_drop_point": "초반|중반|후반",
    "estimated_drop_timing": "X-Y초 구간 (영상 길이 고려)",
    "drop_reasons": [
      {"reason": "원인1 (예: 반전 없이 단조로운 전개)", "affected_videos": 0},
      {"reason": "원인2", "affected_videos": 0}
    ],
    "solution": "이탈 방지 구체적 방법 (예: 12초 이전에 반드시 예상 밖 요소 삽입)"
  }
}

---

## 평가 관점 4: 타겟 오디언스 정렬도 (Audience Fit)

**무엇을 평가하는가:**
- 상위 그룹이 자극하는 감정/주제
- 하위 그룹이 타겟에서 벗어난 정도

**평가 방법:**
1. 상위 그룹 대본에서 공통 감정/주제 추출
2. 하위 그룹이 이 요소를 놓친 비율
3. 10점 만점 점수

**출력 형식:**
{
  "audience_fit": {
    "score": 0-10,
    "top_group_profile": {
      "target_emotion": ["감정1", "감정2"],
      "target_theme": ["주제1", "주제2"],
      "content_style": "스타일 설명 (예: 빠른 템포 + 반전)"
    },
    "bottom_group_issues": [
      {"issue": "문제1 (예: 너무 전문적)", "ratio": 0.00-1.00},
      {"issue": "문제2", "ratio": 0.00-1.00}
    ],
    "recommendation": "타겟 정렬 방법 (예: 모든 영상을 20-35세 타겟, 감정 자극(놀라움+공감) 기준으로)"
  }
}

---

## 평가 관점 5: 우선순위 개선 로드맵 (Priority Actions)

**무엇을 제시하는가:**
- 난이도 vs 효과를 고려한 개선 우선순위
- 즉시 실행 가능한 것부터 나열

**평가 방법:**
1. 위 4가지 평가에서 가장 점수 낮은 영역 파악
2. 효과 크고 난이도 낮은 것 우선
3. 3-5개 액션 아이템 제시

**중요:** 쇼츠는 피드 노출이므로 썸네일/제목 A/B 테스트는 의미 없음!
→ 대본 개선에만 집중

**출력 형식:**
{
  "priority_actions": [
    {
      "priority": 1,
      "area": "channel_dna|script_quality|retention|audience_fit",
      "action": "구체적으로 무엇을 해야 하는지 (예: 첫 3초를 숫자/충격 요소로 변경)",
      "difficulty": "낮음|중간|높음",
      "expected_impact": "예상되는 효과 (수치로, 예: 평균 조회율 +15%p)",
      "how_to": "실행 방법 상세 설명 (예: 현재 질문형 시작을 '무려 X만원', '충격! X가...'로 교체)"
    }
  ]
}

---

# 필수 JSON 스키마

{
  "summary": [
  "[채널 현황] 총 X개 영상 분석, 평균 조회수 X, 평균 유효조회수 X, 평균 시청지속률 X%",
  "[강점] 상위 그룹의 핵심 성공 패턴: (구체적 패턴 설명)",
  "[약점] 하위 그룹의 주요 문제점: (구체적 문제 설명)",
  "[차별화 포인트] 이 채널만의 고유한 특징이나 스타일",
  "[즉시 개선사항] 지금 당장 적용 가능한 가장 효과적인 개선 방법 1-2가지",
  "[중장기 전략] 채널 성장을 위한 핵심 전략 방향"
],
  "top_group_videos": [
    {
      "title": "영상 제목",
      "views": 0,
      "engaged_views": 0,
      "avg_view_pct": 0.00
    }
  ],
  "bottom_group_videos": [
    {
      "title": "영상 제목",
      "views": 0,
      "engaged_views": 0,
      "avg_view_pct": 0.00
    }
  ],
  "top_group_patterns": {
    "opening_pattern": "이 채널 상위 그룹의 시작 패턴 분석 (데이터 기반)",
    "first_3_seconds": "첫 3초 공통 패턴",
    "story_structure": "스토리 전개 구조",
    "emotion_triggers": ["감정1", "감정2"],
    "key_phrases": ["자주 나오는 문구1", "문구2"],
    "ending_style": "마무리 방식"
  },
  "bottom_group_weaknesses": {
    "opening_pattern": "시작 패턴의 문제점 (데이터 기반)",
    "first_3_seconds": "첫 3초 약점",
    "story_structure": "전개 약점",
    "missing_elements": ["놓친 요소1", "요소2"]
  },
  "video_analysis": [
    {
      "video_id": "string",
      "title": "string",
      "type": "대박형|알고리즘선호형|숨은보석형|개선필요형",
      "current_performance": {
        "views": 0,
        "engaged_views": 0,
        "likes": 0,
        "comments": 0,
        "shares": 0,
        "avg_view_pct": 0.00,
        "avg_view_duration_sec": 0,
        "viral_index": 0.00,
        "subscriber_conversion_rate": 0.0000
      },
      "diagnosis": "현재 상태 진단 (4단계 깔때기 중 어디서 막혔는지)",
      "retention_feedback": "시청 지속률 X%는 보통 Y초에서 이탈을 의미합니다. 이 영상은...",
      "opening_pattern_analysis": "이 영상은 [제목나레이션형/서사형/질문형/충격형]으로 시작하는데...",
      "main_issues": ["문제1", "문제2"],
      "script_improvements": [
        {
          "section": "시작부|첫 3초|중간|마무리",
          "current_script": "현재 대본 발췌 (50자 이내)",
          "improved_script": "개선된 대본 예시 (50자 이내)",
          "why": "왜 이렇게 바꾸면 좋은지 (한 문장)"
        }
      ],
      "expected_result": "예상 효과"
    }
  ],
  "channel_overall_evaluation": {
    "channel_dna_score": { 
      "score": 0-10,
      "core_identity": "string",
      "success_pattern_ratio": 0.00-1.00,
      "key_elements": ["string"],
      "recommendation": "string"
    },
    "script_quality": {
      "opening_3sec": {
        "score": 0-10,
        "top_group_avg": 0-10,
        "bottom_group_avg": 0-10,
        "issue": "string",
        "fix": "string"
      },
      "development": {
        "score": 0-10,
        "top_group_avg": 0-10,
        "bottom_group_avg": 0-10,
        "issue": "string",
        "fix": "string"
      },
      "ending": {
        "score": 0-10,
        "top_group_avg": 0-10,
        "bottom_group_avg": 0-10,
        "issue": "string",
        "fix": "string"
      },
      "weakest_section": "opening_3sec|development|ending"
    },
    "retention_pattern": {
      "channel_avg_retention": 0.00-1.00,
      "top_group_avg": 0.00-1.00,
      "bottom_group_avg": 0.00-1.00,
      "critical_drop_point": "초반|중반|후반",
      "estimated_drop_timing": "string",
      "drop_reasons": [
        {"reason": "string", "affected_videos": 0}
      ],
      "solution": "string"
    },
    "audience_fit": {
      "score": 0-10,
      "top_group_profile": {
        "target_emotion": ["string"],
        "target_theme": ["string"],
        "content_style": "string"
      },
      "bottom_group_issues": [
        {"issue": "string", "ratio": 0.00-1.00}
      ],
      "recommendation": "string"
    },
    "priority_actions": [
      {
        "priority": 1,
        "area": "string",
        "action": "string",
        "difficulty": "낮음|중간|높음",
        "expected_impact": "string",
        "how_to": "string"
      }
    ]
  }
}

---

# 중요 지시사항

1. **데이터 기반 평가:** 제공된 수치와 대본만 사용. 추측 금지
2. **채널 내 상대 평가:** 절대값(90%, 3% 등) 사용 금지. 이 채널의 상위 30% 기준으로 평가
3. **구체적 피드백:** "대본 개선 필요" (X) → "첫 3초에 숫자 요소 추가" (O)
4. **실행 가능성:** 창작자가 바로 적용할 수 있는 조언
5. **우선순위 명확:** 효과 크고 난이도 낮은 것부터 순서대로
6. **채널 맞춤형:** 이 채널만의 고유한 특성 반영
7. **쇼츠 특성 고려:** 피드 노출이므로 썸네일/제목 A/B 테스트 제안 금지
8. **대본 없는 영상:** "자막이 없습니다", "자막 추출 실패" 영상은 분석 제외하되 언급
9. **JSON만 출력:** 마크다운, 추가 설명 금지
10. **퍼센트 표기:** 소수점 (0.92, "92%" 아님)
11. **구독 전환율:** 소수점 4자리 (0.0012 등)
`;

  return prompt;
}