// app/api/save-analysis-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';

// AI 카테고리 분류 실제 실행 함수
async function tryClassifyCategory(
  apiKey: string,
  prompt: string
): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // JSON 파싱
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      cleaned = match[0];
    }

    const parsed = JSON.parse(cleaned);
    const category = parsed.category || '';

    // 카테고리 검증
    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return null;
    }

    return category.trim();
  } catch (error) {
    console.error('분류 시도 실패:', error);
    return null;
  }
}

// AI 카테고리 분류 함수 (1개 카테고리 선택, 실패 시 1회 재시도)
async function classifyChannelCategory(
  channelTitle: string,
  analysisResult: any,
  topVideosSummary?: any[],
  bottomVideosSummary?: any[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Gemini API 키 없음 - 기타로 분류');
    return '기타';
  }

  // analysisResult에서 주제 정보 추출
  const topicCharacteristics = analysisResult?.topic_characteristics;

  const categoryList = [
    {
      name: '썰/스토리',
      description: '실화/인생 썰, 연애/인간관계 썰, 학교/군대 썰, 알바/직장 썰, 공포/찌린 썰'
    },
    {
      name: '사건·사고/시사',
      description: '사건사고 리포트, 사회/정치 이슈 해설, 국제/안보/외교 이슈 해설, 경제/시사 이슈 브리핑, 제도/법·정책 설명형'
    },
    {
      name: '정보·교육 설명형',
      description: '재테크/경제/투자 설명, 비즈니스/자기계발/커리어, 역사/인문 스토리텔링, 과학/IT/AI 설명, 공부/언어/자격증, 생활꿀팁/노하우'
    },
    {
      name: '쇼핑/리뷰/광고',
      description: '패션/뷰티 제품 리뷰, 디지털/가전/IT 제품 리뷰, 식품/맛집/간편식 리뷰, 생활용품/인테리어/잡화 리뷰, 서비스/앱/온라인툴 소개'
    },
    {
      name: '브랜딩/비즈니스 스토리',
      description: '기업 성장 스토리/브랜딩, 창업/사장 썰/스타트업 스토리, 마케팅/브랜딩 사례 해설, 비즈니스 모델/전략 분석, 직장/조직문화 인사이트'
    },
    {
      name: '컨텐츠 리뷰',
      description: '드라마 줄거리 요약, 영화 줄거리 요약, 드라마/영화 해석·분석, 예능/버라이어티 리뷰, OTT/콘텐츠 추천 모음, 문제작/논란작 리뷰'
    },
    {
      name: '연예인/유명인 이슈',
      description: '열애/결혼/이별 이슈, 논란/사과/학폭/범죄 이슈, 커리어/행보 분석, 이미지/캐릭터/브랜딩 변화, 연예인/인플루언서 비즈니스 스토리'
    },
    {
      name: '밈/유행',
      description: '인터넷 밈/짤, 유행어/신조어/챌린지, 예능/드라마/게임발 밈, 온라인 커뮤니티 이슈, 밈 활용/패러디'
    },
    {
      name: '브이로그',
      description: '일상 루틴 브이로그, 목표/자기계발 다이어리형, 직업/직무 브이로그, 여행 브이로그, 운동/건강 브이로그, 감정/멘탈 케어 브이로그'
    }
  ];

  // Fallback 전략: 1) topic 분석 → 2) 영상 제목 전체 → 3) 채널명만
  const mainCategories = topicCharacteristics?.main_categories || [];
  const successfulTopics = topicCharacteristics?.successful_topics || [];

  let dataSource = '';
  let contentInfo = '';

  // 1순위: topic_characteristics가 있는 경우
  if (mainCategories.length > 0 || successfulTopics.length > 0) {
    dataSource = 'AI 주제 분석';
    const topicSummary = mainCategories.length > 0
      ? mainCategories.map((cat: any) => `- ${cat.category}: ${cat.description}`).join('\n')
      : '(주요 카테고리 없음)';

    const topTopics = successfulTopics.length > 0
      ? successfulTopics.slice(0, 5).map((topic: any) => `- ${topic.topic} (${topic.category})`).join('\n')
      : '(성과 주제 없음)';

    contentInfo = `AI가 분석한 주요 주제 카테고리:
${topicSummary}

성과가 좋은 주제들:
${topTopics}`;
  }
  // 2순위: 영상 제목들이 있는 경우 (모든 분석 대상 영상)
  else if ((topVideosSummary && topVideosSummary.length > 0) || (bottomVideosSummary && bottomVideosSummary.length > 0)) {
    dataSource = '분석 대상 영상 제목';
    const allTitles: string[] = [];

    if (topVideosSummary && topVideosSummary.length > 0) {
      topVideosSummary.forEach((video: any) => {
        if (video.title) allTitles.push(video.title);
      });
    }

    if (bottomVideosSummary && bottomVideosSummary.length > 0) {
      bottomVideosSummary.forEach((video: any) => {
        if (video.title) allTitles.push(video.title);
      });
    }

    if (allTitles.length > 0) {
      contentInfo = `분석에 사용된 영상 제목들 (총 ${allTitles.length}개):
${allTitles.map((title, idx) => `${idx + 1}. ${title}`).join('\n')}`;
    } else {
      // 제목이 없으면 3순위로 이동
      dataSource = '채널명만';
      contentInfo = '(주제 분석 및 영상 제목 데이터 없음)';
    }
  }
  // 3순위: 채널명만 있는 경우
  else {
    dataSource = '채널명만';
    contentInfo = '(주제 분석 및 영상 제목 데이터 없음)';
  }

  console.log(`📊 카테고리 분류 데이터 출처: ${dataSource}`);

  const prompt = `당신은 YouTube 쇼츠 채널 분류 전문가입니다.

다음 정보를 바탕으로 이 채널의 **메인 주제**를 분류하세요:

채널명: ${channelTitle}

${contentInfo}

아래 9개 메인 주제 중 **정확히 1개만** 선택하세요:

${categoryList.map((cat, i) => `${i + 1}. ${cat.name}
   포함 범위: ${cat.description}`).join('\n\n')}

분류 가이드:
- 위의 정보를 **가장 우선적으로** 참고하세요
- **반드시 1개만 선택해야 합니다** (0개 또는 2개 이상 선택은 허용되지 않습니다)
- 가장 연관성이 높은 주제 1개를 선택하세요

⚠️ **매우 중요 - 반드시 지켜야 할 규칙:**
1. 위에 나열된 9개 카테고리의 이름을 **정확히 그대로** 사용하세요
2. 절대로 새로운 카테고리를 만들거나 이름을 변형하지 마세요
3. 카테고리 이름의 띄어쓰기, 특수문자(·, /)까지 정확히 일치시키세요
4. 예: "사건·사고/시사" (O), "사건사고/시사" (X), "사건·사고 시사" (X)

Few-shot 예시:

예시 1:
채널명: "무서운라디오"
주요 주제: 공포 썰, 괴담, 실화 체험담
→ {"category": "썰/스토리"}

예시 2:
채널명: "경제맨"
주요 주제: 재테크, 투자 팁, 경제 지식
→ {"category": "정보·교육 설명형"}

예시 3:
채널명: "드라마리뷰왕"
주요 주제: 드라마 줄거리 요약, 작품 분석
→ {"category": "컨텐츠 리뷰"}

응답 형식:
- 반드시 JSON 형식으로만 작성하세요
- 카테고리 이름은 위의 9개 목록에서 **정확히 복사**해서 사용하세요
- 형식: {"category": "카테고리명"}
- 다시 강조: 정확히 1개만 선택하고, 절대로 새로운 카테고리 이름을 만들지 마세요!`;

  // 1차 시도
  console.log('📌 카테고리 분류 1차 시도...');
  let result = await tryClassifyCategory(apiKey, prompt);

  if (result) {
    console.log('✅ 1차 시도 성공:', result);
    return result;
  }

  // 1차 실패 시 재시도
  console.warn('⚠️ 1차 시도 실패 - 재시도 중...');
  result = await tryClassifyCategory(apiKey, prompt);

  if (result) {
    console.log('✅ 2차 시도 성공:', result);
    return result;
  }

  // 2차 시도도 실패
  console.error('❌ 2차 시도도 실패 - 기타로 분류');
  return '기타';
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  try {
    // 쿠키에서 실제 사용자 ID 가져오기
    const cookieStore = await cookies();
    const userIdFromCookie = cookieStore.get('user_id')?.value;

    if (!userIdFromCookie) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      channelId,
      channelTitle,
      channelThumbnail,
      subscriberCount,
      isOwnChannel,
      videoCount,
      analysisResult, // parsedResult (전체 분석 객체)
      analysisRaw, // Gemini 원본 응답 (문자열/JSON)
      topVideosSummary, // 상위 30% 영상 스냅샷
      bottomVideosSummary, // 하위 30% 영상 스냅샷
      channelStats, // 전체 영상 통계 (화면에 표시되는 수치)
    } = body ?? {};


    // ✅ 필수 필드 검증: 이제 channelId만 필수
    if (!channelId) {
      return NextResponse.json(
        { error: '채널 ID가 없습니다.' },
        { status: 400 }
      );
    }

    // ✅ channelTitle 안전 처리
    const safeChannelTitle =
      typeof channelTitle === 'string' && channelTitle.trim().length > 0
        ? channelTitle.trim()
        : '알 수 없는 채널';

    // AI로 카테고리 분류 (주제 분석 결과 활용)
    console.log('📊 AI 카테고리 분류 시작...');
    const creatorCategory = await classifyChannelCategory(
      safeChannelTitle,
      analysisResult,
      topVideosSummary,
      bottomVideosSummary
    );
    console.log('✅ 분류 결과:', creatorCategory);

    // schemaVersion 결정 (내 채널 vs 타 채널)
    const schemaVersion =
      typeof isOwnChannel === 'boolean' && isOwnChannel
        ? 'v1_own'
        : 'v1_external';

    // analysis_summary에 schemaVersion 추가
    let summaryWithVersion: any;
    if (analysisResult && typeof analysisResult === 'object') {
      summaryWithVersion = {
        ...analysisResult,
        schemaVersion,
      };
    } else {
      summaryWithVersion = {
        schemaVersion,
        raw: analysisResult ?? null,
      };
    }

    console.log('💾 DB 저장 시작...');
    console.log('  - analysis_raw 포함 여부:', !!analysisRaw);
    console.log('  - schemaVersion:', schemaVersion);
    console.log('  - safeChannelTitle:', safeChannelTitle);

    const { data, error } = await supabase
      .from('channel_analysis_history')
      .insert({
        user_id: userIdFromCookie,
        channel_id: channelId,
        channel_title: safeChannelTitle,
        channel_thumbnail: channelThumbnail || null,
        subscriber_count: subscriberCount || 0,
        is_own_channel: !!isOwnChannel,
        creator_category: creatorCategory,
        video_count: videoCount || 0,
        analysis_summary: summaryWithVersion,
        analysis_raw: analysisRaw ?? null,
        top_videos_summary: topVideosSummary ?? null,
        bottom_videos_summary: bottomVideosSummary ?? null,
      })
      .select()
      .single(); // data[0] 대신 single() 사용

    if (error) {
      console.error('DB 저장 실패:', error);
      return NextResponse.json(
        { error: 'DB 저장 실패', details: error },
        { status: 500 }
      );
    }

    console.log('✅ 분석 기록 저장 완료!');

    // ⭐ 타 채널 분석인 경우 channel_catalog에도 저장 (서버 공용 자산)
    if (!isOwnChannel) {
      try {
        console.log('📊 channel_catalog 업데이트 시작...');

        // ✅ 전체 영상 통계 사용 (화면에 표시되는 수치와 동일)
        const globalMetrics = channelStats ? {
          avg_views: channelStats.avgViews || 0,
          avg_likes: channelStats.avgLikes || 0,
          avg_comments: channelStats.avgComments || 0,
          avg_duration: channelStats.avgDuration || 0,
          subscriber_count: subscriberCount || 0,
        } : null;

        if (globalMetrics) {

          // 기존 채널 확인
          const { data: existingChannel } = await supabase
            .from('channel_catalog')
            .select('total_analysis_count')
            .eq('channel_id', channelId)
            .single();

          const newCount = existingChannel ? (existingChannel.total_analysis_count || 0) + 1 : 1;

          // UPSERT: 채널이 없으면 INSERT, 있으면 UPDATE
          const { error: catalogError } = await supabase
            .from('channel_catalog')
            .upsert(
              {
                channel_id: channelId,
                channel_url: `https://youtube.com/@${channelId}`,
                channel_title: safeChannelTitle,
                category: creatorCategory,
                last_analyzed_at: new Date().toISOString(),
                total_analysis_count: newCount,
                global_metrics: globalMetrics,
              },
              {
                onConflict: 'channel_id',
              }
            );

          if (catalogError) {
            console.error('⚠️ channel_catalog 저장 실패 (무시):', catalogError);
          } else {
            console.log('✅ channel_catalog 업데이트 완료:', {
              channel: safeChannelTitle,
              category: creatorCategory,
              analysis_count: newCount,
              avg_views: globalMetrics.avg_views,
            });
          }
        } else {
          console.warn('⚠️ channelStats가 없어 channel_catalog 저장 생략');
        }
      } catch (catalogError) {
        console.error('⚠️ channel_catalog 저장 중 오류 (무시):', catalogError);
        // 실패해도 메인 저장은 성공했으므로 계속 진행
      }
    }

    return NextResponse.json({
      success: true,
      data,
      category: creatorCategory,
    });
  } catch (error: any) {
    console.error('❌ 저장 중 오류:', error);
    return NextResponse.json(
      {
        error: '저장 실패',
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
