// app/api/generate-script/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const STEP1_TEMPERATURE = 0.3;  // 주제+대본 통합 분석
const STEP2_TEMPERATURE = 0.4;  // 제목 전략

// 모델 전략 (3호출 최적화)
const MODEL_STEP1_PRIMARY = 'gemini-2.5-flash';    // Call 1: 주제+대본 (가장 무거움)
const MODEL_STEP2_PRIMARY = 'gemini-2.0-flash-exp'; // Call 2: 제목 (가벼움)

const MODEL_FALLBACK = 'gemini-2.0-flash-exp';

// ---------- Gemini 호출 공통 함수 ----------

async function callGemini(
  prompt: string,
  {
    model = MODEL_STEP1_PRIMARY,
    temperature = STEP1_TEMPERATURE,
    stepName = '',
  }: { model?: string; temperature?: number; stepName?: string } = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API 키가 서버에 설정되지 않았습니다.');
  }

  try {
    console.log(`[Gemini][${stepName || model}] API 호출 중...`);
    const genAI = new GoogleGenerativeAI(apiKey);

    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature,
        maxOutputTokens: 65536,
        topP: 0.9,
        topK: 40,
        responseMimeType: 'application/json',
      },
    });

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // 응답 완료 이유 확인 (MAX_TOKENS면 잘림)
    const finishReason = response.candidates?.[0]?.finishReason;
    console.log(`[Gemini][${stepName || model}] ✅ API 성공! (finishReason: ${finishReason})`);

    if (finishReason === 'MAX_TOKENS') {
      console.warn(`[Gemini][${stepName || model}] ⚠️ 응답이 토큰 한도로 잘림!`);
    }

    return text;
  } catch (error: any) {
    const errorCode = error?.status || error?.code;
    const errorMessage = error?.message || '';
    console.log(`[Gemini][${stepName || model}] ❌ API 실패:`, errorCode, errorMessage);

    if (errorCode === 429 || errorMessage.includes('quota')) {
      throw new Error('Gemini API 일일 한도를 초과했습니다. 내일 다시 시도해주세요.');
    }

    throw error;
  }
}

// ---------- JSON 파싱 + 배열 길이 제한 ----------

function limitArrays(obj: any): any {
  if (Array.isArray(obj)) {
    // power_keywords만 최대 5개, 나머지는 최대 3개로 수정
    return obj.map(limitArrays);
  }
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (Array.isArray(value)) {
        const maxLen = key === 'power_keywords' ? 5 : 3;
        obj[key] = value.slice(0, maxLen).map(limitArrays);
      } else if (value && typeof value === 'object') {
        obj[key] = limitArrays(value);
      }
    }
  }
  return obj;
}

// 안전한 JSON 파싱
async function parseGeminiResponse(text: string, stepName: string = ''): Promise<any> {
  // 1단계: 그대로 파싱
  try {
    const parsed = JSON.parse(text);
    return limitArrays(parsed);
  } catch (e1) {
    console.log(`[${stepName}] 직접 파싱 실패, 정제 시도...`);

    // 2단계: 코드 블록 제거 및 정제
    try {
      let cleaned = text;

      // ```json ``` 제거
      cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

      // JSON 객체만 추출 (첫 { ~ 마지막 })
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      }

      // 제어 문자 제거, 끝 콤마 제거
      cleaned = cleaned.replace(/[\u0000-\u001F]+/g, '');
      cleaned = cleaned.replace(/,\s*}/g, '}');
      cleaned = cleaned.replace(/,\s*]/g, ']');

      const parsed = JSON.parse(cleaned);
      return limitArrays(parsed);
    } catch (e2) {
      console.log(`[${stepName}] 정제 파싱도 실패`);

      if (text.length > 1000) {
        console.log('원본 응답 (처음 500자):', text.substring(0, 500));
        console.log('원본 응답 (마지막 500자):', text.substring(text.length - 500));
      } else {
        console.log('원본 응답:', text);
      }

      // 3단계: 정규식으로 JSON 부분 추출
      try {
        let lastTry = text.replace(/\r?\n/g, ' ').trim();
        const match = lastTry.match(/\{.*\}/s);
        if (match) {
          let jsonStr = match[0];
          jsonStr = jsonStr.replace(/,\s*}/g, '}');
          jsonStr = jsonStr.replace(/,\s*]/g, ']');
          const parsed = JSON.parse(jsonStr);
          return limitArrays(parsed);
        }
      } catch (e3) {
        console.log(`[${stepName}] 최후 시도도 실패`);
      }

      throw new Error(`${stepName} JSON 파싱 실패`);
    }
  }
}

// ---------- 프롬프트들 ----------

// Step 1+3 통합: 주제 특성 + 대본 분석 (토큰 절감을 위해 통합)
const getTopicAndScriptPrompt = (topVideos: any[], bottomVideos: any[]) => `당신은 YouTube 쇼츠 전문 분석가입니다.
아래 영상들의 **주제 특성**과 **대본 전략** 두 가지를 동시에 분석합니다.

⚠️ 중요 전제:
- 입력된 자막은 YouTube 자동 추출 기반으로 오타/띄어쓰기 오류가 있을 수 있습니다.
- 의미와 맥락 중심으로 분석하고, 사소한 오류는 무시하세요.
- 모든 분석 결과는 반드시 순수 한국어로 작성하세요.
- 주제는 제목 키워드가 아니라, 실제로 영상이 다루는 이야기·정보·사건 기준으로 구분하세요.
- "초반 3초 후킹 전략"은 각 영상의 "대본에서 첫 1~2문장"만 보고 분석하세요.

⚠️ 대본 분석 방법 (반드시 실제 측정):
1. 영상 구조: 각 대본을 읽고 도입/전개/반전/결말 구간을 직접 판단 → 실측 비율 계산
2. 문장 리듬: 모든 문장 길이 측정 (짧음 ≤10자, 중간 11~25자, 긺 ≥26자) → 실측 비율
3. 말투 패턴: 종결어미 실제 카운트 + 자주 나오는 표현 3-5개 추출

⚠️ 출력 제한:
- successful_topics, unsuccessful_topics: 각각 2개씩
- examples 배열: 최대 2개
- top_patterns: 2~3개
- 각 설명: 최대 2문장

# 📈 상위 ${topVideos.length}개 영상
${topVideos
    .map(
      (v: any, idx: number) => `
[상위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()}
- 대본:
${v.script}
---`,
    )
    .join('\n')}

# 📉 하위 ${bottomVideos.length}개 영상
${bottomVideos
    .map(
      (v: any, idx: number) => `
[하위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()}
- 대본:
${v.script}
---`,
    )
    .join('\n')}

# 분석 과제: "주제 특성" + "대본 전략" 동시 분석

다음 JSON만 출력하세요:
{
  "topic_characteristics": {
    "main_categories": [
      {
        "category": "카테고리명",
        "ratio": 0.0,
        "avg_views": 0,
        "description": "이 카테고리에서 어떤 종류의 이야기들을 다루는지 설명"
      }
    ],
    "successful_topics": [
      {
        "topic": "주제(내용 기준)",
        "category": "카테고리",
        "video_count": 0,
        "avg_views": 0,
        "successful_angle": "이 주제를 어떤 관점·이야기 구조로 풀 때 성과가 좋은지",
        "key_elements": ["핵심 요소1", "핵심 요소2"],
        "examples": ["대표 영상 제목1", "대표 영상 제목2"],
        "why_works": "왜 이 주제·각도가 시청자에게 잘 먹히는지 설명"
      }
    ],
    "unsuccessful_topics": [
      {
        "topic": "주제(내용 기준)",
        "category": "카테고리",
        "video_count": 0,
        "avg_views": 0,
        "problematic_angle": "이 주제를 어떤 식으로 다루면 성과가 떨어지는지",
        "examples": ["대표 영상 제목1"],
        "why_fails": "왜 이 접근이 시청자에게 약하게 느껴지는지 설명"
      }
    ],
    "angle_analysis": {
      "effective_angles": [
        {
          "angle_type": "각도 유형(예: 반전형, 국뽕형, 실험형 등)",
          "success_rate": 0.0,
          "characteristics": "이 각도에서 공통으로 보이는 특징",
          "best_for": "어떤 주제에 특히 잘 맞는 각도인지"
        }
      ],
      "ineffective_angles": [
        {
          "angle_type": "각도 유형",
          "success_rate": 0.0,
          "problem": "이 각도의 한계나 주의할 점"
        }
      ]
    }
  },
  "script_analysis": {
    "script_structure": {
      "intro_pct": 0,
      "body_pct": 0,
      "climax_pct": 0,
      "outro_pct": 0,
      "description": "이 채널 쇼츠의 전개 구조 설명",
      "sentence_rhythm": {
        "short_ratio": 0.0,
        "medium_ratio": 0.0,
        "long_ratio": 0.0,
        "pattern_type": "문장 길이 리듬감 유형"
      },
      "speech_pattern": {
        "banmal_ratio": 0.0,
        "jondae_ratio": 0.0,
        "viewpoint": "1인칭/3인칭/해설자",
        "tone_description": "말투와 톤의 특징",
        "example_expressions": {
          "banmal": ["실제 반말 종결어미 예시1", "예시2"],
          "jondae": ["실제 존댓말 종결어미 예시1", "예시2"],
          "typical_phrases": ["자주 등장하는 말버릇/관용구 예시1", "예시2", "예시3"]
        }
      }
    },
    "hook_analysis": {
      "first_3_seconds": {
        "summary": "대본 첫 1~2문장의 시작 패턴 요약",
        "top_patterns": [
          {
            "type": "후킹 유형",
            "examples": ["도입부 문장 예시1", "예시2"],
            "effectiveness": "왜 이 도입이 효과적인지"
          }
        ],
        "power_words": ["도입부 강한 단어1", "강한 단어2"]
      }
    },
    "retention_elements": {
      "conclusion_placement": {
        "top_videos_avg_position": 0.7,
        "bottom_videos_avg_position": 0.3,
        "description": "결론/반전 배치 위치 차이 설명"
      },
      "comprehensive_retention_strategy": "시청자를 끝까지 붙잡는 종합 전략 설명"
    },
    "key_differences": ["상위 vs 하위 대본 차이 1", "차이 2", "차이 3"]
  }
}`;

// Step 2: 제목 전략 & 트렌드
const getTitlePrompt = (topVideos: any[], bottomVideos: any[]) => `당신은 YouTube 제목 전략 전문가입니다.

⚠️ 출력 제한:
- common_structures는 반드시 2~3개 작성하세요.
- common_problems는 반드시 2~3개 작성하세요.
- "examples" 배열은 최대 2개까지만 작성하세요.
- "power_keywords" 배열은 최대 5개까지만 작성하세요.
- 각 설명 문장은 최대 2문장 이내로 작성하세요.

# 📈 상위 ${topVideos.length}개 영상 제목
${topVideos
    .map(
      (v: any, idx: number) => `
[상위 ${idx + 1}] ${v.title}
- 조회수: ${v.views.toLocaleString()} | 좋아요율: ${(
          (v.likes / Math.max(v.views, 1)) *
          100
        ).toFixed(2)}%
- 게시일: ${v.publishedAt} | 길이: ${v.duration}초
---`,
    )
    .join('\n')}

# 📉 하위 ${bottomVideos.length}개 영상 제목
${bottomVideos
    .map(
      (v: any, idx: number) => `
[하위 ${idx + 1}] ${v.title}
- 조회수: ${v.views.toLocaleString()} | 좋아요율: ${(
          (v.likes / Math.max(v.views, 1)) *
          100
        ).toFixed(2)}%
- 게시일: ${v.publishedAt} | 길이: ${v.duration}초
---`,
    )
    .join('\n')}

# 분석 과제: "제목 전략"과 "트렌드"만 분석

다음 JSON만 출력하세요:
{
  "title_analysis": {
    "summary": "상위 vs 하위 영상의 제목 차이를 한눈에 표현한 문장",
    "top_patterns": {
      "common_structures": [
        {
          "structure_type": "제목 구조 유형(예: 상황 제시 + 반전, 숫자 + 경고 등)",
          "frequency": 0,
          "examples": ["제목 예시1", "제목 예시2"],
          "why_works": "왜 이 구조가 쇼츠에서 잘 먹히는지 설명"
        }
      ],
      "power_keywords": [
        {
          "keyword": "키워드 또는 짧은 구절",
          "frequency": 0,
          "context": "어떤 주제나 문장 안에서 쓰일 때 효과적인지",
          "emotional_impact": "어떤 감정을 자극하는지(궁금증, 분노, 공포, 국뽕 등)"
        }
      ],
      "avg_length": 0,
      "tone": "전체적인 톤(자극적/중립적/차분함 등)"
    },
    "bottom_patterns": {
      "common_problems": [
        {
          "problem_type": "제목에서 자주 보이는 문제 유형",
          "examples": ["제목 예시1"],
          "why_fails": "왜 이 제목들이 클릭과 시청 유지에 약한지 설명"
        }
      ],
      "avg_length": 0,
      "tone": "하위 영상 제목의 전반적인 톤"
    },
    "title_formulas": [
      {
        "formula": "성공적인 제목 공식(예: '상황 제시 + 반전 단어' 형식)",
        "success_rate": 0.0,
        "examples": ["예시 제목1"],
        "best_for": "어떤 종류의 주제에 잘 맞는 공식인지"
      }
    ],
    "dos_and_donts": {
      "effective_elements": ["제목에 넣으면 좋은 요소1", "제목에 넣으면 좋은 요소2"],
      "avoid_elements": ["피해야 할 표현1", "피해야 할 표현2"]
    }
  },
  "trend_analysis": {
    "hot_periods": [
      {
        "date_range": "조회수가 특히 좋았던 기간",
        "common_keywords": ["반복적으로 등장한 키워드1"],
        "video_count": 0,
        "avg_views": 0,
        "suspected_trigger": "이 시기에 성과가 좋았던 이유 추정"
      }
    ],
    "keyword_frequency": {
      "people": [{"name": "인물 이름", "frequency": 0, "videos": ["관련 영상 제목"]}],
      "events": [{"event": "이슈/사건명", "frequency": 0, "timing": "어느 시기에 집중되었는지"}],
      "brands": [{"brand": "브랜드명", "frequency": 0, "context": "어떤 맥락에서 언급되는지"}]
    },
    "trend_riding_patterns": {
      "successful_cases": [
        {
          "original_event": "원본 이슈나 트렌드",
          "content_angle": "이 이슈를 어떻게 재해석해서 영상으로 만든 각도",
          "timing_gap": "이슈 발생 후 얼마나 빨리 업로드했는지",
          "example_video": "대표 영상 제목"
        }
      ]
    }
  }
}`;

// 최종 요약 + 채널 특성 5축 (통합 - 토큰 절감)
const getSummaryAndIdentityPrompt = (
  topVideos: any[],
  bottomVideos: any[],
  fullAnalysis: any
) => `당신은 YouTube 쇼츠 채널 분석을 요약하는 전문가입니다.

아래는 한 채널에 대한 분석 결과입니다. 이를 바탕으로 **두 가지**를 동시에 작성하세요:
1. 상위 vs 하위 영상의 핵심 차이 요약 (summary_differences)
2. 채널 특성 5축 요약 (channel_identity)

[채널 기본 정보]
- 상위 ${topVideos.length}개 영상 (평균 조회수: ${Math.round(
  topVideos.reduce((sum, v) => sum + v.views, 0) / topVideos.length
).toLocaleString()})
- 하위 ${bottomVideos.length}개 영상 (평균 조회수: ${Math.round(
  bottomVideos.reduce((sum, v) => sum + v.views, 0) / bottomVideos.length
).toLocaleString()})

[채널 상세 분석 결과]
${JSON.stringify(fullAnalysis)}

⚠️ 작성 규칙:
- summary_differences: 각 항목 80~120자로 구체적 수치/예시 포함
- channel_identity: 각 항목 30~60자, 설명체로 작성
- 초보자도 이해할 수 있는 쉬운 한국어로 작성

다음 JSON만 출력하세요:
{
  "summary_differences": {
    "topic_difference": "주제 특성: [분석 결과의 핵심을 100자 내외로 요약]",
    "title_difference": "제목 전략: [분석 결과의 핵심을 100자 내외로 요약]",
    "script_difference": "대본 전략: [분석 결과의 핵심을 100자 내외로 요약]"
  },
  "channel_identity": {
    "topic_feature": "이 채널이 주로 다루는 소재와 상황 한 줄 요약",
    "title_strategy": "상위 영상의 공통 제목 패턴 한 줄 요약",
    "structure_rhythm": "영상 전개 구조와 나레이션 리듬 한 줄 요약",
    "hook_3sec": "시작 3초 후킹 전략 한 줄 요약",
    "retention_elements": "시청자를 끝까지 붙잡는 요소 한 줄 요약"
  }
}`;

// ---------- 전체 분석 실행 함수 (3호출 최적화 버전) ----------

async function runFullAnalysis(
  topVideos: any[],
  bottomVideos: any[],
  {
    step1Model,
    step2Model,
    summaryModel,
  }: { step1Model: string; step2Model: string; summaryModel: string },
) {
  let finalAnalysis: any = {};

  // ========== Call 1: 주제 특성 + 대본 분석 통합 (스크립트 1회만 전송) ==========
  console.log('📊 Call 1/3: 주제 특성 + 대본 분석 중...');
  const topicScriptResponse = await callGemini(getTopicAndScriptPrompt(topVideos, bottomVideos), {
    model: step1Model,
    temperature: STEP1_TEMPERATURE,
    stepName: 'Call1-topic-script',
  });
  const topicScriptResult = await parseGeminiResponse(topicScriptResponse, 'Call1');
  console.log('✅ Call 1 완료 (주제+대본)');

  // topic_characteristics와 script_analysis 분리 저장
  if (topicScriptResult?.topic_characteristics) {
    finalAnalysis.topic_characteristics = topicScriptResult.topic_characteristics;
  }
  if (topicScriptResult?.script_analysis) {
    finalAnalysis.script_analysis = topicScriptResult.script_analysis;
  }

  // ========== Call 2: 제목 전략 분석 (제목만 전송 - 이미 최적화됨) ==========
  console.log('📊 Call 2/3: 제목 패턴 분석 중...');
  const titleResponse = await callGemini(getTitlePrompt(topVideos, bottomVideos), {
    model: step2Model,
    temperature: STEP2_TEMPERATURE,
    stepName: 'Call2-title',
  });
  const titleResult = await parseGeminiResponse(titleResponse, 'Call2');
  console.log('✅ Call 2 완료 (제목)');
  finalAnalysis = { ...finalAnalysis, ...titleResult };

  // ========== Call 3: 요약 + 채널 특성 5축 통합 (이전 결과만 사용) ==========
  console.log('📊 Call 3/3: 요약 + 채널 특성 분석 중...');
  const summaryIdentityResponse = await callGemini(
    getSummaryAndIdentityPrompt(topVideos, bottomVideos, finalAnalysis),
    {
      model: summaryModel,
      temperature: 0.3,
      stepName: 'Call3-summary-identity',
    }
  );
  const summaryIdentityResult = await parseGeminiResponse(summaryIdentityResponse, 'Call3');
  console.log('✅ Call 3 완료 (요약+특성)');

  // summary_differences와 channel_identity 분리 저장
  if (summaryIdentityResult?.summary_differences) {
    finalAnalysis.summary_differences = summaryIdentityResult.summary_differences;
  }
  if (summaryIdentityResult?.channel_identity) {
    finalAnalysis.channel_identity = summaryIdentityResult.channel_identity;
  }

  console.log('✅ 전체 분석 완료 (3호출 최적화)');

  return finalAnalysis;
}

// ---------- 메인 핸들러 ----------

export async function POST(request: NextRequest) {
  try {
    const { videos, mode, analysisResult } = await request.json();

    console.log('[generate-script] 시작');
    console.log('  - 모드:', mode);
    console.log('  - 영상 수:', videos.length);

    const validVideos = videos.filter(
      (v: any) => v.script && v.script !== '자막이 없습니다' && v.script !== '자막 추출 실패',
    );

    if (validVideos.length === 0) {
      return NextResponse.json(
        { error: '분석할 수 있는 대본이 없습니다.' },
        { status: 400 },
      );
    }

    // ----------------- 분석 모드 -----------------
    if (mode === 'analyze') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const matureVideos = validVideos.filter((v: any) => {
        const publishedDate = new Date(v.publishedAt);
        return publishedDate <= sevenDaysAgo;
      });

      console.log(`📊 전체 영상: ${validVideos.length}개`);
      console.log(`📊 7일 이상 경과: ${matureVideos.length}개`);
      console.log(`⏰ 제외된 최근 영상: ${validVideos.length - matureVideos.length}개`);

      if (matureVideos.length < 5) {
        return NextResponse.json(
          {
            error: `분석하기에 영상이 부족합니다. (7일 이상 경과한 영상: ${matureVideos.length}개, 최소 5개 필요)`,
            details: `${validVideos.length - matureVideos.length}개의 최근 영상은 게시 후 시간이 부족하여 제외되었습니다.`,
          },
          { status: 400 },
        );
      }

      // 성과 점수 계산
      const videosWithScore = matureVideos.map((v: any) => {
        const views = v.views || 0;
        const likes = v.likes || 0;
        const comments = v.comments || 0;

        const likeRate = views > 0 ? likes / views : 0;
        const commentRate = views > 0 ? comments / views : 0;

        const score =
          (views / 10000) * 0.5 +
          (likeRate * 100) * 0.3 +
          (commentRate * 100) * 0.2;

        return { ...v, performanceScore: score };
      });

      const sorted = videosWithScore.sort(
        (a, b) => b.performanceScore - a.performanceScore,
      );

      const topCount = Math.ceil(sorted.length * 0.3);
      const bottomCount = Math.ceil(sorted.length * 0.3);

      const topVideos = sorted.slice(0, topCount);
      const bottomVideos = sorted.slice(-bottomCount);

      // 기본 통계
      const avgViews =
        matureVideos.reduce((sum, v) => sum + v.views, 0) / matureVideos.length;
      const avgLikes =
        matureVideos.reduce((sum, v) => sum + v.likes, 0) / matureVideos.length;
      const avgDuration =
        matureVideos.reduce((sum, v) => sum + v.duration, 0) / matureVideos.length;

      console.log(
        `📊 상위 ${topVideos.length}개 vs 하위 ${bottomVideos.length}개 영상 비교`,
      );

      // 1차: 모델 전략(2.5 + 2.0 혼합)으로 분석
      let finalAnalysis: any;
      let usedFallback = false;

      try {
        finalAnalysis = await runFullAnalysis(topVideos, bottomVideos, {
          step1Model: MODEL_STEP1_PRIMARY,
          step2Model: MODEL_STEP2_PRIMARY,
          summaryModel: MODEL_STEP2_PRIMARY,
        });
      } catch (err) {
        console.error(
          '⚠️ 1차 분석 실패, 전체를 gemini-2.0-flash-exp로 재시도:',
          err,
        );
        usedFallback = true;
        // 전체를 2.0 flash-exp로 다시 시도
        finalAnalysis = await runFullAnalysis(topVideos, bottomVideos, {
          step1Model: MODEL_FALLBACK,
          step2Model: MODEL_FALLBACK,
          summaryModel: MODEL_FALLBACK,
        });
      }

      console.log('✅ 채널 컨텐츠 분석 완료!');

      return NextResponse.json({
        success: true,
        result: JSON.stringify(finalAnalysis),
        analyzedCount: matureVideos.length,
        totalCount: validVideos.length,
        excludedCount: validVideos.length - matureVideos.length,
        topCount: topVideos.length,
        bottomCount: bottomVideos.length,
        usedFallback,
        metadata: {
          avgViews: Math.round(avgViews),
          avgLikes: Math.round(avgLikes),
          avgDuration: Math.round(avgDuration),
          filterInfo: `게시 7일 이상 경과한 ${matureVideos.length}개 영상 중 상위 ${topCount}개, 하위 ${bottomCount}개 분석`,
        },
      });
    }

    // ----------------- 가이드라인 생성 모드 -----------------
    if (mode === 'guideline') {
      const prompt = `당신은 YouTube 쇼츠 콘텐츠 제작 전문가입니다.

# 📊 1단계 분석 결과
${analysisResult}

# 🎯 당신의 임무
위 분석 결과를 바탕으로, 이 채널과 비슷한 스타일의 쇼츠를 만들고 싶은 사람이
바로 따라 쓸 수 있는 "콘텐츠 제작 가이드"를 작성하세요.

# ⚠️ 매우 중요한 원칙
- 이 가이드는 특정 채널을 그대로 복사하는 것이 아니라,
  이 채널에서 검증된 "패턴, 구조, 감정선"을 다른 주제에도 응용할 수 있도록 돕는 안내서입니다.
- 분석 결과 속 예시 제목·문장·사건명은 그대로 쓰지 말고,
  구조/리듬/감정선만 가져와서 자신의 주제에 맞게 변형해야 합니다.
- 특히 "3초 후킹 전략"과 "완주율(끝까지 보게 만드는 요소)"을 가장 우선순위로 자세히 정리하세요.
- 예시는 "좋은 성과를 낸 참고 예시"임을 명시하고, 반드시 "패턴만 참고해서 변형하라"는 설명을 함께 넣으세요.

## 📝 출력 형식 (마크다운)

당신은 이 채널의 YouTube 쇼츠 콘텐츠 제작 전문가입니다.

## 📌 채널 핵심 정체성
- 분석 결과의 channel_identity 5축(주제 특성, 제목 전략, 영상 구조 & 문장 리듬, 초반 3초 후킹, 끝까지 보게 만드는 요소)을 참고하여 이 채널의 핵심 특성을 간결하게 요약하세요.
- 이 채널 스타일이 어떤 유형의 주제/소재와 특히 잘 맞는지, 5축 요약을 기반으로 설명하세요.

### 1. 3초 후킹 가이드 (최우선 섹션)
- 이 채널에서 성과가 좋았던 도입부(첫 3초) 패턴 2~3가지를 정리하세요.
- 실제 도입 예시 문장 2~3개를 제시하되,
  "이 문장은 그대로 쓰지 말고, 사건/대상/숫자만 자신의 주제로 바꿔서 같은 구조로 활용해야 한다"는 안내 문장을 꼭 포함하세요.
- "이 채널처럼 만들고 싶다면, 첫 문장을 이런 구조로 쓰고 이런 감정을 먼저 던져라"처럼
  구조와 감정선 중심으로 설명하세요.

### 2. 완주율(끝까지 보게 만드는 요소) 가이드
- 상위 영상에서 결론·반전·핵심 메시지를 보통 영상 몇 % 지점(예: 70~80%)에 배치하는지 정리하세요.
- 중간(40~60%) 구간에서 이탈을 막기 위해 사용하는 장치(질문, 숫자, 추가 증거, 반전 힌트 등)를 정리하세요.
- 상위 vs 하위 영상의 차이를 바탕으로
  "이 채널처럼 만들 때 반드시 지켜야 할 완주 규칙" 3~5개로 요약하세요.
- 이 규칙을 다른 주제에도 그대로 적용할 수 있도록,
  "구조"와 "타이밍" 위주로 일반화해서 설명하세요.

### 3. 주제 선정 가이드
- 성과가 좋았던 주제/각도 유형 2~3개를 정리하고, 왜 잘 먹혔는지 설명하세요.
  (제목이 아니라 실제 내용·이야기 구조 기준으로 나누세요.)
- 성과가 나빴던 주제/각도 유형과 그 이유를 정리하세요.
- "반드시 같은 사건을 다루라는 뜻이 아니라,
  예를 들어 '억울함 실화', '경고형 사건', '반전 결말'처럼
  이 채널에서 잘 먹힌 감정·구조를 자신의 분야에 옮겨서 쓰라"는 식으로 적용법을 적어주세요.

### 4. 제목 작성 가이드
- 상위 영상에서 자주 보였던 제목 구조 1~2개를 패턴으로 정리하세요.
  (예: 상황 제시 + 반전 단어, 숫자 + 위협/경고 등)
- 파워 키워드 3~5개를 뽑고, 각 키워드가 어떤 맥락에서 효과적인지 간단히 설명하세요.
- 하위 영상 제목에서 자주 보였던 실패 원인(길이, 모호함, 감정 부족 등)을 정리하고
  "이런 식의 제목은 피하라"는 형태로 정리하세요.
- 예시 제목을 쓸 경우,
  "구조만 참고하고, 키워드·대상·숫자는 자신의 영상에 맞게 교체하라"는 문장을 반드시 포함하세요.

### 5. 대본 구조 & 말투 가이드
- 도입/전개/클라이맥스/마무리 비율을 한눈에 정리하고,
  이 채널의 대표적인 진행 흐름을 설명하세요.
- 문장 길이 리듬(단문 위주/혼합형 등)과 말투(반말/존댓말/해설자 톤 등)를 정리하세요.
- 3초 후킹 이후, 중간부와 엔딩에서 어떤 식으로 긴장감을 유지·회수하는지 설명하세요.
- 위 구조를 기반으로,
  "이 채널 스타일을 따라 할 수 있는 예시 아웃라인" 1개를 작성하세요.
  (특정 사건명이 아니라, 일반적인 예시 주제로 작성하세요.)

### 6. 실전 체크리스트
- 이 채널 스타일로 영상을 만들 때 제작 전에 체크해야 할 항목 5~7개를 만드세요.
- 각 항목은 "예/아니오"로 체크할 수 있는 문장 형태로 작성하세요.
  (예: "첫 문장에 강한 결과/감정이 들어가 있는가?", "결론/반전은 전체의 70% 이후에 배치했는가?" 등)
- 가능하다면 이 채널 분석 결과를 바탕으로,
  조회수 대비 좋아요율, 완주율 등 간단한 목표 지표를 함께 제시하세요.

**중요 정리**
- 분석 결과에서 나온 수치·패턴·예시는 반드시 반영하되,
  "복붙"이 아니라 "패턴·구조·감정선" 위주로 일반화해서 설명하세요.
- 초보자도 이 가이드를 그대로 따라 하면
  이 채널과 비슷한 느낌의 쇼츠를 만들 수 있도록,
  단계별로 구체적이고 실무적인 언어로 작성하세요.`;

      console.log('✅ 콘텐츠 제작 가이드 생성 시작...');
      const guidelineResponse = await callGemini(prompt, {
        model: MODEL_STEP1_PRIMARY,
        temperature: STEP1_TEMPERATURE,
        stepName: 'Guideline',
      });
      console.log('✅ 콘텐츠 제작 가이드 생성 완료!');

      return NextResponse.json({
        success: true,
        result: guidelineResponse,
        analyzedCount: validVideos.length,
      });
    }


    return NextResponse.json(
      { error: '알 수 없는 모드입니다.' },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('❌ API 오류:', error);

    if (error?.message?.includes('한도')) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    if (error?.message?.includes('API 키')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: `처리 실패: ${error.message}` },
      { status: 500 },
    );
  }
}