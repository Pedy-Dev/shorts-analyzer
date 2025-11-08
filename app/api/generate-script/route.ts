// app/api/generate-script/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { videos, mode, analysisResult, geminiApiKey } = await request.json();

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 필요합니다. API 키 설정 버튼을 눌러 키를 입력해주세요.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const validVideos = videos.filter(
      (v: any) => v.script && v.script !== '자막이 없습니다' && v.script !== '자막 추출 실패'
    );

    if (validVideos.length === 0) {
      return NextResponse.json(
        { error: '분석할 수 있는 대본이 없습니다.' },
        { status: 400 }
      );
    }

    if (mode === 'analyze') {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

      const matureVideos = validVideos.filter((v: any) => {
        const publishedDate = new Date(v.publishedAt);
        return publishedDate <= threeDaysAgo;
      });

      console.log(`📊 전체 영상: ${validVideos.length}개`);
      console.log(`📊 3일 이상 경과: ${matureVideos.length}개`);
      console.log(`⏰ 제외된 최근 영상: ${validVideos.length - matureVideos.length}개`);

      if (matureVideos.length < 5) {
        return NextResponse.json({
          error: `분석하기에 영상이 부족합니다. (3일 이상 경과한 영상: ${matureVideos.length}개, 최소 10개 필요)`,
          details: `${validVideos.length - matureVideos.length}개의 최근 영상은 게시 후 시간이 부족하여 제외되었습니다.`
        }, { status: 400 });
      }

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

      const sorted = videosWithScore.sort((a, b) => b.performanceScore - a.performanceScore);
      const topCount = Math.ceil(sorted.length * 0.3);
      const topVideos = sorted.slice(0, topCount);
      const bottomVideos = sorted.slice(-topCount);

      const avgViews = matureVideos.reduce((sum, v) => sum + v.views, 0) / matureVideos.length;
      const avgLikes = matureVideos.reduce((sum, v) => sum + v.likes, 0) / matureVideos.length;
      const avgDuration = matureVideos.reduce((sum, v) => sum + v.duration, 0) / matureVideos.length;

      console.log(`📊 상위 ${topVideos.length}개 vs 하위 ${bottomVideos.length}개 영상 비교`);

      const prompt = `당신은 YouTube 쇼츠 컨텐츠 전문 분석가입니다.

⚠️ 중요 전제:
- 입력된 자막은 YouTube 자동 추출 기반으로 오타/띄어쓰기 오류가 있을 수 있습니다
- 의미와 맥락 중심으로 분석하고, 사소한 오류는 무시하세요
- 이 채널의 전체 성과와 관계없이 **객관적으로** 분석하세요
- 분석 대상 영상은 모두 게시 후 3일 이상 경과하여 초기 성과가 안정화된 영상입니다
- **모든 분석 결과는 반드시 순수 한국어로 작성** (영어 전문용어 사용 금지)

# 📊 채널 기본 정보
- 분석 영상 수: ${matureVideos.length}개 (게시 3일 이상 경과)
- 평균 조회수: ${Math.round(avgViews).toLocaleString()}
- 평균 좋아요: ${Math.round(avgLikes).toLocaleString()}
- 평균 길이: ${Math.round(avgDuration)}초

# 🎯 분석 목적
이 분석은 **4가지 차원**으로 진행됩니다:

## 1차원: 채널 현재 상태 파악
"이 채널이 현재 사용하는 대본 구조와 패턴"

## 2차원: 주제 및 접근 각도 분석
"어떤 주제를 다루고, 어떤 각도로 접근하는가"

## 3차원: 채널 내 성과 차이 분석
"같은 채널 내에서 더 잘된 영상 vs 덜 잘된 영상의 차이"

## 4차원: 시의성 및 트렌드 분석 ✨
"언제, 어떤 이슈를 활용했을 때 성과가 좋았는가"

---

# 📚 전체 영상 대본 (채널 패턴 파악용)
${matureVideos.slice(0, 10).map((v: any, idx: number) => `
[전체 ${idx + 1}] ${v.title}
- 조회수: ${v.views.toLocaleString()} | 좋아요: ${v.likes.toLocaleString()} | 길이: ${v.duration}초
- 게시일: ${v.publishedAt}
- 대본 샘플: ${v.script.substring(0, 300)}...
`).join('\n')}
${matureVideos.length > 10 ? `\n... 외 ${matureVideos.length - 10}개 영상` : ''}

---

# 📈 채널 내 상위 ${topCount}개 영상
(이 채널 기준으로 상대적으로 잘된 영상)
${topVideos.map((v: any, idx: number) => `
[상위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()} (${((v.likes/v.views)*100).toFixed(2)}%) | 댓글 ${v.comments.toLocaleString()}
- 게시일: ${v.publishedAt}
- 길이: ${v.duration}초 | 채널 내 성과 점수: ${v.performanceScore.toFixed(2)}
- 대본:
${v.script}
---
`).join('\n')}

# 📉 채널 내 하위 ${topCount}개 영상
(이 채널 기준으로 상대적으로 덜 잘된 영상)
${bottomVideos.map((v: any, idx: number) => `
[하위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()} (${((v.likes/v.views)*100).toFixed(2)}%) | 댓글 ${v.comments.toLocaleString()}
- 게시일: ${v.publishedAt}
- 길이: ${v.duration}초 | 채널 내 성과 점수: ${v.performanceScore.toFixed(2)}
- 대본:
${v.script}
---
`).join('\n')}

---

# 📝 분석 과제

## Part 1: 채널 현재 상태 (공통 패턴)
모든 영상에서 공통적으로 나타나는 특징:
1. **전형적인 구조**: 도입-전개-반전-결말 비율과 흐름
2. **문장 리듬 패턴**: 짧은/중간/긴 문장의 분포
   - 짧은 문장(1-5어절), 중간(6-12어절), 긴(13어절+) 비율 분석
   - 가장 높은 비율 2개를 구체적으로 명시 (예: "짧은 문장(1-5어절), 중간(6-12어절) 혼합형")
3. **종결어미 패턴**: 반말/존댓말/구어체 중 가장 많이 사용하는 유형
   - banmal_ratio, jondae_ratio, mixed_ratio 중 가장 높은 것으로 판단
   - 반말형(70% 이상 반말) / 존댓말형(70% 이상 존댓말) / 구어체(혼용)
4. **콘텐츠 유형**: 정보형/스토리형/리액션형 중 해당하는 것을 모두 명시
   - 2개 이상이면 "정보형, 스토리형 혼합" 같은 식으로 구체적으로

## Part 2: 주제 및 접근 각도 분석
영상의 제목과 대본을 종합적으로 분석하여:
1. **주제 카테고리 분류**: 사회이슈/일상/정보/엔터/기타 등으로 분류
2. **세부 주제 파악**: 구체적으로 무엇을 다루는지
3. **접근 각도 분석**: 같은 주제도 어떤 관점으로 접근했는지
   - 개인 스토리 중심 vs 전체 현황 설명
   - 감정 호소 vs 정보 전달
   - 충격/자극 강조 vs 차분한 설명
   - 시간순 서사 vs 핵심 먼저 제시
4. **시의성 분석**: 트렌드/이슈 관련성
5. **감정 유발 정도**: 분노/공감/놀라움/호기심 등

## Part 2.5: 제목 전략 분석 ✨
상위 영상과 하위 영상의 제목을 비교 분석:
1. **제목 구조 패턴**: 
   - 상위/하위 영상의 제목이 어떤 구조로 시작하는가 (질문형/결과제시형/숫자형/감탄형)
   - 평균 글자 수 차이
2. **감정 유발 키워드**:
   - 상위 영상에 자주 등장하는 단어들 (예: "신의 한수", "이해가 안되는", "놀라는")
   - 하위 영상에 등장하는 단어들과의 차이
3. **제목 톤 분석**:
   - 자극적 vs 차분한 표현
   - 구체성 (애매한 표현 vs 명확한 표현)
4. **시의성 키워드 활용**:
   - 인물명/사건명이 제목에 포함된 비율
   - 트렌드 키워드 배치 위치 (앞/중간/뒤)


## Part 3: 성과별 차이 (무엇이 성과를 갈랐나)
상위 영상과 하위 영상을 비교:
1. **주제 선택의 차이**: 어떤 카테고리/주제가 더 성과가 좋았나
2. **접근 각도의 차이**: 같은 주제도 어떤 각도가 더 효과적이었나
3. **첫 문장 차이**: 형태(질문/숫자/감탄/설명), 길이, 강도
4. **감정 자극 강도**: 자극적 vs 평범한 내용
5. **시의성**: 최신 이슈 vs 일반적 주제

## Part 4: 시의성 및 트렌드 분석 ✨
영상들의 게시일과 내용을 분석하여:
1. **시간적 군집 패턴**
   - 비슷한 시기(±3일)에 올라온 영상들의 공통 키워드 추출
   - 특정 시기에 집중된 주제가 있는지 파악
   
2. **핵심 키워드의 반복 빈도**
   - 여러 영상에서 반복되는 인물명/사건명/브랜드명
   - 예: "젠슨황"이 여러 영상에 등장 → 당시 화제 인물
   - 같은 사건을 다른 각도로 다룬 경우
   
3. **이슈 편승 지표**
   - 제목과 대본에 시사 키워드 포함 여부
   - 인물명 + 사건명 조합 (예: 젠슨황 + APEC + 치킨)
   - 실제 사건과 콘텐츠 업로드 시간차
   
4. **성공 영상의 타이밍 패턴**
   - 상위 영상들이 특정 날짜/기간에 몰려있는가?
   - 공통된 시사 키워드를 담고 있는가?
   - 같은 이슈를 다른 각도로 재해석했는가?
   - 이슈 발생 후 얼마나 빨리 대응했는가?

5. **트렌드 편승 성공/실패 사례**
   - 어떤 이슈는 성공적으로 활용했고
   - 어떤 이슈는 타이밍을 놓쳤는지

---

# 출력 형식 (반드시 이 JSON만)

{
  "channel_dna": {
    "summary": "이 채널의 핵심 특징 1-2문장",
    "structure": {
      "intro_pct": 0,
      "body_pct": 0,
      "climax_pct": 0,
      "outro_pct": 0,
      "description": "전형적 구조 흐름 설명"
    },
    "sentence_rhythm": {
      "short_ratio": 0.00,
      "medium_ratio": 0.00,
      "long_ratio": 0.00,
      "pattern_type": "롤러코스터형|안정형|단조형",
      "description": "문장 길이 변화 패턴 설명",
      "dominant_lengths": "비율이 20% 이상인 유형들을 모두 명시. 예: '짧은 문장(1-5어절), 중간(6-12어절) 혼합형' 또는 '짧은 문장(1-5어절) 위주'"
    },
    "speech_pattern": {
      "banmal_ratio": 0.00,
      "jondae_ratio": 0.00,
      "mixed_ratio": 0.00,
      "dominant_style": "가장 높은 비율에 따라 '반말형'(70%+) 또는 '존댓말형'(70%+) 또는 '구어체'(혼용). 반드시 이 3개 중 하나로만 표기",
      "dominant_endings": ["~하는데", "~한다고", "~이야"],
      "viewpoint": "관찰자|참여자|해설자",
      "tone_description": "전반적인 말투 특징을 순수 한국어로 설명"
    },
    "content_type": "정보형/스토리형/리액션형 중 해당하는 것을 모두 명시. 2개 이상이면 '정보형, 스토리형 혼합' 같은 식으로 구체적으로. '혼합'이라고만 쓰지 말 것",
    "signature": "채널 고유 특징을 구분자(|)로 연결. 예: 특징1|특징2|특징3"
  },
  
  "topic_characteristics": {
    "main_categories": [
      {
        "category": "카테고리명 (예: 사회이슈/일상/정보 등)",
        "ratio": 0.0,
        "avg_views": 0,
        "description": "이 카테고리의 특징"
      }
    ],

    },
  
  "title_analysis": {
    "summary": "상위와 하위 제목의 가장 큰 차이 1-2문장",
    "top_patterns": {
      "common_structures": [
        {
          "structure_type": "구조 유형 (예: 질문형/결과제시형/숫자형/감탄형)",
          "frequency": 0,
          "examples": ["제목1", "제목2"],
          "why_works": "왜 효과적인지"
        }
      ],
      "power_keywords": [
        {
          "keyword": "키워드",
          "frequency": 0,
          "context": "어떤 맥락에서 사용되는지",
          "emotional_impact": "유발하는 감정"
        }
      ],
      "avg_length": 0,
      "tone": "자극적|중립적|차분함"
    },
    "bottom_patterns": {
      "common_problems": [
        {
          "problem_type": "문제 유형",
          "examples": ["제목1", "제목2"],
          "why_fails": "왜 효과가 없는지"
        }
      ],
      "avg_length": 0,
      "tone": "자극적|중립적|차분함"
    },
    "title_formulas": [
      {
        "formula": "제목 공식 (예: [충격요소] + [주체] + [결과])",
        "success_rate": 0.0,
        "examples": ["적용 예시1", "적용 예시2"],
        "best_for": "어떤 주제에 효과적인지"
      }
    ],
    "dos_and_donts": {
      "effective_elements": ["요소1", "요소2"],
      "avoid_elements": ["피해야할 요소1", "피해야할 요소2"]
    }
  },
  
  "trend_analysis": {
  
    "successful_topics": [
      {
        "topic": "구체적 주제",
        "category": "속한 카테고리",
        "video_count": 0,
        "avg_performance_score": 0.0,
        "successful_angle": "효과적이었던 접근 각도",
        "key_elements": ["요소1", "요소2"],
        "examples": ["영상 제목1", "영상 제목2"],
        "why_works": "성공 이유 분석"
      }
    ],
    "unsuccessful_topics": [
      {
        "topic": "구체적 주제",
        "category": "속한 카테고리",
        "video_count": 0,
        "avg_performance_score": 0.0,
        "problematic_angle": "문제가 된 접근 각도",
        "examples": ["영상 제목1"],
        "why_fails": "실패 이유 분석"
      }
    ],
    "angle_analysis": {
      "effective_angles": [
        {
          "angle_type": "각도 유형 (예: 개인스토리형/충격폭로형/정보나열형)",
          "success_rate": 0.0,
          "characteristics": "이 각도의 특징",
          "best_for": "어떤 주제에 효과적인지"
        }
      ],
      "ineffective_angles": [
        {
          "angle_type": "각도 유형",
          "success_rate": 0.0,
          "problem": "왜 효과가 떨어지는지"
        }
      ]
    },
    "topic_pattern": "전체적인 주제 선정 패턴 요약"
  },
  
  "trend_analysis": {
    "hot_periods": [
      {
        "date_range": "YYYY-MM-DD ~ YYYY-MM-DD",
        "common_keywords": ["키워드1", "키워드2"],
        "video_count": 0,
        "avg_performance_score": 0.0,
        "suspected_trigger": "추정되는 트렌드 발생 원인 (예: APEC 정상회의, 특정 사건 등)"
      }
    ],
    "keyword_frequency": {
      "people": [
        {
          "name": "인물명",
          "frequency": 0,
          "videos": ["영상 제목1", "영상 제목2"],
          "context": "어떤 맥락에서 언급되었는지"
        }
      ],
      "events": [
        {
          "event": "사건명",
          "frequency": 0,
          "videos": ["영상 제목1"],
          "timing": "사건 발생 시기와 영상 업로드 시기 관계"
        }
      ],
      "brands": [
        {
          "brand": "브랜드/제품명",
          "frequency": 0,
          "context": "언급 맥락"
        }
      ]
    },
    "trend_riding_patterns": {
      "successful_cases": [
        {
          "original_event": "원본 이슈/사건",
          "content_angle": "재해석한 각도",
          "timing_gap": "이슈 발생 후 며칠 만에 업로드",
          "performance_boost": "일반 대비 성과 향상 정도",
          "example_video": "영상 제목"
        }
      ],
      "missed_opportunities": [
        {
          "trend": "놓친 트렌드",
          "reason": "왜 활용하지 못했는지 추정",
          "potential_angle": "어떻게 활용했으면 좋았을지"
        }
      ]
    },
    "timing_strategy": {
      "optimal_timing": "이슈 발생 후 최적 업로드 시점",
      "response_speed": "평균 반응 속도",
      "trend_sensitivity": "트렌드 민감도 (높음/중간/낮음)"
    }
  },
  
  "performance_gap": {
    "summary": "상위와 하위의 가장 큰 차이 1-2문장",
    "topic_impact": {
      "summary": "주제 선택이 성과에 미친 영향",
      "key_difference": "상위 vs 하위 주제 차이의 핵심"
    },
    "timing_impact": {
      "summary": "시의성이 성과에 미친 영향",
      "key_pattern": "성공 영상들의 타이밍 패턴"
    },
    "top_strengths": [
      {
        "feature": "특징 이름",
        "description": "상위 영상의 X%는 ~한 특징",
        "impact": "좋아요율/댓글률에 미치는 영향 추정",
        "examples": ["제목1", "제목2"]
      }
    ],
    "bottom_weaknesses": [
      {
        "feature": "특징 이름",
        "description": "하위 영상의 X%는 ~한 경향",
        "examples": ["제목1", "제목2"]
      }
    ],
    "key_differences": [
      "차이점 1: 구체적으로",
      "차이점 2: 수치 포함",
      "차이점 3: 예시 포함"
    ]
  }
}

**중요 원칙**:
**중요 원칙**:
- 추상적 분석 금지. 모든 내용은 구체적 관찰 기반
- 백분율이나 비율은 실제 데이터에서 관찰된 것만
- **문장 길이 표기**: 20% 이상인 유형만 명시. "짧은 문장(1-5어절), 긴(13어절+) 혼합형" 같은 식으로 구체적으로
- **말투 표기**: "반말형", "존댓말형", "구어체" 중 하나만 선택 (가장 높은 비율 기준)
- **콘텐츠 유형**: "혼합"이라고만 쓰지 말고 "정보형, 스토리형 혼합" 처럼 구체적으로
- **모든 설명은 순수 한국어로** (영어 전문용어 금지. 예: colloquial ❌ → 구어체 ✅)
- "~해야 한다" 같은 처방 금지. "~했다/~하는 경향" 형태로
- 규칙을 만들지 말고, 데이터가 보여주는 패턴만 보고
- signature는 반드시 | 기호로 구분하여 파싱 가능하게 작성
- 주제와 각도는 제목과 대본을 종합하여 판단
- 시의성은 게시일과 내용의 키워드를 연결하여 분석
- 인물명, 사건명, 브랜드명이 반복되면 당시 트렌드로 판단`;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const generatedContent = result.response.text();

      console.log(`✅ 채널 컨텐츠 분석 완료!`);

      return NextResponse.json({
        success: true,
        result: generatedContent,
        analyzedCount: matureVideos.length,
        totalCount: validVideos.length,
        excludedCount: validVideos.length - matureVideos.length,
        topCount: topVideos.length,
        bottomCount: bottomVideos.length,
        metadata: {
          avgViews: Math.round(avgViews),
          avgLikes: Math.round(avgLikes),
          avgDuration: Math.round(avgDuration),
          filterInfo: `게시 3일 이상 경과한 ${matureVideos.length}개 영상 분석`
        }
      });
    }

    if (mode === 'guideline') {
      const prompt = `당신은 YouTube 쇼츠 콘텐츠 제작 전문가입니다.

# 📊 1단계 분석 결과
${analysisResult}

위 분석에서 도출된 내용:
- **채널 DNA**: 현재 이 채널이 사용하는 전형적인 패턴
- **주제 특성**: 어떤 주제와 각도가 성과를 내는지
- **제목 전략**: 효과적인 제목 구조와 키워드 패턴
- **트렌드 분석**: 시의성 있는 콘텐츠의 성과 패턴
- **성과 차이**: 같은 채널 내에서 잘된 영상 vs 덜 잘된 영상의 차이

# 🎯 당신의 임무
위 분석 결과를 바탕으로, **실전에서 바로 쓸 수 있는 콘텐츠 제작 가이드**를 만들어주세요.
특히 주제 선정부터 대본 작성까지 전 과정을 다뤄주세요.

**중요 요구사항:**
- 가이드는 반드시 "당신은 이 채널의 YouTube 쇼츠 콘텐츠 제작 전문가입니다."로 시작해야 합니다
- AI에게 직접 지시하는 형태로 작성하세요
- 채널의 핵심 정체성을 간단히 요약하세요

---

## 📝 출력 형식 (마크다운)

**반드시 다음과 같이 시작하세요:**

당신은 이 채널의 YouTube 쇼츠 콘텐츠 제작 전문가입니다.

## 📌 채널 핵심 정체성
(channel_dna.summary를 바탕으로 1-2문장으로 요약)
---

**그 다음 아래 섹션들을 순서대로 작성하세요:**

### 📌 1. 주제 선정 가이드

#### 💯 이 채널에서 성과가 좋은 주제
(topic_characteristics.successful_topics 기반으로 작성)

**[카테고리 1] - 평균 조회수 X만**
- 주요 주제: (구체적 예시)
- 효과적인 접근 각도:
  * [각도 1]: (설명)
  * [각도 2]: (설명)
- 성공 요소:
- 예시 영상: "제목1", "제목2"

**[카테고리 2] - 평균 조회수 X만**
...

#### ❌ 피해야 할 주제
(topic_characteristics.unsuccessful_topics 기반으로 작성)

- **[주제 유형]**: (왜 피해야 하는지)
- **[주제 유형]**: (문제점)

#### 🎯 시의성 활용 전략
(trend_analysis 기반으로 작성)

**이 채널의 트렌드 편승 패턴:**
- 최적 타이밍: 이슈 발생 후 [X시간/일] 이내
- 성공적 재해석: [원본 이슈] → [콘텐츠 각도]
- 반복 등장 키워드: [인물명], [사건명] 등

**핫이슈 활용 공식:**
1. 실시간 이슈 파악 (뉴스, SNS 트렌드)
2. [X시간] 이내 콘텐츠 기획
3. 직접 전달 ❌ → [특정 각도]로 재해석 ✅
4. 핵심 키워드는 유지하되 스토리는 변형

**예시:**
- 원본 이슈: "APEC 젠슨황 방한"
- 재해석: "젠슨황이 치킨 먹는 모습으로 본 진짜 부자의 기준"
- 성과: 일반 대비 [X%] 향상

#### 🤖 주제 선정 프로세스

**AI에게 주제 추천 요청 시 사용할 프롬프트:**
"최근 24-48시간 내 화제된 [인물/사건/제품]을 확인하고,
그것을 [이 채널의 효과적 각도]로 재해석할 수 있는 
콘텐츠 아이디어 5개를 추천해줘.
특히 [감정 유발 요소]를 포함시켜줘."

**주제 평가 체크리스트:**
- [ ] 시의성: 최근 [X일] 이내 이슈인가?
- [ ] 감정 유발: [주요 감정] 중 하나 이상 유발하는가?
- [ ] 접근 각도: [효과적 각도]로 풀 수 있는가?
- [ ] 키워드: 화제성 있는 인물/사건명이 포함되는가?
- [ ] 타이밍: 이슈 발생 후 [최적 시간] 이내인가?

### 📝 2. 제목 작성 가이드

#### 🎯 효과적인 제목 구조
(title_analysis.top_patterns.common_structures 기반으로 작성)

**검증된 제목 공식:**
각 공식별로:
- 공식: [구조 설명]
- 예시: (실제 상위 영상 제목)
- 효과: (왜 효과적인지)
- 적용 가능 주제: (어떤 주제에 맞는지)
- 사용 빈도: X회

**예시 형식:**
[공식 1] [충격 요소] + [주체] + [결과/이유]
- 예시: "파산 직전이었던 엔비디아를 살린 나라"
- 효과: 반전과 국가적 자부심을 동시에 자극
- 적용 가능 주제: 국제/기업 스토리
- 사용 빈도: 8회

#### 🔥 파워 키워드
(title_analysis.top_patterns.power_keywords 기반)

**상위 영상에 자주 등장하는 단어:**
각 키워드별로:
- 키워드: [단어]
- 빈도: X회
- 사용 맥락: [어떤 상황에서]
- 감정 효과: [어떤 감정 유발]

#### 📏 최적 제목 길이
- 상위 영상 평균: {title_analysis.top_patterns.avg_length}자
- 하위 영상 평균: {title_analysis.bottom_patterns.avg_length}자
- 권장 범위: [최적 범위]자
- 제목 톤: {title_analysis.top_patterns.tone}

#### ❌ 피해야 할 제목 패턴
(title_analysis.bottom_patterns.common_problems 기반)

각 문제 유형별로:
- 문제 유형: [유형명]
- 나쁜 예시: (실제 하위 영상 제목)
- 왜 실패: [구체적 이유]
- 개선 방법: [어떻게 바꿔야 하는지]

#### ✅ 제목 작성 체크리스트
(title_analysis.dos_and_donts 기반)

**반드시 포함할 요소:**
{effective_elements를 체크박스 형태로}
- [ ] [요소1]
- [ ] [요소2]

**절대 사용하지 말 것:**
{avoid_elements를 체크박스 형태로}
- [ ] [요소1]
- [ ] [요소2]

#### 🎯 제목 공식 활용법
(title_analysis.title_formulas 기반)

각 공식별로:
- 공식: [구조]
- 성공률: X%
- 효과적인 주제: [주제 유형]
- 적용 예시: (구체적 예시 2-3개)


### 🎬 2. 영상 구성 비율
(channel_dna.structure 기반으로 작성)

- **도입부**: X% (약 X초)
  - 목적: (분석 결과 기반)
  - 핵심 전략: 
  - 시의성 있는 키워드 배치
- **본문**: X% (약 X초)
  - 목적:
  - 핵심 전략:
- **클라이맥스**: X% (약 X초)
  - 목적:
  - 핵심 전략:
- **결말**: X% (약 X초)
  - 목적:
  - 핵심 전략:

### ✍️ 3. 문장 작성 규칙
(channel_dna.style 기반으로 작성)

- **문장 길이**: (짧음/보통/김)
- **어조**: (설명형/대화형/감정형)
- **필수 표현**: 
- **피해야 할 표현**:
- **트렌드 키워드 활용법**:
  * 제목: 핵심 인물/사건명 포함
  * 첫 3초: 화제성 키워드 즉시 언급
  * 본문: 자연스럽게 2-3회 반복

### 🔥 4. 성과를 높이는 핵심 요소
(performance_gap.top_strengths 기반으로 작성)
1. **[특징명]**
   - 왜 효과적인가: 
   - 적용 방법:
   - 예시:

### ⚠️ 5. 피해야 할 실수
(performance_gap.bottom_weaknesses 기반으로 작성)
1. **[약점명]**
   - 문제점:
   - 개선 방법:

### 🚀 6. 실시간 트렌드 대응 전략
(trend_analysis.timing_strategy 기반으로 작성)

**골든 타임:**
- 긴급 이슈: [X시간] 이내
- 일반 화제: [X일] 이내
- 지속 이슈: [X일] 동안 여러 각도로

**트렌드 모니터링 체크리스트:**
- [ ] 네이버 실시간 검색어
- [ ] YouTube 급상승 동영상
- [ ] 주요 뉴스 헤드라인
- [ ] SNS 트렌딩 해시태그

**빠른 제작 팁:**
1. 템플릿 구조 미리 준비
2. 트렌드 키워드만 교체
3. [효과적 각도] 유지
4. 검증된 후킹 패턴 재사용

### 📋 7. 최종 체크리스트
대본 작성 후 반드시 확인:

**주제 관련:**
- [ ] 시의성 있는 주제인가?
- [ ] 트렌드 키워드가 포함되었는가?
- [ ] 감정을 자극하는 각도인가?
- [ ] 구체적 사례/스토리가 있는가?

**타이밍 관련:**
- [ ] 이슈 발생 후 [최적 시간] 이내인가?
- [ ] 경쟁 채널보다 빠른가?
- [ ] 아직 화제성이 유지되는가?

**구조 관련:**
- [ ] 도입부가 X% 이내인가?
- [ ] 첫 3초에 후킹 요소가 있는가?
- [ ] 클라이맥스가 명확한가?

**문체 관련:**
- [ ] 채널 특유의 어조를 유지하는가?
- [ ] 문장이 적절한 길이인가?

### 💡 8. 실전 활용 팁

**"오늘의 주제 추천해줘"라고 요청받았을 때:**
1. 최근 24시간 핫이슈 확인
2. [이 채널의 성공 카테고리]와 연결
3. [효과적 각도]로 재구성
4. 트렌드 키워드 포함한 제목 제시
5. 구체적인 대본 아웃라인 제공

**예시 답변 템플릿:**
"오늘의 추천 주제: [최신 이슈]를 [각도]로 재해석
- 제목: [트렌드 키워드] + [감정 유발 요소]
- 도입: [숫자/충격 요소]로 시작
- 전개: [개인 스토리/구체 사례] 중심
- 마무리: [질문/여운] 남기기"

---

**중요**: 
- 이 가이드는 분석된 ${analysisResult ? JSON.parse(analysisResult)._meta?.analyzedCount || '데이터' : '데이터'}개 영상을 기반으로 작성되었습니다
- 모든 제안은 이 채널의 실제 성과 데이터에 기반합니다
- 특히 시의성과 트렌드 활용은 이 채널의 핵심 성공 요인입니다
- AI에게 이 가이드를 제공하면 채널 맞춤형 콘텐츠를 생성할 수 있습니다`;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const generatedContent = result.response.text();

      console.log(`✅ 콘텐츠 제작 가이드 생성 완료!`);

      return NextResponse.json({
        success: true,
        result: generatedContent,
        analyzedCount: validVideos.length,
      });
    }

    return NextResponse.json(
      { error: '알 수 없는 모드입니다.' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ Gemini API 오류:', error);
    return NextResponse.json(
      { error: `처리 실패: ${error.message}` },
      { status: 500 }
    );
  }
}