// app/api/analyze-performance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 채널 성과 분석 API (재설계 버전)
 * 
 * 3대 핵심 질문에 답하기:
 * 1. 뭘 만들지? (주제/소재/각도/제목 인사이트)
 * 2. 왜 안됐는지? (깔때기 분석, 패턴 진단)
 * 3. 다음엔 어떻게? (실행 가이드, 블루프린트)
 */

export async function POST(request: NextRequest) {
  try {
    const { videos, channelInfo } = await request.json();

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: '분석할 영상 데이터가 없습니다' }, { status: 400 });
    }

    const geminiApiKey = request.headers.get('x-gemini-api-key');
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API 키가 필요합니다' }, { status: 400 });
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
 * 프롬프트 (3단계 니즈 기반)
 * ========================= */
function buildPromptForGemini(payload: any) {
  const data = JSON.stringify(payload, null, 2);

  const prompt = `
당신은 나레이션 기반 YouTube Shorts 채널 분석 전문가입니다.

# 핵심 목표
과거 데이터로 **다음 영상 제작 전략** 도출하기

# INPUT_DATA
${data}

---

# 분석 철학

이 툴의 사용자는 **나레이션 쇼츠 크리에이터**입니다.
- vlog 아님 (얼굴/배경 무관)
- 편집 기교 무관
- **오직 대본(말하는 내용)으로 승부**

따라서 분석의 100%는 **대본**과 **소재 선정**에 집중합니다.

---

# 사용자의 3가지 핵심 질문

## 질문 1: "뭘 만들지?"
→ content_analysis 섹션으로 답변
- 어떤 소재가 잘 먹히는가?
- 같은 소재도 어떤 각도가 효과적인가?
- 제목은 어떤 패턴이 좋은가?

## 질문 2: "왜 안됐는지?"
→ funnel_analysis + retention_analysis + subscription_trigger로 답변
- 5단계 깔때기 중 어디서 막혔는가?
- 상위 vs 하위 차이의 원인은?
- 구독 전환 높은 영상의 비밀은?

## 질문 3: "다음엔 어떻게?"
→ next_video_blueprint + checklist로 답변
- 다음 영상 소재는?
- 제목은 어떻게?
- 대본 구조는?
- 체크리스트는?

---

# 분석 원칙

1. **데이터만 사용**: 추측 금지, 제공된 대본과 수치만 활용
2. **채널 내 상대 평가**: "이 채널에서" 잘된 것 vs 안된 것 비교
3. **구체적 피드백**: "개선 필요" (X) → "첫 3초를 숫자로 시작" (O)
4. **실행 가능성**: 창작자가 바로 적용 가능한 조언
5. **순수 한국어**: 모든 분석 결과는 한국어로

---

# 중요한 연구 결과: 유효조회수의 진짜 의미

**핵심 발견:**
유효조회수(engaged_views)는 "영상의 70~85% 이상을 시청한 경우"에만 카운트됩니다.

**데이터 근거:**
- 30초 영상: 21초(70%) 시점에서 유효조회 인정
- 47초 영상: 32초(68%) 시점에서 유효조회 인정
- 51초 영상: 45초(88%) 시점에서 유효조회 인정

**이것이 의미하는 것:**
1. "후킹"은 첫 3초만의 문제가 아님
2. 영상 전체 흐름(첫 3초 + 중반 전개 + 후반 일부)이 중요
3. 유효조회율이 낮다 = 대부분이 영상 중간에 이탈

**이탈 구간 역추정 공식:**
- 유효조회율 30% → 영상의 약 20~30% 지점에서 대량 이탈
- 유효조회율 50% → 영상의 약 50~60% 지점에서 이탈
- 유효조회율 70%+ → 영상 대부분 시청 (후킹 성공)

**예시:**
45초 영상의 유효조회율이 38%라면:
→ 대부분이 영상의 약 30% 지점(13.5초)에서 이탈
→ 10~15초 구간의 대본을 분석하여 문제 파악 필요

---

# JSON 스키마

{
  "executive_summary": {
    "total_videos": 0,
    "avg_views": 0,
    "key_findings": [
      "핵심 발견 1 (수치 포함)",
      "핵심 발견 2",
      "핵심 발견 3"
    ],
    "next_video_formula": "다음 영상 성공 공식 한 문장"
  },

  "content_analysis": {
    "by_topic": {
      "topics": [
        {
          "topic": "소재명",
          "video_count": 0,
          "performance": {
            "avg_views": 0,
            "avg_retention": 0.00,
            "avg_sub_conversion": 0.0000
          },
          "type": "안정형|알고리즘선호형|숨은보석형",
          "recommendation": "이 소재 전략"
        }
      ]
    },
    "by_angle": {
      "topic": "대표 소재",
      "angles": [
        {
          "angle": "접근 각도명",
          "video_count": 0,
          "avg_views": 0,
          "avg_retention": 0.00,
          "type": "대박형|알고리즘선호형|숨은보석형",
          "strength": "이 각도의 강점",
          "weakness": "이 각도의 약점",
          "recommendation": "이 각도 활용법"
        }
      ],
      "best_angle": "최적 각도 설명"
    },
    "by_title": {
      "top_patterns": {
        "avg_length": 0,
        "common_structures": [
          {
            "structure": "제목 구조 패턴",
            "frequency": 0,
            "example": "실제 제목 예시",
            "why_works": "효과적인 이유"
          }
        ],
        "power_keywords": [
          {"keyword": "키워드", "frequency": 0}
        ],
        "tone": "자극적|중립적|차분함"
      },
      "bottom_patterns": {
        "avg_length": 0,
        "common_problems": [
          {
            "problem": "문제 유형",
            "examples": ["실패 제목1", "실패 제목2"],
            "why_fails": "실패 이유"
          }
        ]
      },
      "optimal_formula": {
        "structure": "최적 제목 구조",
        "length": "X-Y자",
        "must_include": ["필수 요소1", "필수 요소2"]
      }
    }
  },

  "funnel_analysis": {
    "stage_2_engagement": {
      "top_group_engaged_rate": 0.00,
      "bottom_group_engaged_rate": 0.00,
      "gap": "차이 해석 + 이탈 구간 추정 (예: 하위는 영상의 30% 지점에서 이탈, 초반 전개 개선 필요)"
    },
    "stage_3_retention": {
      "top_group_avg_retention": 0.00,
      "bottom_group_avg_retention": 0.00,
      "gap": "차이 해석 (예: 중반 템포 저하, 반전 부족)"
    },
    "stage_5_subscription": {
      "top_group_sub_conv": 0.0000,
      "bottom_group_sub_conv": 0.0000,
      "gap": "차이 해석 (예: 마무리에 질문/CTA 부족)"
    },
    "biggest_gap_stage": "2단계|3단계|5단계",
    "priority_fix": "최우선 개선 포인트 설명"
  },

  "retention_analysis": {
    "top_group": {
      "avg_length": 0,
      "avg_retention": 0.00,
      "pattern": "잘되는 영상의 대본 패턴"
    },
    "bottom_group": {
      "avg_length": 0,
      "avg_retention": 0.00,
      "pattern": "안되는 영상의 문제점"
    },
    "critical_insight": "시청 완주의 핵심 비결",
    "optimal_length": "X-Y초"
  },

  "subscription_trigger": {
    "high_conversion_videos": {
      "avg_sub_conversion": 0.0000,
      "avg_retention": 0.00,
      "common_topics": ["소재1", "소재2"],
      "emotional_triggers": ["감정1", "감정2"],
      "ending_pattern": "마무리 패턴 설명"
    },
    "key_findings": [
      "구독 유도 발견1",
      "구독 유도 발견2"
    ],
    "subscription_formula": "구독 전환 공식"
  },

  "next_video_blueprint": {
    "topic_selection": {
      "primary": "1순위 소재 (이유 포함)",
      "secondary": "2순위 소재 (이유 포함)",
      "avoid": "피해야 할 소재 (이유 포함)"
    },
    "title_formula": {
      "structure": "제목 구조 공식",
      "length": "X-Y자",
      "must_keywords": ["필수 키워드1", "필수 키워드2"],
      "example": "예시 제목"
    },
    "script_structure": {
      "opening": "오프닝 전략 (구체적)",
      "development": "본론 전개 방법 (구체적)",
      "ending": "마무리 전략 (구체적)",
      "optimal_length": "X-Y초"
    },
    "target_metrics": {
      "engaged_rate": "목표 후킹 성공률",
      "retention": "목표 완주율",
      "sub_conversion": "목표 구독 전환율"
    }
  },

  "checklist": {
    "topic": [
      "소재 선정 체크 항목 (구체적)"
    ],
    "angle": [
      "각도 선택 체크 항목 (구체적)"
    ],
    "title": [
      "제목 작성 체크 항목 (구체적)"
    ],
    "script": [
      "대본 작성 체크 항목 (구체적)"
    ]
  }
}

---

# 세부 분석 가이드

## 1. content_analysis (뭘 만들지?)

### by_topic (소재별 성과)
- 대본과 제목을 보고 소재를 3-5개 그룹으로 분류
- 각 소재별 평균 성과 계산
- 타입 분류 기준:
  * 안정형: 시청률 높음 + 조회수 중간
  * 알고리즘선호형: 조회수 높음 + 시청률 낮음
  * 숨은보석형: 시청률 매우 높음 + 조회수 낮음

### by_angle (각도별 성과)
- 가장 많은 소재를 선택
- 같은 소재 내에서 접근 각도 분류 (예: 서사형, 팩트형, 위기극복형)
- 각도별 성과 비교 분석

### by_title (제목 전략)
- 상위 그룹 제목의 공통 패턴 추출
- 하위 그룹 제목의 문제점 분석
- 파워 키워드는 빈도 3회 이상만 포함

## 2. funnel_analysis (왜 안됐는지?)

### stage_2_engagement (후킹 성공률) - 가장 중요!

**분석 절차:**
1. 상위 vs 하위 그룹의 engaged_rate 비교
2. 하위 그룹의 engaged_rate로 이탈 구간 추정
3. 추정된 이탈 구간의 대본 분석
4. 구체적 개선 방향 제시

**이탈 구간 추정 예시:**
- 하위 engaged_rate 35%, 평균 영상 길이 40초
  → 영상의 약 25~35% 지점 이탈 = 10~14초 구간
  → 10~14초 대본 확인: "그리고 두 번째로..." (지루한 나열)
  → 개선: 10초 전에 반전/충격 요소 삽입

**gap 작성 예시:**
"상위 72% vs 하위 38%. 하위는 영상의 약 30% 지점(12초)에서 대량 이탈. 10~15초 구간에 템포 저하 또는 반전 부족으로 추정. 초반 전개 전체를 개선해야 함."

### stage_3_retention (시청 완주율)
- 상위 vs 하위 평균 시청률 비교
- 영상 길이와 시청률의 상관관계
- 대본 패턴 분석

### stage_5_subscription (구독 전환율)
- 상위 vs 하위 구독 전환율 비교
- 마무리 패턴 차이 분석

**최우선 개선 단계 선정:**
3개 단계 중 격차가 가장 큰 것을 biggest_gap_stage로 지정

## 3. retention_analysis (시청 완주력)

- 상위 vs 하위 그룹의 평균 시청률 비교
- 영상 길이와 시청률의 관계
- 대본 패턴 분석 (후킹, 전개 속도, 반전 등)

## 4. subscription_trigger (구독 유도 요인)

- 구독 전환 상위 영상들의 공통점
- 감정 자극 요소
- 마무리 패턴 (질문형/CTA형/여운형)

## 5. next_video_blueprint (다음엔 어떻게?)

**모든 항목이 구체적이어야 함:**
- topic_selection: "인간관계" (X) → "직장 내 인간관계 갈등" (O)
- title_formula: "좋은 제목" (X) → "[상황] + [반전결과]" (O)
- script_structure: "잘 시작하기" (X) → "숫자로 시작 + 3초 내 포인트" (O)

## 6. checklist (실행 전 확인)

각 항목이 Yes/No로 체크 가능하도록 구체적으로:
- "소재가 적절한가?" (X)
- "이전 상위 30% 소재와 동일 카테고리인가?" (O)

---

# 필수 준수 사항

1. **대본 없는 영상 제외**: "자막이 없습니다", "자막 추출 실패" 영상은 분석에서 제외
2. **소수점 표기**: 퍼센트는 0.85 형식 ("85%" 아님)
3. **구독 전환율**: 0.0012 형식 (소수점 4자리)
4. **순수 JSON만 출력**: 마크다운, 코드블록, 설명 모두 금지
5. **순수 한국어**: 모든 텍스트는 한국어로 (영어 전문용어 금지)
6. **데이터 기반**: 추측이나 일반론 금지, 오직 제공된 데이터만 사용
7. **채널 맞춤형**: "일반적으로 좋다" (X) → "이 채널에서 효과적이다" (O)
8. **이탈 구간 추정**: stage_2_engagement 분석 시 반드시 이탈 구간을 추정하고 해당 구간의 문제 지적

---

# 출력 예시 (구조 참고용)

{
  "executive_summary": {
    "key_findings": [
      "최대 격차는 2단계(후킹 성공률)로 상위 72% vs 하위 38%, 하위는 영상 12초 지점에서 이탈",
      "구독 전환 높은 영상(0.0015+)은 모두 '인간관계 갈등' 소재 + 질문형 마무리",
      "제목은 15-18자 + '절대/진짜' 키워드 포함 시 평균 조회수 2.3배 증가"
    ],
    "next_video_formula": "인간관계 갈등 소재 + 숫자 시작 + 15초 반전 + 질문 마무리 (45-50초)"
  },
  "funnel_analysis": {
    "stage_2_engagement": {
      "top_group_engaged_rate": 0.72,
      "bottom_group_engaged_rate": 0.38,
      "gap": "상위 72% vs 하위 38% (34%p 차이). 하위 그룹은 영상의 약 30% 지점(평균 12초)에서 대량 이탈. 10~15초 구간을 분석한 결과 지루한 나열식 전개가 공통점. 이 구간에 반전 요소 삽입 필요."
    }
  }
}
`;

  return prompt;
}