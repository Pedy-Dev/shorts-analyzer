// app/api/generate-script/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 🔥 Fallback 헬퍼 함수 (최적화 버전)
async function callGeminiWithFallback(
  prompt: string,
  serverKey: string | undefined,
  userKey: string | undefined,
  model: string = 'gemini-2.5-flash'  // 모델 변경
) {
  const tryApiCall = async (apiKey: string, keyType: 'server' | 'user') => {
    try {
      console.log(`[Gemini] ${keyType} API로 시도 중...`);
      const genAI = new GoogleGenerativeAI(apiKey);

      // 🔥 최적화된 설정
      const geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: {
          temperature: 0.3,        // 일관된 분석을 위해 낮춤
          maxOutputTokens: 16384,  // 출력 토큰 제한
          topP: 0.9,              // 안정성 강화
          topK: 40,               // 예측 가능성 증가
        }
      });

      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text();
      console.log(`[Gemini] ✅ ${keyType} API 성공!`);
      return { success: true, text, usedKey: keyType };
    } catch (error: any) {
      const errorCode = error?.status || error?.code;
      const errorMessage = error?.message || '';
      console.log(`[Gemini] ❌ ${keyType} API 실패:`, errorCode, errorMessage);

      const isQuotaError =
        errorCode === 429 ||
        errorCode === 403 ||
        errorMessage.includes('quota') ||
        errorMessage.includes('exhausted') ||
        errorMessage.includes('RESOURCE_EXHAUSTED');

      return { success: false, error, isQuotaError };
    }
  };

  // 1차: 서버 키 시도
  if (serverKey) {
    const result = await tryApiCall(serverKey, 'server');
    if (result.success) return result;

    if (!result.isQuotaError) {
      throw result.error;
    }
    console.log('[Gemini] ⚠️ 서버 API 한도 초과, 유저 API로 전환...');
  }

  // 2차: 유저 키 시도
  if (userKey) {
    const result = await tryApiCall(userKey, 'user');
    if (result.success) return result;

    if (result.isQuotaError) {
      throw new Error('모든 API 키가 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    throw result.error;
  }

  throw new Error('사용 가능한 Gemini API 키가 없습니다. API 키를 설정해주세요.');
}

export async function POST(request: NextRequest) {
  try {
    const { videos, mode, analysisResult, geminiApiKey: userGeminiKey } = await request.json();

    // 🔥 Fallback 시스템: 서버 키 → 유저 키
    const serverGeminiKey = process.env.GEMINI_API_KEY;

    console.log('[generate-script] API 키 상태:');
    console.log('  - 서버 키:', serverGeminiKey ? '✅ 있음' : '❌ 없음');
    console.log('  - 유저 키:', userGeminiKey ? '✅ 있음' : '❌ 없음');

    if (!serverGeminiKey && !userGeminiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 필요합니다. API 키 설정 버튼을 눌러 키를 입력해주세요.' },
        { status: 400 }
      );
    }

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
          error: `분석하기에 영상이 부족합니다. (3일 이상 경과한 영상: ${matureVideos.length}개, 최소 5개 필요)`,
          details: `${validVideos.length - matureVideos.length}개의 최근 영상은 게시 후 시간이 부족하여 제외되었습니다.`
        }, { status: 400 });
      }

      // 🔥 성과 점수 계산 및 상위/하위 분류
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

      // 🔥 항상 30%로 계산
      const topCount = Math.ceil(sorted.length * 0.3);
      const bottomCount = Math.ceil(sorted.length * 0.3);

      const topVideos = sorted.slice(0, topCount);
      const bottomVideos = sorted.slice(-bottomCount);

      // 기본 통계
      const avgViews = matureVideos.reduce((sum, v) => sum + v.views, 0) / matureVideos.length;
      const avgLikes = matureVideos.reduce((sum, v) => sum + v.likes, 0) / matureVideos.length;
      const avgDuration = matureVideos.reduce((sum, v) => sum + v.duration, 0) / matureVideos.length;

      console.log(`📊 상위 ${topVideos.length}개 vs 하위 ${bottomVideos.length}개 영상 비교`);

      // 🔥 최적화된 프롬프트 (전체 샘플 제거, 상위/하위만 전송)
      const prompt = `당신은 YouTube 쇼츠 컨텐츠 전문 분석가입니다.

⚠️ 중요 전제:
- 입력된 자막은 YouTube 자동 추출 기반으로 오타/띄어쓰기 오류가 있을 수 있습니다
- 의미와 맥락 중심으로 분석하고, 사소한 오류는 무시하세요
- 분석 대상 영상은 모두 게시 후 3일 이상 경과하여 초기 성과가 안정화된 영상입니다
- **모든 분석 결과는 반드시 순수 한국어로 작성**

# 📊 채널 분석 정보
- 전체 영상 수: ${matureVideos.length}개 (게시 3일 이상 경과)
- 분석 대상: 상위 ${topCount}개, 하위 ${bottomCount}개
- 평균 조회수: ${Math.round(avgViews).toLocaleString()}
- 평균 좋아요: ${Math.round(avgLikes).toLocaleString()}
- 평균 길이: ${Math.round(avgDuration)}초

# 🎯 분석 목적
상위 30%와 하위 30% 영상의 차이를 4가지 차원으로 분석:
1. 채널 DNA: 공통 패턴 파악
2. 주제 특성: 성공/실패 요인
3. 제목 전략: 효과적 구조
4. 시의성: 트렌드 활용

---

# 📈 채널 내 상위 ${topCount}개 영상
${topVideos.map((v: any, idx: number) => `
[상위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()} (${((v.likes / v.views) * 100).toFixed(2)}%) | 댓글 ${v.comments.toLocaleString()}
- 게시일: ${v.publishedAt} | 길이: ${v.duration}초
- 성과 점수: ${v.performanceScore.toFixed(2)}
- 대본:
${v.script}
---`).join('\n')}

# 📉 채널 내 하위 ${bottomCount}개 영상
${bottomVideos.map((v: any, idx: number) => `
[하위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()} (${((v.likes / v.views) * 100).toFixed(2)}%) | 댓글 ${v.comments.toLocaleString()}
- 게시일: ${v.publishedAt} | 길이: ${v.duration}초
- 성과 점수: ${v.performanceScore.toFixed(2)}
- 대본:
${v.script}
---`).join('\n')}

---

# 📝 분석 과제

## Part 1: 채널 현재 상태 (상위/하위 공통 패턴)
1. **전형적인 구조**: 도입-전개-반전-결말 비율
2. **문장 리듬**: 짧은/중간/긴 문장 분포
3. **종결어미**: 반말/존댓말/구어체 비율
4. **콘텐츠 유형**: 정보형/스토리형/리액션형

## Part 2: 주제 및 접근 각도
1. **주제 분류**: 어떤 주제가 성과가 좋은지
2. **접근 각도**: 같은 주제도 어떤 각도가 효과적인지
3. **감정 유발**: 어떤 감정이 성과와 연결되는지

## Part 3: 제목 전략
1. **제목 구조**: 상위 영상 제목 패턴
2. **키워드**: 자주 등장하는 파워 키워드
3. **길이와 톤**: 최적 길이와 어조

## Part 4: 시의성 및 트렌드
1. **타이밍 패턴**: 성공 영상의 업로드 시기
2. **트렌드 키워드**: 반복되는 인물/사건/브랜드
3. **편승 전략**: 이슈 활용 성공/실패 사례

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
      "description": "구조 흐름 설명"
    },
    "sentence_rhythm": {
      "short_ratio": 0.00,
      "medium_ratio": 0.00,
      "long_ratio": 0.00,
      "pattern_type": "롤러코스터형|안정형|단조형",
      "dominant_lengths": "주요 문장 길이"
    },
    "speech_pattern": {
      "banmal_ratio": 0.00,
      "jondae_ratio": 0.00,
      "mixed_ratio": 0.00,
      "dominant_style": "반말형|존댓말형|구어체",
      "dominant_endings": ["종결어미1", "종결어미2"],
      "viewpoint": "관찰자|참여자|해설자",
      "tone_description": "말투 특징"
    },
    "content_type": "콘텐츠 유형",
    "signature": "특징1|특징2|특징3"
  },
  
  "topic_characteristics": {
    "main_categories": [
      {
        "category": "카테고리명",
        "ratio": 0.0,
        "avg_views": 0,
        "description": "특징"
      }
    ],
    "successful_topics": [
      {
        "topic": "주제",
        "category": "카테고리",
        "video_count": 0,
        "avg_performance_score": 0.0,
        "successful_angle": "접근 각도",
        "key_elements": ["요소1", "요소2"],
        "examples": ["제목1", "제목2"],
        "why_works": "성공 이유"
      }
    ],
    "unsuccessful_topics": [
      {
        "topic": "주제",
        "category": "카테고리",
        "video_count": 0,
        "avg_performance_score": 0.0,
        "problematic_angle": "문제 접근",
        "examples": ["제목1"],
        "why_fails": "실패 이유"
      }
    ],
    "angle_analysis": {
      "effective_angles": [
        {
          "angle_type": "각도 유형",
          "success_rate": 0.0,
          "characteristics": "특징",
          "best_for": "적합한 주제"
        }
      ],
      "ineffective_angles": [
        {
          "angle_type": "각도 유형",
          "success_rate": 0.0,
          "problem": "문제점"
        }
      ]
    }
  },
  
  "title_analysis": {
    "summary": "제목 차이 핵심",
    "top_patterns": {
      "common_structures": [
        {
          "structure_type": "구조 유형",
          "frequency": 0,
          "examples": ["제목1"],
          "why_works": "이유"
        }
      ],
      "power_keywords": [
        {
          "keyword": "키워드",
          "frequency": 0,
          "context": "맥락",
          "emotional_impact": "감정"
        }
      ],
      "avg_length": 0,
      "tone": "자극적|중립적|차분함"
    },
    "bottom_patterns": {
      "common_problems": [
        {
          "problem_type": "문제",
          "examples": ["제목1"],
          "why_fails": "이유"
        }
      ],
      "avg_length": 0,
      "tone": "톤"
    },
    "title_formulas": [
      {
        "formula": "공식",
        "success_rate": 0.0,
        "examples": ["예시1"],
        "best_for": "적합 주제"
      }
    ],        
    "dos_and_donts": {
        "effective_elements": ["효과적인 요소1", "효과적인 요소2"],
        "avoid_elements": ["피해야 할 요소1", "피해야 할 요소2"]
  }
  },
  
  "trend_analysis": {
    "hot_periods": [
      {
        "date_range": "기간",
        "common_keywords": ["키워드1"],
        "video_count": 0,
        "avg_performance_score": 0.0,
        "suspected_trigger": "추정 원인"
      }
    ],
    "keyword_frequency": {
      "people": [{"name": "이름", "frequency": 0, "videos": ["제목"]}],
      "events": [{"event": "사건", "frequency": 0, "timing": "시기"}],
      "brands": [{"brand": "브랜드", "frequency": 0, "context": "맥락"}]
    },
    "trend_riding_patterns": {
      "successful_cases": [
        {
          "original_event": "원본 이슈",
          "content_angle": "재해석 각도",
          "timing_gap": "업로드 시차",
          "example_video": "영상 제목"
        }
      ]
    }
  },
  
  "performance_gap": {
    "summary": "차이 핵심",
    "top_strengths": [
      {
        "feature": "특징",
        "description": "설명",
        "impact": "영향",
        "examples": ["제목1"]
      }
    ],
    "bottom_weaknesses": [
      {
        "feature": "특징",
        "description": "설명",
        "examples": ["제목1"]
      }
    ],
    "key_differences": [
      "차이점 1",
      "차이점 2",
      "차이점 3"
    ]
  }
}

**중요**: 간결하고 구체적인 분석만. 추상적 설명 금지.`;

      // 🔥 Fallback 로직으로 API 호출
      console.log(`✅ 채널 컨텐츠 분석 시작...`);
      const apiResult = await callGeminiWithFallback(prompt, serverGeminiKey, userGeminiKey);
      const generatedContent = apiResult.text;
      console.log(`✅ 채널 컨텐츠 분석 완료! (사용된 API: ${apiResult.usedKey})`);

      return NextResponse.json({
        success: true,
        result: generatedContent,
        analyzedCount: matureVideos.length,
        totalCount: validVideos.length,
        excludedCount: validVideos.length - matureVideos.length,
        topCount: topVideos.length,
        bottomCount: bottomVideos.length,
        usedApiKey: apiResult.usedKey,
        metadata: {
          avgViews: Math.round(avgViews),
          avgLikes: Math.round(avgLikes),
          avgDuration: Math.round(avgDuration),
          filterInfo: `게시 3일 이상 경과한 ${matureVideos.length}개 영상 중 상위 ${topCount}개, 하위 ${bottomCount}개 분석`
        }
      });
    }

    if (mode === 'guideline') {
      // 🔥 가이드라인 생성 프롬프트도 간소화
      const prompt = `당신은 YouTube 쇼츠 콘텐츠 제작 전문가입니다.

# 📊 1단계 분석 결과
${analysisResult}

# 🎯 당신의 임무
위 분석 결과를 바탕으로 실전에서 바로 쓸 수 있는 콘텐츠 제작 가이드를 만들어주세요.

## 📝 출력 형식 (마크다운)

당신은 이 채널의 YouTube 쇼츠 콘텐츠 제작 전문가입니다.

## 📌 채널 핵심 정체성
(1-2문장 요약)

### 1. 주제 선정 가이드
- 성과가 좋은 주제와 접근 각도
- 피해야 할 주제
- 시의성 활용 전략

### 2. 제목 작성 가이드
- 효과적인 제목 구조
- 파워 키워드
- 최적 길이와 톤

### 3. 대본 구조 가이드
- 영상 구성 비율
- 문장 스타일
- 성과를 높이는 요소

### 4. 실전 체크리스트
- 제작 전 확인 사항
- 목표 지표

**중요**: 구체적이고 실행 가능한 내용만. ${analysisResult ? '분석된 데이터' : '데이터'} 기반.`;

      // 🔥 Fallback 로직으로 API 호출
      console.log(`✅ 콘텐츠 제작 가이드 생성 시작...`);
      const apiResult = await callGeminiWithFallback(prompt, serverGeminiKey, userGeminiKey);
      const generatedContent = apiResult.text;
      console.log(`✅ 콘텐츠 제작 가이드 생성 완료! (사용된 API: ${apiResult.usedKey})`);

      return NextResponse.json({
        success: true,
        result: generatedContent,
        analyzedCount: validVideos.length,
        usedApiKey: apiResult.usedKey,
      });
    }

    return NextResponse.json(
      { error: '알 수 없는 모드입니다.' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ Gemini API 오류:', error);

    // 한도 초과 에러 특별 처리
    if (error?.message?.includes('한도')) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    if (error?.message?.includes('API 키')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `처리 실패: ${error.message}` },
      { status: 500 }
    );
  }
}