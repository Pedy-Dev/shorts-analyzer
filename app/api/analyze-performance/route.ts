// app/api/analyze-performance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 채널 성과 분석 API (Simple Version)
 * 
 * 3대 핵심 질문에 답하기:
 * 1. 뭘 만들지? (주제/소재/각도/제목 인사이트)
 * 2. 왜 안됐는지? (깔때기 분석, 패턴 진단)
 * 3. 다음엔 어떻게? (실행 가이드, 블루프린트)
 */

// 🔥 향상된 Fallback 헬퍼 함수 - 모델 자동 전환 포함
async function callGeminiWithFallback(
  prompt: string,
  serverKey: string | undefined,
  userKey: string | undefined,
  initialModel: string = 'gemini-2.5-flash'
) {
  const models = [
    { name: 'gemini-2.5-flash', displayName: '2.5 Flash' },
    { name: 'gemini-2.0-flash-exp', displayName: '2.0 Flash Exp' }
  ];

  const tryApiCall = async (apiKey: string, keyType: 'server' | 'user', modelConfig: typeof models[0]) => {
    try {
      console.log(`[Gemini] ${keyType} API로 ${modelConfig.displayName} 모델 시도 중...`);
      const genAI = new GoogleGenerativeAI(apiKey);

      // 모델별 설정
      const generationConfig = modelConfig.name === 'gemini-2.0-flash-exp' 
        ? {
            temperature: 0.3,
            maxOutputTokens: 32768,
            responseMimeType: 'application/json' as const,
          }
        : {
            temperature: 0.3,
            maxOutputTokens: 32768,
          };

      const geminiModel = genAI.getGenerativeModel({
        model: modelConfig.name,
        generationConfig,
      });

      const result = await geminiModel.generateContent(prompt);

      // 🔥 디버깅: result 객체 전체 구조 확인
      console.log('[Gemini] result 객체 키:', Object.keys(result));
      console.log('[Gemini] response 객체 키:', result.response ? Object.keys(result.response) : 'response 없음');

      // 응답 텍스트 추출 시도
      let text = '';

      // 방법 1: text() 메서드 시도
      try {
        text = await result.response.text();
        console.log('[Gemini] text() 메서드 성공:', text.length);
      } catch (e: any) {
        console.log('[Gemini] text() 메서드 실패:', e.message);
      }

      // 방법 2: candidates에서 직접 추출
      if (!text) {
        console.log('[Gemini] candidates 확인 중...');

        // candidates 구조 디버깅
        if (result.response?.candidates) {
          console.log('[Gemini] candidates 개수:', result.response.candidates.length);
          console.log('[Gemini] 첫 번째 candidate:', JSON.stringify(result.response.candidates[0], null, 2).substring(0, 500));

          if (result.response.candidates[0]?.content?.parts) {
            const parts = result.response.candidates[0].content.parts;
            console.log('[Gemini] parts 개수:', parts.length);
            text = parts.map((part: any) => part.text || '').join('');
            console.log('[Gemini] parts에서 추출한 텍스트 길이:', text.length);
          }
        }
      }

      // 방법 3: 다른 필드 확인
      if (!text) {
        console.log('[Gemini] 다른 필드 확인 중...');
        console.log('[Gemini] result.text 존재?:', 'text' in result);
        console.log('[Gemini] result.response.text 존재?:', result.response && 'text' in result.response);

        // 전체 response 객체 출력 (처음 1000자만)
        console.log('[Gemini] 전체 response:', JSON.stringify(result.response, null, 2).substring(0, 1000));
      }

      console.log('[Gemini] 원본 응답 길이:', text.length);

      // thinking 블록이 있으면 제거
      if (text.includes('<thinking>')) {
        console.log('[Gemini] thinking 블록 제거 중...');
        text = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
      }

      // ```json 블록 추출
      if (text.includes('```json')) {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          text = jsonMatch[1].trim();
        }
      } else if (text.includes('```')) {
        // 혹시 json 없이 그냥 ``` 만 있는 경우
        const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch && codeMatch[1]) {
          text = codeMatch[1].trim();
        }
      }

      if (!text || text.trim().length === 0) {
        console.error('[Gemini] ❌ 빈 응답!');
        throw new Error('Gemini가 빈 응답을 반환했습니다');
      }

      console.log(`[Gemini] ✅ ${keyType} API + ${modelConfig.displayName} 성공! (최종 길이: ${text.length})`);
      return { success: true, text, usedKey: keyType, usedModel: modelConfig.displayName };

    } catch (error: any) {
      const errorCode = error?.status || error?.code;
      const errorMessage = error?.message || '';
      console.log(`[Gemini] ❌ ${keyType} API + ${modelConfig.displayName} 실패:`, errorCode, errorMessage);

      const isQuotaError =
        errorCode === 429 ||
        errorCode === 403 ||
        errorMessage.includes('quota') ||
        errorMessage.includes('exhausted') ||
        errorMessage.includes('RESOURCE_EXHAUSTED');

      const isModelError = 
        errorMessage.includes('models/gemini') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('does not exist');

      return { success: false, error, isQuotaError, isModelError };
    }
  };

  // 모든 조합 시도: (서버/유저 키) x (2.5-flash/2.0-flash-exp)
  let lastError: any = null;
  
  for (const modelConfig of models) {
    console.log(`\n🔄 ${modelConfig.displayName} 모델로 시도...`);
    
    // 1차: 서버 키 + 현재 모델
    if (serverKey) {
      const result = await tryApiCall(serverKey, 'server', modelConfig);
      if (result.success) return result;
      
      lastError = result.error;
      
      // 모델 오류가 아니고 쿼터 오류도 아니면 즉시 실패
      if (!result.isQuotaError && !result.isModelError) {
        console.log(`[Gemini] 서버 키 + ${modelConfig.displayName} 실패 (쿼터/모델 오류 아님)`);
      } else if (result.isQuotaError) {
        console.log(`[Gemini] ⚠️ 서버 API 한도 초과, 유저 API로 전환...`);
      } else if (result.isModelError) {
        console.log(`[Gemini] ⚠️ ${modelConfig.displayName} 모델 오류, 다음 모델로 시도...`);
        continue; // 다음 모델로
      }
    }

    // 2차: 유저 키 + 현재 모델  
    if (userKey) {
      const result = await tryApiCall(userKey, 'user', modelConfig);
      if (result.success) return result;
      
      lastError = result.error;
      
      if (result.isQuotaError) {
        console.log(`[Gemini] ⚠️ 유저 API도 한도 초과`);
        // 다음 모델로 계속 시도
      } else if (result.isModelError) {
        console.log(`[Gemini] ⚠️ 유저 키에서도 ${modelConfig.displayName} 모델 오류`);
        // 다음 모델로 계속 시도
      } else {
        console.log(`[Gemini] 유저 키 + ${modelConfig.displayName} 실패 (기타 오류)`);
        // 다음 모델로 계속 시도
      }
    }
  }

  // 모든 시도 실패
  if (lastError?.message?.includes('quota') || lastError?.message?.includes('exhausted')) {
    throw new Error('모든 API 키가 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
  }
  
  if (lastError?.message?.includes('models/gemini')) {
    throw new Error('사용 가능한 Gemini 모델이 없습니다. API 설정을 확인해주세요.');
  }

  if (!serverKey && !userKey) {
    throw new Error('사용 가능한 Gemini API 키가 없습니다. API 키를 설정해주세요.');
  }

  throw lastError || new Error('알 수 없는 오류가 발생했습니다.');
}

export async function POST(request: NextRequest) {
  try {
    const { videos, channelInfo } = await request.json();

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: '분석할 영상 데이터가 없습니다' }, { status: 400 });
    }

    // 🔥 API 키 확인
    const userGeminiKey = request.headers.get('x-gemini-api-key');
    const serverGeminiKey = process.env.GEMINI_API_KEY;

    console.log('[analyze-performance] API 키 상태:');
    console.log('  - 서버 키:', serverGeminiKey ? '✅ 있음' : '❌ 없음');
    console.log('  - 유저 키:', userGeminiKey ? '✅ 있음' : '❌ 없음');

    if (!serverGeminiKey && !userGeminiKey) {
      return NextResponse.json({
        error: 'Gemini API 키가 필요합니다. API 설정을 확인해주세요.'
      }, { status: 400 });
    }

    // 1) 핵심 지표 계산
    const enrichedVideos = videos.map((v: any) => {
      const len = num(v.duration);
      const avgPctRaw = num(v?.averageViewPercentage);
      const avgPct = avgPctRaw > 1 ? avgPctRaw / 100 : avgPctRaw;
      const shares = num(v?.shares);
      const subsGained = num(v?.subscribersGained);
      const views = num(v.views);
      const engagedViews = num(v?.engagedViews);
      const likes = num(v.likes);
      const comments = num(v.comments);

      const viralIndex = views > 0 ? (likes + comments + shares) / views : 0;
      const subConv = views > 0 ? subsGained / views : 0;
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
        viral_index: viralIndex || 0,
        subscriber_conversion_rate: subConv || 0,
        script: v.script || '',
      };
    });

    // 2) 벤치마크 계산
    const benchmarks = calculateBenchmarks(enrichedVideos);

    // 3) 성과별 그룹 분류
    const groups = classifyVideosByPerformance(enrichedVideos);

    // 4) 페이로드 구성
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
    };

    const prompt = buildPromptForGemini(payload);

    // 5) 🔥 Gemini 호출 - 2.5-flash 시작, 실패시 2.0-flash-exp 자동 폴백
    console.log('🤖 채널 성과 분석 시작...');
    const apiResult = await callGeminiWithFallback(prompt, serverGeminiKey, userGeminiKey, 'gemini-2.5-flash');
    const rawText = apiResult.text;
    console.log(`✅ 분석 완료! (사용된 API: ${apiResult.usedKey}, 모델: ${apiResult.usedModel})`);

    // 6) JSON 파싱
    const parsed = safeParseJSON(rawText);
    if (!parsed) {
      console.log('⚠️ JSON 파싱 실패, 원본 텍스트 반환');
      return NextResponse.json({
        success: true,
        llm_json_ok: false,
        llm_raw: rawText,
        videosAnalyzed: videos.length,
        usedApiKey: apiResult.usedKey,
        usedModel: apiResult.usedModel,
      });
    }

    return NextResponse.json({
      success: true,
      llm_json_ok: true,
      llm: parsed,
      videosAnalyzed: videos.length,
      usedApiKey: apiResult.usedKey,
      usedModel: apiResult.usedModel,
    });

  } catch (error: any) {
    console.error('❌ 분석 오류:', error);

    if (error?.message?.includes('한도')) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    if (error?.message?.includes('overloaded')) {
      return NextResponse.json(
        { error: 'Gemini API가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    if (error?.message?.includes('API 키')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
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

function median(values: number[]) {
  const arr = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr[mid];
}

function average(values: number[]) {
  const arr = values.filter((v) => Number.isFinite(v));
  if (arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function calculateBenchmarks(videos: any[]) {
  const viewPctValues = videos.map((v) => v.avg_view_pct).filter((p) => p > 0);
  const medianViewPct = viewPctValues.length ? median(viewPctValues) : 0.85;

  const viralValues = videos.map((v) => v.viral_index).filter((e) => e > 0);
  const medianViral = viralValues.length ? median(viralValues) : 0.02;

  const subConvValues = videos.map((v) => v.subscriber_conversion_rate).filter((s) => s > 0);
  const medianSubConv = subConvValues.length ? median(subConvValues) : 0.0005;

  const engagedRateValues = videos.map((v) => v.engaged_rate).filter((e) => e > 0);
  const medianEngagedRate = engagedRateValues.length ? median(engagedRateValues) : 0.5;

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

function classifyVideosByPerformance(videos: any[]) {
  const sorted = [...videos].sort((a, b) => {
    const aViews = a.engaged_views || a.views;
    const bViews = b.engaged_views || b.views;
    return bViews - aViews;
  });

  const topCount = Math.max(3, Math.floor(sorted.length * 0.3));
  const top = sorted.slice(0, topCount);

  const bottomCount = Math.max(3, Math.floor(sorted.length * 0.3));
  const bottom = sorted.slice(-bottomCount);

  console.log(`✅ 그룹 분류: 상위 ${top.length}개, 하위 ${bottom.length}개`);

  return { top, bottom };
}

function safeParseJSON(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/* =========================
 * 프롬프트 (Simple Version)
 * ========================= */
function buildPromptForGemini(payload: any) {
  // 상위/하위 영상만 추출
  const relevantVideos = [
    ...payload.performance_groups.top,
    ...payload.performance_groups.bottom
  ];
  
  const optimizedPayload = {
    channel_meta: {
      ...payload.channel_meta,
      analysis_context: {
        total_channel_videos: payload.channel_meta.total_videos,
        analyzed_videos_count: relevantVideos.length,
        top_videos_count: payload.performance_groups.top.length,
        bottom_videos_count: payload.performance_groups.bottom.length
      }
    },
    benchmarks: payload.benchmarks,
    performance_groups: payload.performance_groups,
    videos: relevantVideos  // 상위+하위만
  };

  const data = JSON.stringify(optimizedPayload, null, 2);

  const prompt = `
당신은 YouTube Shorts 채널 분석 전문가입니다.
제공된 데이터를 분석하여 실행 가능한 인사이트를 도출해주세요.

# 🔥 분석 방법론
- 채널 전체 ${payload.channel_meta.total_videos}개 영상 중에서
- 성과 상위 30%(${payload.performance_groups.top.length}개)와 하위 30%(${payload.performance_groups.bottom.length}개)만 비교 분석
- 중간 성과 영상은 제외하고 극단적 성과 차이에 집중하여 명확한 패턴 도출

# 핵심 목표
과거 데이터로 **다음 영상 제작 전략** 도출하기

# INPUT_DATA
${data}

# 분석 철학
이 툴의 사용자는 **나레이션 쇼츠 크리에이터**입니다.
- vlog 아님 (얼굴/배경 무관)
- 편집 기교 무관
- **오직 대본(말하는 내용)으로 승부**

따라서 분석의 100%는 **대본**과 **소재 선정**에 집중합니다.

# 사용자의 3가지 핵심 질문
1. "뭘 만들지?" → content_analysis 섹션으로 답변
2. "왜 안됐는지?" → funnel_analysis + retention_analysis + subscription_trigger로 답변  
3. "다음엔 어떻게?" → next_video_blueprint + checklist로 답변

# 중요한 연구 결과: 유효조회수의 진짜 의미
유효조회수(engaged_views)는 "영상의 70~85% 이상을 시청한 경우"에만 카운트됩니다.
- 30초 영상: 21초(70%) 시점에서 유효조회 인정
- 47초 영상: 32초(68%) 시점에서 유효조회 인정
- 51초 영상: 45초(88%) 시점에서 유효조회 인정

유효조회율이 낮다 = 대부분이 영상 중간에 이탈했다는 의미

# 세부 분석 가이드

## content_analysis (뭘 만들지?)
- by_topic: 제공된 상위/하위 영상들 내에서 소재를 3-5개 그룹으로 분류하고 각 소재별 평균 성과 계산
- by_angle: 상위 그룹과 하위 그룹 간의 접근 각도 차이 비교
- by_title: 상위 그룹 제목 패턴 vs 하위 그룹 문제점 분석

## funnel_analysis (왜 안됐는지?)
- stage_2_engagement: 상위 vs 하위 그룹의 engaged_rate 비교
- stage_3_retention: 상위 vs 하위 평균 시청률 비교
- stage_5_subscription: 상위 vs 하위 구독 전환율 비교
- biggest_gap_stage: 격차가 가장 큰 단계 선정

## retention_analysis (시청 완주력)
- 상위 vs 하위 그룹의 평균 시청률과 영상 길이 관계 분석

## subscription_trigger (구독 유도 요인)
- 구독 전환 상위 영상들의 공통점 분석

## next_video_blueprint (다음엔 어떻게?)
- topic_selection: 구체적인 소재 추천
- title_formula: 구체적인 제목 구조
- script_structure: 구체적인 대본 전략
- target_metrics: 달성 가능한 목표 수치

## checklist (실행 전 확인)
- Yes/No로 체크 가능한 구체적 항목들

# 필수 준수 사항
1. 모든 텍스트는 한국어로
2. 퍼센트는 0.85 형식 (85% 아님)
3. 구독 전환율은 0.0012 형식
4. 대본 없는 영상("자막이 없습니다")은 분석에서 제외
5. 채널 맞춤형 분석 (일반론 금지)
6. total_videos는 채널 전체 영상 수(${payload.channel_meta.total_videos})로 표시
7. 분석은 제공된 상위/하위 영상 데이터 기반으로만 진행

아래 JSON 형식으로만 응답해주세요:

\`\`\`json
{
  "executive_summary": {
    "total_videos": ${payload.channel_meta.total_videos},
    "avg_views": 정수,
    "key_findings": ["핵심 발견 1", "핵심 발견 2", "핵심 발견 3"],
    "next_video_formula": "한 문장으로 정리한 다음 영상 공식"
  },
  "content_analysis": {
    "by_topic": {
      "topics": [
        {
          "topic": "소재명",
          "video_count": 정수,
          "performance": {
            "avg_views": 정수,
            "avg_retention": 소수,
            "avg_sub_conversion": 소수
          },
          "type": "안정형|알고리즘선호형|숨은보석형",
          "recommendation": "구체적 추천사항"
        }
      ]
    },
    "by_angle": {
      "topic": "분석 대상 소재",
      "angles": [
        {
          "angle": "접근 각도명",
          "video_count": 정수,
          "avg_views": 정수,
          "avg_retention": 소수,
          "type": "대박형|알고리즘선호형|숨은보석형",
          "strength": "강점",
          "weakness": "약점",
          "recommendation": "구체적 추천사항"
        }
      ],
      "best_angle": "최적 각도"
    },
    "by_title": {
      "top_patterns": {
        "avg_length": 정수,
        "common_structures": [
          {
            "structure": "구조 패턴",
            "frequency": 정수,
            "example": "실제 예시",
            "why_works": "효과적인 이유"
          }
        ],
        "power_keywords": [
          {
            "keyword": "키워드",
            "frequency": 정수
          }
        ],
        "tone": "자극적|중립적|차분함"
      },
      "bottom_patterns": {
        "avg_length": 정수,
        "common_problems": [
          {
            "problem": "문제점",
            "examples": ["예시1", "예시2"],
            "why_fails": "실패 이유"
          }
        ]
      },
      "optimal_formula": {
        "structure": "최적 구조",
        "length": "권장 길이",
        "must_include": ["필수 요소 1", "필수 요소 2"]
      }
    }
  },
  "funnel_analysis": {
    "stage_2_engagement": {
      "top_group_engaged_rate": 소수,
      "bottom_group_engaged_rate": 소수,
      "gap": "격차 분석 및 이탈 구간 추정"
    },
    "stage_3_retention": {
      "top_group_avg_retention": 소수,
      "bottom_group_avg_retention": 소수,
      "gap": "격차 분석"
    },
    "stage_5_subscription": {
      "top_group_sub_conv": 소수,
      "bottom_group_sub_conv": 소수,
      "gap": "격차 분석"
    },
    "biggest_gap_stage": "2단계|3단계|5단계",
    "priority_fix": "우선 개선 사항"
  },
  "retention_analysis": {
    "top_group": {
      "avg_length": 정수,
      "avg_retention": 소수,
      "pattern": "시청 패턴 설명"
    },
    "bottom_group": {
      "avg_length": 정수,
      "avg_retention": 소수,
      "pattern": "시청 패턴 설명"
    },
    "critical_insight": "핵심 인사이트",
    "optimal_length": "최적 길이"
  },
  "subscription_trigger": {
    "high_conversion_videos": {
      "avg_sub_conversion": 소수,
      "avg_retention": 소수,
      "common_topics": ["주제1", "주제2"],
      "emotional_triggers": ["감정1", "감정2"],
      "ending_pattern": "마무리 패턴"
    },
    "key_findings": ["발견 1", "발견 2"],
    "subscription_formula": "구독 유도 공식"
  },
  "next_video_blueprint": {
    "topic_selection": {
      "primary": "주 소재",
      "secondary": "부 소재",
      "avoid": "피해야 할 소재"
    },
    "title_formula": {
      "structure": "제목 구조",
      "length": "글자 수",
      "must_keywords": ["키워드1", "키워드2"],
      "example": "제목 예시"
    },
    "script_structure": {
      "opening": "오프닝 전략",
      "development": "전개 방식",
      "ending": "마무리 전략",
      "optimal_length": "최적 길이"
    },
    "target_metrics": {
      "engaged_rate": "목표치",
      "retention": "목표치",
      "sub_conversion": "목표치"
    }
  },
  "checklist": {
    "topic": ["체크항목 1", "체크항목 2"],
    "angle": ["체크항목 1", "체크항목 2"],
    "title": ["체크항목 1", "체크항목 2"],
    "script": ["체크항목 1", "체크항목 2"]
  }
}
\`\`\`
`;

  return prompt;
}