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

      if (matureVideos.length < 10) {
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

      const prompt = `당신은 YouTube 쇼츠 대본 전문 분석가입니다.

⚠️ 중요 전제:
- 입력된 자막은 YouTube 자동 추출 기반으로 오타/띄어쓰기 오류가 있을 수 있습니다
- 의미와 맥락 중심으로 분석하고, 사소한 오류는 무시하세요
- 이 채널의 전체 성과와 관계없이 **객관적으로** 분석하세요
- 분석 대상 영상은 모두 게시 후 3일 이상 경과하여 초기 성과가 안정화된 영상입니다

# 📊 채널 기본 정보
- 분석 영상 수: ${matureVideos.length}개 (게시 3일 이상 경과)
- 평균 조회수: ${Math.round(avgViews).toLocaleString()}
- 평균 좋아요: ${Math.round(avgLikes).toLocaleString()}
- 평균 길이: ${Math.round(avgDuration)}초

# 🎯 분석 목적
이 분석은 **2단계**로 진행됩니다:

## 1단계: 채널 현재 상태 파악
"이 채널이 현재 사용하는 대본 구조와 패턴"

## 2단계: 채널 내 성과 차이 분석
"같은 채널 내에서 더 잘된 영상 vs 덜 잘된 영상의 차이"
(채널 전체 성과와 무관하게, 상대적 비교)

---

# 📚 전체 영상 대본 (채널 패턴 파악용)
${matureVideos.slice(0, 10).map((v: any, idx: number) => `
[전체 ${idx + 1}] ${v.title}
- 조회수: ${v.views.toLocaleString()} | 좋아요: ${v.likes.toLocaleString()} | 길이: ${v.duration}초
- 대본 샘플: ${v.script.substring(0, 300)}...
`).join('\n')}
${matureVideos.length > 10 ? `\n... 외 ${matureVideos.length - 10}개 영상` : ''}

---

# 📈 채널 내 상위 ${topCount}개 영상
(이 채널 기준으로 상대적으로 잘된 영상)
${topVideos.map((v: any, idx: number) => `
[상위 ${idx + 1}] ${v.title}
- 성과: 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()} (${((v.likes/v.views)*100).toFixed(2)}%) | 댓글 ${v.comments.toLocaleString()}
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
2. **문장 스타일**: 평균 길이, 어조, 말투, 문체
3. **콘텐츠 유형**: 정보형? 스토리형? 리액션형? 혼합?
4. **후킹 방식**: 첫 문장의 전형적 패턴
5. **채널 특징**: 이 채널만의 독특한 표현이나 구조

## Part 2: 성과별 차이 (무엇이 성과를 갈랐나)
상위 영상과 하위 영상을 비교:
1. **첫 문장 차이**: 형태(질문/숫자/감탄/설명), 길이, 강도
2. **숫자/데이터**: 사용 빈도와 위치
3. **질문문**: 개수와 배치 위치
4. **감정 표현**: 강한 단어(충격/대박/미친) 사용 차이
5. **반전/전환**: 타이밍과 표현 방식 차이
6. **길이 차이**: 짧게 vs 길게 전략 차이
7. **마무리 방식**: 질문형 vs CTA vs 단순 종료

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
    "style": {
      "sentence_length": "짧음/보통/김",
      "tone": "설명형/대화형/감정형",
      "signature": "채널 고유 특징을 구분자(|)로 연결. 예: 특징1|특징2|특징3"
    },
    "content_type": "정보형/스토리형/리액션형/혼합"
  },
  
  "performance_gap": {
    "summary": "상위와 하위의 가장 큰 차이 1-2문장",
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
- 추상적 분석 금지. 모든 내용은 구체적 관찰 기반
- 백분율이나 비율은 실제 데이터에서 관찰된 것만
- "~해야 한다" 같은 처방 금지. "~했다/~하는 경향" 형태로
- 규칙을 만들지 말고, 데이터가 보여주는 패턴만 보고
- signature는 반드시 | 기호로 구분하여 파싱 가능하게 작성`;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const generatedContent = result.response.text();

      console.log(`✅ 채널 분석 완료!`);

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
      const prompt = `당신은 YouTube 쇼츠 대본 작성 전문가입니다.

# 📊 1단계 분석 결과
${analysisResult}

위 분석에서 도출된 내용:
- **채널 DNA**: 현재 이 채널이 사용하는 전형적인 패턴
- **성과 차이**: 같은 채널 내에서 잘된 영상 vs 덜 잘된 영상의 차이

# 🎯 당신의 임무
위 분석 결과를 바탕으로, **실전에서 바로 쓸 수 있는 대본 제작 지침**을 만들어주세요.

---

## 📝 출력 형식 (마크다운)

### 🎬 1. 영상 구성 비율
- **도입부**: X% (약 X초)
  - 목적: (분석 결과 기반)
  - 핵심 전략: 
- **본문**: X% (약 X초)
  - 목적:
  - 핵심 전략:
- **클라이맥스**: X% (약 X초)
  - 목적:
  - 핵심 전략:
- **결말**: X% (약 X초)
  - 목적:
  - 핵심 전략:

### ✍️ 2. 문장 작성 규칙
- **문장 길이**: (짧음/보통/김)
- **어조**: (설명형/대화형/감정형)
- **필수 표현**: 
- **피해야 할 표현**:

### 🔥 3. 성과를 높이는 핵심 요소
(performance_gap.top_strengths 기반으로 작성)
1. **[특징명]**
   - 왜 효과적인가: 
   - 적용 방법:
   - 예시:

### ⚠️ 4. 피해야 할 실수
(performance_gap.bottom_weaknesses 기반으로 작성)
1. **[약점명]**
   - 문제점:
   - 개선 방법:

### 📋 5. 체크리스트
대본 작성 후 반드시 확인:
- [ ] 도입부가 X% 이내인가?
- [ ] (분석 결과 기반 체크리스트)
- [ ] ...

---

**중요**: 
- 모든 내용은 1단계 분석 결과에 **구체적으로 기반**해야 함
- 일반론 금지. 이 채널만의 맞춤형 조언
- 실전에서 바로 적용 가능한 구체적 가이드`;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const generatedContent = result.response.text();

      console.log(`✅ 제작 지침 생성 완료!`);

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