import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { videos, mode, analysisResult } = await request.json();

    // 1단계: 자막이 있는 영상만 필터링
    const validVideos = videos.filter(
      (v: any) => v.script && v.script !== '자막이 없습니다' && v.script !== '자막 추출 실패'
    );

    if (validVideos.length === 0) {
      return NextResponse.json(
        { error: '분석할 수 있는 대본이 없습니다.' },
        { status: 400 }
      );
    }

    // 2단계: 대본 데이터 포맷팅
    const scriptsData = validVideos.map((v: any, idx: number) => 
      `[영상 ${idx + 1}]
제목: ${v.title}
조회수: ${v.views.toLocaleString()}
좋아요: ${v.likes.toLocaleString()}
댓글: ${v.comments.toLocaleString()}
태그: ${v.tags}개
길이: ${v.duration}초
대본:
${v.script}

---`
    ).join('\n\n');

    console.log(`📌 Gemini ${mode === 'analyze' ? '구조 분석' : '지침 생성'} 시작...`);
    console.log(`📊 분석할 대본 수: ${validVideos.length}개`);

    // 3단계: 모드에 따라 다른 프롬프트 사용
    let prompt = '';

    if (mode === 'analyze') {
      // 1단계: 구조 분석 프롬프트
      prompt = `당신은 YouTube 쇼츠 대본 전문 분석가입니다.

# 작업 목표
아래 제공된 ${validVideos.length}개의 성공한 쇼츠 대본을 분석하여, 이 채널의 대본 구조와 패턴을 파악해주세요.

# 분석할 대본들
${scriptsData}

# 출력 형식

## 📊 대본 구조 분석 결과

### 1. 영상 길이 분포
- 평균 영상 길이: X초
- 길이 범위: 최소 X초 ~ 최대 X초
- 주로 사용하는 길이대: 

### 2. 문장 구조
- 평균 문장 길이: (짧음/보통/김)
- 문장 개수 패턴: (예: 60초 영상에 평균 X개 문장)
- 문체 특징: (서술형/대화형/나레이션형 등)
- 자주 사용하는 표현/어미: (3-5개 예시)

### 3. 스토리텔링 구조 (비율 기반)
영상 길이에 관계없이 공통된 구조 패턴:

**도입부 (처음 ~%)**
- 역할: 
- 특징: 
- 예시 문장:

**전개부 (중간 ~%)**
- 역할:
- 특징:
- 정보 전달 방식:

**클라이맥스/반전 (대략 ~% 지점)**
- 위치: (있다면 영상의 몇 % 지점에 등장하는지)
- 특징:
- 예시:

**결말부 (마지막 ~%)**
- 마무리 방식:
- 특징:
- 예시 문장:

### 4. 감정 흐름 설계
- 초반 감정 진입: (즉시/점진적/후반)
- 주요 감정선: (긴장/감동/분노/놀라움 등)
- 감정 피크 타이밍: (전체의 약 몇 % 지점)
- 감정 전환 횟수 및 방식:

### 5. 후킹 전략
- 첫 1-2문장의 역할:
- 호기심 유발 방법:
- 시청 유지 기법: (반복/질문/반전 예고 등)
- 시청자 몰입 장치:

### 6. 핵심 특징 종합
이 채널 대본만의 독특한 특징 5가지:
1. 
2. 
3. 
4. 
5. 

### 7. 주의할 점
- 이 채널이 절대 하지 않는 것:
- 이 채널이 반드시 지키는 원칙:`;

    } else if (mode === 'guideline') {
      // 2단계: 지침 생성 프롬프트
      prompt = `당신은 YouTube 쇼츠 대본 작성 전문가입니다.

# 1단계에서 분석한 채널 구조
${analysisResult}

# 작업 목표
위 분석 결과를 바탕으로, 실제로 사용 가능한 대본 제작 지침을 만들어주세요.

# 출력 형식

## 📝 대본 제작 지침

### 지침 1: 영상 길이 설정
- 권장 길이: X~X초
- 이유: (분석 결과 기반)

### 지침 2: 도입부 작성법
- 비중: 전체의 약 X%
- 목표: (호기심 유발/충격/감정 이입 등)
- 작성 규칙:
  1. 
  2. 
  3. 
- 좋은 예시:
- 나쁜 예시:

### 지침 3: 본문 전개법
- 비중: 전체의 약 X%
- 정보 배치 순서:
- 리듬 조절 방법:
- 작성 규칙:
  1. 
  2. 
  3. 

### 지침 4: 클라이맥스/반전 설정
- 위치: 전체의 약 X% 지점
- 역할:
- 작성 규칙:
  1. 
  2. 

### 지침 5: 결말 처리법
- 비중: 전체의 약 X%
- 마무리 스타일:
- 작성 규칙:
  1. 
  2. 

### 지침 6: 문장 작성 원칙
- 문장 길이: 
- 사용할 표현:
- 피해야 할 표현:
- 어투/말투:

### 지침 7: 필수 체크리스트
작성 완료 후 반드시 확인:
- [ ] 
- [ ] 
- [ ] 
- [ ] 
- [ ] 

---

## ⚠️ 중요: 사실 확인 및 AI 생성 내용 표시

**대본 작성 시 반드시 준수할 사항:**

1. **사용자가 제공한 원본 내용만 사용**
   - 사용자가 제출한 내용 이외의 정보는 절대 임의로 추가하지 말 것
   - 사실과 무관한 내용이나 추측성 정보는 최대한 조심스럽게 다룰 것

2. **AI 예상 내용 명시 의무**
   - 원본에 없는 내용을 전개상 예상하여 작성한 경우
   - 반드시 대본 끝에 다음과 같이 표기할 것:
   
   \`\`\`
   ⚠️ AI 예상 작성 부분
   다음 내용은 전개를 위해 예상하여 작성되었습니다:
   - [해당 부분 명시]
   - [해당 부분 명시]
   
   원본 내용과 다를 수 있으니 사용 전 반드시 확인하시기 바랍니다.
   \`\`\`

3. **불확실한 정보 처리**
   - 명확하지 않은 정보는 "추정", "것으로 보입니다" 등의 표현 사용
   - 확실한 사실만 단정적으로 표현

---

## 💡 AI 활용 프롬프트 템플릿

이 지침을 AI에 입력하여 대본을 생성할 수 있습니다:

\`\`\`
# 역할
이 채널 스타일의 쇼츠 대본 작가

# 이 채널의 핵심 특징
(위 분석 결과 중 가장 중요한 3-4가지를 여기 요약)

# 대본 작성 규칙
1. 영상 길이: X~X초 권장
2. 도입부(X%): [규칙 요약]
3. 전개부(X%): [규칙 요약]
4. 클라이맥스(X% 지점): [규칙 요약]
5. 결말(X%): [규칙 요약]
6. 문장 스타일: [규칙 요약]

# 필수 준수 사항
- 
- 
- 

# 절대 금지 사항
- 
- 

# ⚠️ 사실 확인 및 표시 의무
1. 사용자 제공 내용 이외의 정보는 추가하지 말 것
2. 전개상 예상하여 작성한 내용이 있다면 반드시 명시할 것
3. 불확실한 정보는 조심스럽게 표현할 것

# 작업 요청
아래 원본 내용을 위 규칙에 맞춰 쇼츠 대본으로 재작성해주세요.

## 원본 내용:
[여기에 뉴스/콘텐츠 붙여넣기]

## 출력 형식:
- 한 문장씩 줄바꿈
- 예상 소요 시간 표기
- 자연스러운 나레이션 톤
- AI 예상 작성 부분이 있다면 반드시 별도 표기
\`\`\`

---

## 📌 사용 가이드

### 대본 작성 시:
1. 원본 콘텐츠 길이 확인
2. 위 권장 길이에 맞춰 분량 조절
3. 비율에 맞춰 각 섹션 배분
4. 체크리스트로 최종 검수
5. AI 예상 부분 확인 및 검증

### 길이별 조정 예시:
- 30초 영상: 도입부 6초 + 전개부 18초 + 결말 6초
- 45초 영상: 도입부 9초 + 전개부 27초 + 결말 9초
- 60초 영상: 도입부 12초 + 전개부 36초 + 결말 12초
(실제 비율은 분석 결과에 따라 자동 조정됨)`;
     }

    // 4단계: Gemini API 호출
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const generatedContent = result.response.text();

    console.log(`✅ Gemini ${mode === 'analyze' ? '구조 분석' : '지침 생성'} 완료!`);

    // 5단계: 모드에 따라 다른 응답
    if (mode === 'analyze') {
      return NextResponse.json({
        success: true,
        analysis: generatedContent,
        analyzedCount: validVideos.length,
      });
    } else {
      return NextResponse.json({
        success: true,
        guideline: generatedContent,
        analyzedCount: validVideos.length,
      });
    }

  } catch (error: any) {
    console.error('❌ Gemini API 오류:', error);
    return NextResponse.json(
      { error: `처리 실패: ${error.message}` },
      { status: 500 }
    );
  }
}