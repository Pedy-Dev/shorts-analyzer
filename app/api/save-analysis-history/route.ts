// app/api/save-analysis-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';

// 서버용 Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// AI 카테고리 분류 함수
async function classifyChannelCategory(
  channelTitle: string,
  videoTitles: string[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Gemini API 키 없음');
    return '기타';
  }

  const categoryList = [
    '썰 (실화/사건/사고/경험담)',
    '쇼핑쇼츠 (제품 리뷰, 언박싱, 구매 유도)',
    '드라마/영화 리뷰',
    '연예인 이슈',
    '시사/정치/뉴스',
    '브랜딩/기업 스토리',
    '교육/정보',
    '코미디/밈',
    '브이로그/일상',
    '기타',
  ];

  const prompt = `당신은 YouTube 쇼츠 채널 분류 전문가입니다.

다음 정보를 바탕으로 이 채널의 카테고리를 분류하세요:

채널명: ${channelTitle}

영상 제목 리스트 (최근 ${videoTitles.length}개):
${videoTitles
  .slice(0, 20)
  .map((title, i) => `${i + 1}. ${title}`)
  .join('\n')}

아래 카테고리 중 **정확히 하나만** 선택하세요:
${categoryList.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

응답은 반드시 다음 JSON 형식으로만 작성하세요:
{"category": "선택한_카테고리"}

예시:
{"category": "썰 (실화/사건/사고/경험담)"}`;

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
    return parsed.category || '기타';
  } catch (error) {
    console.error('카테고리 분류 실패:', error);
    return '기타';
  }
}

export async function POST(request: NextRequest) {
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
      isOwnChannel,
      videoCount,
      analysisResult, // parsedResult (전체 분석 객체)
      analysisRaw, // Gemini 원본 응답 (문자열/JSON)
      topVideosSummary, // 상위 30% 영상 스냅샷
      bottomVideosSummary, // 하위 30% 영상 스냅샷
      videoTitles, // 영상 제목 배열
    } = body;

    // 필수 필드 검증
    if (!channelId || !channelTitle) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // AI로 카테고리 분류
    console.log('📊 AI 카테고리 분류 시작...');
    const creatorCategory = await classifyChannelCategory(
      channelTitle,
      videoTitles || []
    );
    console.log('✅ 분류 결과:', creatorCategory);

    // schemaVersion 결정 (내 채널 vs 타 채널)
    const schemaVersion =
      typeof isOwnChannel === 'boolean' && isOwnChannel
        ? 'v1_own'
        : 'v1_external';

    // analysis_summary에 schemaVersion 추가
    // 👉 분석 결과가 object면 그대로 + schemaVersion
    // 👉 혹시 문자열/널이면 raw 필드로 보존
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

    // DB에 저장
    const { data, error } = await supabase
      .from('channel_analysis_history')
      .insert({
        user_id: userIdFromCookie, // 쿠키에서 가져온 실제 사용자 ID 사용
        channel_id: channelId,
        channel_title: channelTitle,
        channel_thumbnail: channelThumbnail || null,
        is_own_channel: isOwnChannel || false,
        creator_category: creatorCategory,
        video_count: videoCount || 0,
        analysis_summary: summaryWithVersion, // schemaVersion 포함
        analysis_raw: analysisRaw || null, // Gemini 원본 응답 저장
        top_videos_summary: topVideosSummary || null, // 상위 30% 영상 스냅샷
        bottom_videos_summary: bottomVideosSummary || null, // 하위 30% 영상 스냅샷
      })
      .select();

    if (error) {
      console.error('DB 저장 실패:', error);
      return NextResponse.json(
        { error: 'DB 저장 실패: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ 분석 기록 저장 완료!');

    return NextResponse.json({
      success: true,
      data: data[0],
      category: creatorCategory,
    });
  } catch (error: any) {
    console.error('❌ 저장 중 오류:', error);
    return NextResponse.json(
      { error: '저장 실패: ' + error.message },
      { status: 500 }
    );
  }
}
