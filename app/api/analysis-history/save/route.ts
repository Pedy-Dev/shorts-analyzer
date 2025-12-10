// app/api/analysis-history/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase-server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  try {
    // 1. 로그인 체크
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 파싱
    const data = await request.json();

    // 3. 필수 필드 검증
    if (!data.channelId || !data.channelTitle) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      );
    }

    // 4. analysis_summary에 schemaVersion 추가 (내 채널 분석)
    const summaryWithVersion = data.analysisSummary
      ? {
          ...data.analysisSummary,
          schemaVersion: 'v1_own'  // 내 채널 분석
        }
      : null;

    // 4. 하루 제한 없이 모든 분석 저장 (시간별로 구분)
    const now = new Date();
    const analysisDateTime = now.toISOString(); // 전체 날짜+시간

    console.log('📊 새 분석 기록 생성:', {
      channel: data.channelTitle || '알 수 없는 채널',
      channelId: data.channelId,
      dateTime: analysisDateTime,
      time: now.toLocaleTimeString()
    });

    console.log('💾 DB 저장 시작 (내 채널 분석)...');
    console.log('  - analysis_raw 포함 여부:', !!data.analysisRaw);

    // 5. 새 분석 기록 저장 (항상 새로운 기록으로)
    const { data: saved, error: saveError } = await supabase
      .from('channel_analysis_history')
      .insert({
        user_id: userId,
        channel_id: data.channelId,
        channel_title: data.channelTitle,
        channel_thumbnail: data.channelThumbnail || null,
        subscriber_count: data.subscriberCount || 0,
        is_own_channel: data.isOwnChannel || false,
        yt_category: data.ytCategory || null,
        creator_category: data.creatorCategory || null,
        video_count: data.videoCount || 0,
        analysis_summary: summaryWithVersion,  // schemaVersion 포함
        analysis_raw: data.analysisRaw || null,  // 원본 응답 (optional)
        top_videos_summary: data.topVideosSummary || null,
        bottom_videos_summary: data.bottomVideosSummary || null,
        analysis_date: analysisDateTime
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ 분석 기록 저장 실패:', saveError);
      throw saveError;
    }

    console.log('✅ 분석 기록 저장 완료:', {
      id: saved!.id,
      channel: data.channelTitle,
      dateTime: analysisDateTime
    });

    return NextResponse.json({
      success: true,
      id: saved!.id,
      message: '분석 기록이 저장되었습니다'
    });

  } catch (error: any) {
    console.error('❌ 분석 기록 저장 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다',
        details: error.message
      },
      { status: 500 }
    );
  }
}