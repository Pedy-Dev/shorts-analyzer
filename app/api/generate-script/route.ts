// app/api/generate-script/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const STEP1_TEMPERATURE = 0.3;  // 주제+대본 통합 분석
const STEP2_TEMPERATURE = 0.4;  // 제목 전략

// 모델 전략 (3호출 최적화)
const MODEL_STEP1_PRIMARY = 'gemini-2.5-flash';    // Call 1: 주제+대본 (가장 무거움)
const MODEL_STEP2_PRIMARY = 'gemini-2.0-flash-exp'; // Call 2: 제목 (가벼움)


// ---------- Gemini 호출 공통 함수 ----------

async function callGemini(
  prompt: string,
  {
    model = MODEL_STEP1_PRIMARY,
    temperature = STEP1_TEMPERATURE,
    stepName = '',
    mimeType = 'application/json',
  }: { model?: string; temperature?: number; stepName?: string; mimeType?: string } = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API 키가 서버에 설정되지 않았습니다.');
  }

  try {
    console.log(`[Gemini][${stepName || model}] API 호출 중... (mimeType: ${mimeType})`);
    const genAI = new GoogleGenerativeAI(apiKey);

    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature,
        maxOutputTokens: 999999,
        topP: 0.9,
        topK: 40,
        responseMimeType: mimeType,
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
    // 배열 길이 제한 완화 (가이드용)
    return obj.map(limitArrays);
  }
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (Array.isArray(value)) {
        // 예시 배열들은 5개, power_words는 10개, 나머지는 제한 없음
        let maxLen = 999; // 기본 제한 없음
        if (key === 'power_words' || key === 'power_keywords') {
          maxLen = 10;
        } else if (key.includes('examples') || key.includes('actual_examples') || key.includes('typical_expressions')) {
          maxLen = 5;
        }
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
- **채널 특성**: 제목과 영상 첫 멘트(후킹멘트)가 동일한 경우가 있습니다. 자주 쓰인다면 가이드에 규칙으로 반영해주세요
- ⚠️ "Oh", "Yeah", "Ah", "Wow", "Uh" 같은 영어 감탄사는 자막 오류이므로 파워 워드, 자주 쓰는 표현, 종결어미 예시 등 모든 분석 결과에서 반드시 제외하세요.

⚠️ 대본 분석 방법 (반드시 실제 측정):
1. 영상 구조: 각 대본을 읽고 도입/전개/반전/결말 구간을 직접 판단 → 실측 비율 계산
2. 문장 리듬: 모든 문장 길이 측정 (짧음 ≤10자, 중간 11~25자, 긺 ≥26자) → 실측 비율
3. 말투 패턴: 종결어미 실제 카운트 + 자주 나오는 표현 추출 (⚠️ 최소 3회 이상 등장한 표현만 포함)

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
          "typical_phrases": ["3회 이상 등장한 말버릇/관용구 예시1", "예시2", "예시3"]
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
        "power_words": ["3회 이상 등장한 도입부 강한 단어1", "강한 단어2"]
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

⚠️ 중요 전제:
- "Oh", "Yeah", "Ah", "Wow", "Uh" 같은 영어 감탄사는 자막 오류이므로 파워 키워드, 자주 쓰는 표현 등 모든 분석 결과에서 반드시 제외하세요.

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

// 새로운 가이드 생성 프롬프트 (상위 영상 전용 - 대본 생성 직접 활용)
const getContentGuideFromTopVideosPrompt = (topVideos: any[]) => `⚠️⚠️⚠️ 절대 JSON 형식으로 출력하지 마세요! 반드시 순수 마크다운 텍스트로만 출력하세요! ⚠️⚠️⚠️

당신은 YouTube 쇼츠 전문가입니다.

⚠️ 당신의 임무:
아래 **상위 성과 영상들만** 분석해서, 이 채널과 똑같은 스타일로 대본을 쓸 수 있는
"재현 가능한 제작 가이드"를 만드세요.

⚠️ 핵심 원칙:
- 하위 영상은 입력에 없습니다. 오직 "성공한 영상의 공통점"만 추출하세요.
- **인간이 읽고 이해하기 쉽도록** 각 항목을 자세하고 친절하게 설명하세요.
- **LLM이 대본 생성 시 바로 활용할 수 있도록** 구체적인 공식과 예시를 제공하세요.
- 실제 대본에서 추출한 문장/표현을 풍부하게 포함하세요 (최소 5개 이상).
- "왜 이렇게 하는 것이 효과적인지" 설명을 반드시 포함하세요.

# 📊 채널 통계 (상위 성과 영상 기준)
- 분석 영상 수: ${topVideos.length}개
- 평균 영상 길이: ${Math.round(topVideos.reduce((sum: number, v: any) => sum + (v.duration || 0), 0) / topVideos.length)}초
- 평균 조회수: ${Math.round(topVideos.reduce((sum: number, v: any) => sum + v.views, 0) / topVideos.length).toLocaleString()}
- 평균 좋아요: ${Math.round(topVideos.reduce((sum: number, v: any) => sum + v.likes, 0) / topVideos.length).toLocaleString()}
- 평균 댓글: ${Math.round(topVideos.reduce((sum: number, v: any) => sum + (v.comments || 0), 0) / topVideos.length).toLocaleString()}

# 📈 상위 ${topVideos.length}개 영상 (성과 검증됨)
${topVideos.map((v: any, idx: number) => `
[상위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()} | 댓글 ${(v.comments || 0).toLocaleString()}
- 영상 길이: ${v.duration}초
- 대본:
${v.script}
---`).join('\n')}

# 📋 출력 형식 (마크다운)

⚠️ 반드시 마크다운 형식으로만 출력하세요. JSON 형식을 사용하지 마세요.

아래 마크다운 구조를 정확히 따라 작성하세요:
- 한국인이 이해하기 쉽게 작성하고, 영어 원문(underdog, Reddit, CTA 등)은 사용하지 마세요.
- 위의 채널 통계(평균 영상 길이, 평균 대본 글자수 등)를 참고하여 실제 데이터를 기반으로 작성하세요.
- 각 영상의 실제 길이와 대본을 분석하여 구조를 파악하세요.
- 대본 구조는 4단계로 분석하세요: 도입(Hook) → 전개(Development) → 반전(Twist/Climax) → 결말(Conclusion)
- 각 파트의 시간대는 퍼센테이지(%)와 초 단위를 함께 표기하세요.
- 각 파트의 대본 분량은 글자수로 표기하세요.
- "Oh", "Yeah", "Wow" 같은 영어 감탄사는 자막 오류이므로 자주 쓰는 표현, 파워 워드, 종결어미 예시 등에서 반드시 제외하세요.

---

당신은 유튜브 쇼츠 컨텐츠 제작 전문가입니다.

# 채널 스타일 요약
이 채널의 쇼츠 스타일을 2~3문장으로 정의하세요. 어떤 소재를 다루는지, 어떻게 전개하는지, 어떤 감정선을 주로 사용하는지 명확히 설명하세요.

---

# 후킹 전략 (첫 3초)

## 개요
첫 3초 후킹 전략의 핵심을 2~3문장으로 요약하세요. 왜 중요한지, 이 채널에서는 어떻게 활용하는지 설명하세요.

## 후킹 공식
후킹 공식을 구조화해서 표현하세요 (예: [충격적 결과] + [대상] + [의문 유발])

## 적용 방법
내 주제에 이 공식을 적용하는 방법을 단계별로 설명하세요 (3~4단계). 각 단계마다 구체적인 예시를 포함하세요.

## 실제 첫 문장 예시 (상위 영상에서 추출)
- 예시 1
- 예시 2
- 예시 3
- 예시 4
- 예시 5

## 필수 포함 요소
- 요소 1 (왜 필요한지 간단히)
- 요소 2
- 요소 3

## 파워 워드 (여러 영상에서 반복 사용되는 강한 단어)
상위 영상들에서 **반복적으로** 나타나며 시청자의 감정을 강하게 자극하는 짧은 단어나 표현을 추출하세요.
- **⚠️ 필수: 최소 3회 이상 등장한 단어만 포함하세요**
- 1~2회만 나온 단어는 절대 포함하지 마세요
- 각 단어 옆에 반드시 (N회) 형태로 등장 횟수를 표기하세요
- 영어 감탄사(Oh, Yeah, Ah 등)는 자막 오류이므로 제외하세요
- 종결어미나 긴 문장은 제외하세요
- 짧고 임팩트 있는 단어 위주로 추출하세요
(예: 충격적인, 미친, 역대급, 진짜, 절대, 최악의, 반전 등)

- 단어1 (N회)
- 단어2 (N회)
- 단어3 (N회)
- 단어4 (N회)
- 단어5 (N회)

## 후킹 패턴 유형

### 패턴 1: (유형 이름)
- 구조: 구조 설명
- 예시: 실제 예시
- 적합한 주제: 어떤 주제에 적합한지

### 패턴 2: (유형 이름)
- 구조: 구조 설명
- 예시: 실제 예시
- 적합한 주제: 어떤 주제에 적합한지

## 왜 효과적인가
이 후킹 방식이 왜 효과적인지 심리학적/구조적으로 설명하세요. 시청자의 뇌가 어떻게 반응하는지, 왜 끝까지 보고 싶어지는지 구체적으로 작성하세요.

---

# 대본 구조

## 전체 요약
- 평균 영상 길이: 위 채널 통계 참고하여 초 단위로 작성
- 평균 대본 글자수: 실제 대본들을 분석하여 평균 글자수 작성
- 구조 요약: 4단계 구조 (도입 → 전개 → 반전 → 결말)

## 도입 (Hook)
- 비율: 전체의 몇 %인지 작성 (예: 0~5%)
- 시간: 실제 초 단위 (예: 0~3초)
- 글자수: 평균 글자수 범위
- 역할: 도입부의 핵심 역할 설명
- 자주 쓰는 기법: 기법 1, 기법 2, 기법 3
- 실제 예시: 상위 영상의 실제 도입부 예시

- **채널 특성**: 제목과 영상 첫 멘트(후킹멘트)가 동일한 경우가 있습니다. 자주 쓰인다면 가이드에 규칙으로 반영해주세요

## 전개 (Development)
- 비율: 전체의 몇 %인지 작성 (예: 5~60%)
- 시간: 실제 초 단위 범위
- 글자수: 평균 글자수 범위
- 역할: 전개부의 핵심 역할 설명
- 자주 쓰는 기법: 기법 1, 기법 2, 기법 3
- 전개 흐름: 이야기 전개 방식
- 실제 예시: 상위 영상의 실제 전개부 요약

## 반전 (Twist/Climax)
- 비율: 전체의 몇 %인지 작성 (예: 60~85%)
- 시간: 실제 초 단위 범위
- 글자수: 평균 글자수 범위
- 역할: 반전/클라이맥스의 핵심 역할 설명
- 자주 쓰는 기법: 기법 1, 기법 2, 기법 3
- 실제 예시: 상위 영상의 실제 반전 부분

## 결말 (Conclusion)
- 비율: 전체의 몇 %인지 작성 (예: 85~100%)
- 시간: 실제 초 단위 범위
- 글자수: 평균 글자수 범위
- 역할: 결말의 핵심 역할 설명
- 자주 쓰는 기법: 기법 1, 기법 2
- 실제 예시: 상위 영상의 실제 결말 부분

## 속도감과 리듬
전체 흐름에서 속도감과 리듬 특징을 상세히 설명하세요. 어느 부분에서 빠르게 전개되고, 어느 부분에서 잠시 멈추는지 작성하세요.

---

# 말투 스타일

## 시점
어떤 시점에서 이야기하는지 (1인칭/3인칭/전지적 해설자 등)

## 톤앤매너
말투와 톤을 상세히 설명하세요. 예를 들어 담담한 해설체인지, 긴박한 실황체인지, 친근한 대화체인지 등을 구체적으로 작성하세요.

## 톤 일관성
영상 내내 톤을 일관되게 유지하는지, 아니면 상황에 따라 변화하는지 설명하세요. 변화한다면 어떤 상황에서 어떻게 변하는지 작성하세요.

## 종결어미 스타일
- 주요 유형: 주로 쓰는 종결어미 유형과 비율 (예: 반말 70%, 존댓말 30%)
- 실제 예시: 예시1, 예시2, 예시3, 예시4, 예시5
- 사용 상황: 각 종결어미를 어떤 상황에서 사용하는지 설명 (예: 사실 전달 시에는 '-다', 의문 제기 시에는 '-는가')

## 자주 쓰는 표현
상위 영상들에서 **반복적으로** 등장하는 특징적인 표현이나 관용구를 추출하세요.
- **⚠️ 필수: 최소 3회 이상 등장한 표현만 포함하세요**
- 1~2회만 나온 표현은 절대 포함하지 마세요
- 각 표현 옆에 반드시 (N회) 형태로 등장 횟수를 표기하세요
- 영어 감탄사(Oh, Yeah 등)는 제외하세요
(예: 알고 보니, 갑자기, 결국, 하지만, 그러던 어느 날 등)

- 표현 1 (N회)
- 표현 2 (N회)
- 표현 3 (N회)
- 표현 4 (N회)
- 표현 5 (N회)

## 문장 리듬
- 패턴: 짧은 문장 위주 / 긴 문장 위주 / 혼합형
- 평균 길이: 평균 문장 길이 (예: 평균 7-10 어절)
- 리듬 설명: 어떤 타이밍에 짧은 문장을 쓰고, 언제 긴 문장을 쓰는지
- 연속 문장 예시: 실제 대본에서 추출한 연속된 3~5문장

## 나레이션 성격
이 채널 나레이션의 성격이나 캐릭터 (예: 객관적 관찰자, 열정적 전달자, 냉소적 비평가, 유머러스한 친구 등)

---

# 시청 유지 기법

## 전략 개요
시청자를 끝까지 붙잡는 전략을 종합적으로 설명하세요. 전체적인 접근 방식과 핵심 원칙을 작성하세요.

## 오프닝 후킹 전략
첫 3초에서 시청자를 사로잡는 구체적인 방법. 어떤 요소로 즉시 관심을 끄는지 작성하세요.

## 중간 이탈 방지 기법
- 기법 1 (왜 효과적인지 포함)
- 기법 2
- 기법 3
- 기법 4
- 기법 5

## 결론 배치
- 위치: 결론이나 가장 큰 반전이 보통 전체 영상의 몇 % 지점에 나오는지 (예: 70~85%)
- 왜 이 타이밍인가: 시청자 심리와 시청 패턴 관점에서 분석
- 실제 예시: 상위 영상에서 결론이 나온 타이밍

## 긴장감 유지 문장 (실제 대본에서 추출)
시청자를 계속 붙잡는 특징적인 문장이나 표현을 추출하세요.
- **⚠️ 최소 2회 이상 유사한 패턴으로 등장한 문장만 포함하세요**
- 한 번만 나온 문장은 제외하세요
(예: "하지만 여기서 반전이", "그런데 알고 보니", "문제는 여기서부터였다" 등)

- 문장 1
- 문장 2
- 문장 3
- 문장 4
- 문장 5

## 정보 공개 속도
정보를 얼마나 빠르게 또는 천천히 공개하는지 설명하세요. 핵심 정보를 언제 드러내고, 어떤 정보는 나중으로 미루는지 구체적으로 작성하세요.

## 루프 기법
루프 기법을 사용한다면 그 방법을 설명하세요. 시청자가 끝까지 보지 않으면 궁금증이 해소되지 않게 만드는 구체적인 장치. 사용하지 않는다면 '사용하지 않음'이라고 작성하세요.

---

# 제목 공식

## 기본 공식
가장 자주 쓰는 제목 공식 (예: [상황] + [반전 키워드])

## 패턴 변형

### 패턴 1: (유형 이름)
- 예시: 실제 제목 예시
- 적합한 상황: 어떤 내용이나 주제에 적합한지

### 패턴 2: (유형 이름)
- 예시: 실제 제목 예시
- 적합한 상황: 어떤 내용이나 주제에 적합한지

## 상위 영상 제목 예시
- 제목 1
- 제목 2
- 제목 3
- 제목 4
- 제목 5

## 글자 수
평균 글자 수 범위 (예: 18~25자)

## 필수 포함 요소
- 요소 1 (왜 필요한지)
- 요소 2 (왜 필요한지)
- 요소 3 (왜 필요한지)

## 피해야 할 요소
- 요소 1 (왜 안 되는지)
- 요소 2 (왜 안 되는지)

## 자극하는 감정
제목이 주로 자극하는 감정 (예: 궁금증, 분노, 공포, 놀라움, 기대감 등)

## 제목 만드는 방법
이 공식을 사용해 제목을 만드는 단계별 가이드. 1단계부터 4~5단계까지 구체적으로 설명하세요.

---

# 주제 선정

## 성공한 주제 유형

### 유형 1: (예: 사회 비판형, 반전 스토리형 등)
- 왜 효과적인가: 시청자의 어떤 감정이나 욕구를 건드리는지
- 대표 영상: 제목 1, 제목 2
- 비슷한 주제 찾는 법: 어떤 키워드로 검색하고, 어디를 참고하면 되는지

### 유형 2: (예: 인간 승리형, 부조리 고발형 등)
- 왜 효과적인가: 시청자의 어떤 감정이나 욕구를 건드리는지
- 대표 영상: 제목 1, 제목 2
- 비슷한 주제 찾는 법: 어떤 키워드로 검색하고, 어디를 참고하면 되는지

## 주제 선정 기준
주제를 선정할 때 반드시 체크해야 할 기준. 각 기준마다 간단한 설명을 추가하세요.

## 리서치 팁
좋은 주제를 찾기 위한 리서치 방법. 어떤 사이트를 방문하고, 어떤 키워드로 검색하며, 어떤 지표를 봐야 하는지 작성하세요.

---

# 샘플 아웃라인

## 주제
예시 주제 (상위 영상 중 하나를 기반으로)

## 목표 길이
채널 통계의 평균 영상 길이 기준 (초 단위)

## 도입 (Hook)
- 비율: 위 대본 구조에서 분석한 도입 비율 사용 (예: 0~5%)
- 시간: 실제 초 단위
- 글자수: 예상 글자수
- 내용: 실제 예시를 기반으로 후킹 문장
- 왜 효과적인가: 어떤 심리 효과를 노리는지

## 전개 (Development)
- 비율: 위 대본 구조에서 분석한 전개 비율 사용
- 시간: 실제 초 단위
- 글자수: 예상 글자수
- 내용: 전개 내용을 단계별로 요약
- 핵심 포인트: 포인트 1, 포인트 2, 포인트 3

## 반전 (Twist/Climax)
- 비율: 위 대본 구조에서 분석한 반전 비율 사용
- 시간: 실제 초 단위
- 글자수: 예상 글자수
- 내용: 반전이나 핵심 포인트
- 임팩트: 시청자에게 어떤 감정을 느끼게 하는지

## 결말 (Conclusion)
- 비율: 위 대본 구조에서 분석한 결말 비율 사용
- 시간: 실제 초 단위
- 글자수: 예상 글자수
- 내용: 마무리 방식
- 행동 유도: 시청자에게 바라는 행동 (없으면 '없음')

## 대본 미리보기
위 아웃라인을 실제 이 채널의 대본 스타일로 작성한 예시 (최소 첫 10초 분량). 실제로 영상에 사용할 수 있을 정도로 구체적으로 작성하세요.

---

⚠️ 중요:
- 위 마크다운 형식을 정확히 따라 작성하세요.
- 각 섹션을 빠짐없이 작성하세요.
- 리스트 항목은 최소 5개 이상 작성하세요.
- 실제 대본에서 추출한 예시를 풍부하게 포함하세요.
- 각 영상의 실제 길이, 대본 글자수, 조회수, 좋아요, 댓글 수를 모두 분석하여 데이터 기반으로 작성하세요.
- 추측하지 말고, 실제 데이터에서 패턴을 찾아 작성하세요.
- 시간대는 퍼센테이지(%)와 초 단위를 모두 표기하세요.
- 대본 분량은 초 단위와 글자수를 모두 표기하세요.

⚠️⚠️⚠️ 절대로 JSON 형식({}, [], "key": "value")을 사용하지 마세요! ⚠️⚠️⚠️
반드시 # 제목, ## 소제목, - 리스트 형태의 순수 마크다운 텍스트로만 출력하세요!`;

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
    const { videos, mode } = await request.json();

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

      // 2.5 모델로 최대 3번 재시도
      let finalAnalysis: any;
      let attemptCount = 0;
      const MAX_ATTEMPTS = 3;

      while (attemptCount < MAX_ATTEMPTS) {
        attemptCount++;
        try {
          console.log(`🔄 분석 시도 ${attemptCount}/${MAX_ATTEMPTS} (gemini-2.5-flash)`);
          finalAnalysis = await runFullAnalysis(topVideos, bottomVideos, {
            step1Model: MODEL_STEP1_PRIMARY,
            step2Model: MODEL_STEP2_PRIMARY,
            summaryModel: MODEL_STEP2_PRIMARY,
          });
          console.log(`✅ ${attemptCount}차 시도 성공!`);
          break; // 성공하면 루프 종료
        } catch (err: any) {
          console.error(`⚠️ ${attemptCount}차 시도 실패:`, err?.message || err);

          if (attemptCount >= MAX_ATTEMPTS) {
            // 3번 모두 실패하면 에러 throw
            throw new Error(`분석 ${MAX_ATTEMPTS}회 시도 모두 실패: ${err?.message || '알 수 없는 오류'}`);
          }

          // 재시도 전 잠시 대기 (1초)
          console.log(`⏳ ${attemptCount + 1}차 재시도 준비 중...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
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
        attemptCount,
        metadata: {
          avgViews: Math.round(avgViews),
          avgLikes: Math.round(avgLikes),
          avgDuration: Math.round(avgDuration),
          filterInfo: `게시 7일 이상 경과한 ${matureVideos.length}개 영상 중 상위 ${topCount}개, 하위 ${bottomCount}개 분석`,
        },
      });
    }

    // ----------------- 가이드라인 생성 모드 (상위 영상 전용) -----------------
    if (mode === 'guideline') {
      // 1. 상위 영상 추출 (analyze 모드와 동일한 로직)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const matureVideos = validVideos.filter((v: any) => {
        const publishedDate = new Date(v.publishedAt);
        return publishedDate <= sevenDaysAgo;
      });

      console.log(`📊 전체 영상: ${validVideos.length}개`);
      console.log(`📊 7일 이상 경과: ${matureVideos.length}개`);

      if (matureVideos.length < 5) {
        return NextResponse.json(
          {
            error: `가이드 생성에 영상이 부족합니다. (7일 이상 경과한 영상: ${matureVideos.length}개, 최소 5개 필요)`,
            details: `${validVideos.length - matureVideos.length}개의 최근 영상은 게시 후 시간이 부족하여 제외되었습니다.`,
          },
          { status: 400 },
        );
      }

      // 2. 성과 점수 계산
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
        (a: any, b: any) => b.performanceScore - a.performanceScore,
      );

      // 3. 상위 30%만 추출
      const topCount = Math.ceil(sorted.length * 0.3);
      const topVideos = sorted.slice(0, topCount);

      console.log(`✅ 상위 ${topVideos.length}개 영상 추출 완료 (평균 조회수: ${Math.round(
        topVideos.reduce((sum: any, v: any) => sum + v.views, 0) / topVideos.length
      ).toLocaleString()})`);

      // 4. 새 프롬프트로 가이드 생성 (마크다운 출력)
      console.log('📊 콘텐츠 제작 가이드 생성 시작 (상위 영상 기반)...');
      const guidelineMarkdown = await callGemini(
        getContentGuideFromTopVideosPrompt(topVideos),
        {
          model: MODEL_STEP1_PRIMARY,
          temperature: STEP1_TEMPERATURE,
          stepName: 'Guideline-TopVideos',
          mimeType: 'text/plain',  // 마크다운 출력을 위해 JSON 대신 텍스트로 설정
        }
      );

      console.log('✅ 콘텐츠 제작 가이드 생성 완료!');

      return NextResponse.json({
        success: true,
        result: guidelineMarkdown,
        analyzedCount: topVideos.length,
        totalCount: validVideos.length,
        excludedCount: validVideos.length - matureVideos.length,
        metadata: {
          avgViews: Math.round(
            topVideos.reduce((sum: any, v: any) => sum + v.views, 0) / topVideos.length
          ),
          avgLikes: Math.round(
            topVideos.reduce((sum: any, v: any) => sum + v.likes, 0) / topVideos.length
          ),
          filterInfo: `게시 7일 이상 경과한 ${matureVideos.length}개 영상 중 상위 ${topCount}개 분석`,
        },
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