// app/api/generate-script/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 🔥 Gemini API 호출 (서버 키만 사용)
async function callGemini(
  prompt: string,
  model: string = 'gemini-2.5-flash'
) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API 키가 서버에 설정되지 않았습니다.');
  }

  try {
    console.log(`[Gemini] API 호출 중...`);
    const genAI = new GoogleGenerativeAI(apiKey);

    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 16384,
        topP: 0.9,
        topK: 40,
      }
    });

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    console.log(`[Gemini] ✅ API 성공!`);
    return text;
  } catch (error: any) {
    const errorCode = error?.status || error?.code;
    const errorMessage = error?.message || '';
    console.log(`[Gemini] ❌ API 실패:`, errorCode, errorMessage);

    if (errorCode === 429 || errorMessage.includes('quota')) {
      throw new Error('Gemini API 일일 한도를 초과했습니다. 내일 다시 시도해주세요.');
    }
    
    throw error;
  }
}

// 🔥 안전한 JSON 파싱
async function parseGeminiResponse(text: string): Promise<any> {
  // 1단계: 그대로 파싱 시도
  try {
    return JSON.parse(text);
  } catch (e1) {
    console.log('직접 파싱 실패, 정제 시도...');
    
    // 2단계: 간단한 정제만
    try {
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e2) {
      console.log('정제 파싱도 실패');
      throw new Error('JSON 파싱 실패');
    }
  }
}

// 🔥 단계별 프롬프트 함수들
const getDNAPrompt = (topVideos: any[], bottomVideos: any[]) => `당신은 YouTube 쇼츠 채널 DNA 전문 분석가입니다.

⚠️ 중요 전제:
- 입력된 자막은 YouTube 자동 추출 기반으로 오타/띄어쓰기 오류가 있을 수 있습니다
- 의미와 맥락 중심으로 분석하고, 사소한 오류는 무시하세요
- **모든 분석 결과는 반드시 순수 한국어로 작성**

# 📈 상위 ${topVideos.length}개 영상
${topVideos.map((v: any, idx: number) => `
[상위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()} | 성과 점수: ${v.performanceScore.toFixed(2)}
- 대본:
${v.script}
---`).join('\n')}

# 📉 하위 ${bottomVideos.length}개 영상
${bottomVideos.map((v: any, idx: number) => `
[하위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()} | 성과 점수: ${v.performanceScore.toFixed(2)}
- 대본:
${v.script}
---`).join('\n')}

# 분석 과제: 채널 DNA와 주제 특성만 분석

다음 JSON만 출력하세요:
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
  }
}`;

const getTitlePrompt = (topVideos: any[], bottomVideos: any[]) => `당신은 YouTube 제목 전략 전문가입니다.

# 📈 상위 ${topVideos.length}개 영상 제목
${topVideos.map((v: any, idx: number) => `
[상위 ${idx + 1}] ${v.title}
- 조회수: ${v.views.toLocaleString()} | 좋아요율: ${((v.likes / v.views) * 100).toFixed(2)}%
- 게시일: ${v.publishedAt} | 길이: ${v.duration}초
---`).join('\n')}

# 📉 하위 ${bottomVideos.length}개 영상 제목
${bottomVideos.map((v: any, idx: number) => `
[하위 ${idx + 1}] ${v.title}
- 조회수: ${v.views.toLocaleString()} | 좋아요율: ${((v.likes / v.views) * 100).toFixed(2)}%
- 게시일: ${v.publishedAt} | 길이: ${v.duration}초
---`).join('\n')}

# 분석 과제: 제목 전략과 트렌드만 분석

다음 JSON만 출력하세요:
{
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
  }
}`;

const getGapPrompt = (dnaResult: any, titleResult: any, topVideos: any[], bottomVideos: any[]) => `당신은 YouTube 성과 분석 전문가입니다.

# 이전 분석 결과
## 채널 DNA 분석:
${JSON.stringify(dnaResult, null, 2)}

## 제목/트렌드 분석:
${JSON.stringify(titleResult, null, 2)}

# 영상 데이터 요약
- 상위 ${topVideos.length}개 평균 조회수: ${Math.round(topVideos.reduce((sum, v) => sum + v.views, 0) / topVideos.length).toLocaleString()}
- 하위 ${bottomVideos.length}개 평균 조회수: ${Math.round(bottomVideos.reduce((sum, v) => sum + v.views, 0) / bottomVideos.length).toLocaleString()}

# 분석 과제: 성과 차이 종합 분석

이전 분석을 바탕으로 왜 상위 영상은 성공하고 하위 영상은 실패했는지 종합 분석하세요.

다음 JSON만 출력하세요:
{
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
}`;

export async function POST(request: NextRequest) {
  try {
    const { videos, mode, analysisResult } = await request.json();

    console.log('[generate-script] 시작');
    console.log('  - 모드:', mode);
    console.log('  - 영상 수:', videos.length);

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

      const sorted = videosWithScore.sort((a, b) => b.performanceScore - a.performanceScore);

      const topCount = Math.ceil(sorted.length * 0.3);
      const bottomCount = Math.ceil(sorted.length * 0.3);

      const topVideos = sorted.slice(0, topCount);
      const bottomVideos = sorted.slice(-bottomCount);

      // 기본 통계
      const avgViews = matureVideos.reduce((sum, v) => sum + v.views, 0) / matureVideos.length;
      const avgLikes = matureVideos.reduce((sum, v) => sum + v.likes, 0) / matureVideos.length;
      const avgDuration = matureVideos.reduce((sum, v) => sum + v.duration, 0) / matureVideos.length;

      console.log(`📊 상위 ${topVideos.length}개 vs 하위 ${bottomVideos.length}개 영상 비교`);

      // 🔥 3단계 분석
      try {
        // Step 1: 채널 DNA 분석
        console.log('📊 Step 1/3: 채널 DNA 분석 중...');
        const dnaResponse = await callGemini(getDNAPrompt(topVideos, bottomVideos));
        const dnaResult = await parseGeminiResponse(dnaResponse);
        console.log('✅ Step 1 완료');

        // Step 2: 제목/트렌드 분석
        console.log('📊 Step 2/3: 제목 패턴 분석 중...');
        const titleResponse = await callGemini(getTitlePrompt(topVideos, bottomVideos));
        const titleResult = await parseGeminiResponse(titleResponse);
        console.log('✅ Step 2 완료');

        // Step 3: 성과 차이 종합
        console.log('📊 Step 3/3: 성과 차이 분석 중...');
        const gapResponse = await callGemini(getGapPrompt(dnaResult, titleResult, topVideos, bottomVideos));
        const gapResult = await parseGeminiResponse(gapResponse);
        console.log('✅ Step 3 완료');

        // 결과 병합
        const finalAnalysis = {
          ...dnaResult,
          ...titleResult,
          ...gapResult
        };

        console.log('✅ 채널 컨텐츠 분석 완료!');

        return NextResponse.json({
          success: true,
          result: JSON.stringify(finalAnalysis),
          analyzedCount: matureVideos.length,
          totalCount: validVideos.length,
          excludedCount: validVideos.length - matureVideos.length,
          topCount: topVideos.length,
          bottomCount: bottomVideos.length,
          metadata: {
            avgViews: Math.round(avgViews),
            avgLikes: Math.round(avgLikes),
            avgDuration: Math.round(avgDuration),
            filterInfo: `게시 3일 이상 경과한 ${matureVideos.length}개 영상 중 상위 ${topCount}개, 하위 ${bottomCount}개 분석`
          }
        });

      } catch (error: any) {
        console.error('❌ 분석 중 오류:', error);
        throw error;
      }
    }

    if (mode === 'guideline') {
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

**중요**: 구체적이고 실행 가능한 내용만. 분석된 데이터 기반.`;

      console.log(`✅ 콘텐츠 제작 가이드 생성 시작...`);
      const guidelineResponse = await callGemini(prompt);
      console.log(`✅ 콘텐츠 제작 가이드 생성 완료!`);

      return NextResponse.json({
        success: true,
        result: guidelineResponse,
        analyzedCount: validVideos.length,
      });
    }

    return NextResponse.json(
      { error: '알 수 없는 모드입니다.' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ API 오류:', error);

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