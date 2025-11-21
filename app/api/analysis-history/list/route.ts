// app/api/analysis-history/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 1. 로그인 체크
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    console.log('📋 분석 기록 리스트 조회:', userId);

    // 2. 본인의 분석 기록만 조회
    const { data: history, error } = await supabase
      .from('channel_analysis_history')
      .select(`
        id,
        channel_id,
        channel_title,
        channel_thumbnail,
        subscriber_count,
        is_own_channel,
        yt_category,
        creator_category,
        video_count,
        analysis_date,
        created_at
      `)
      .eq('user_id', userId)
      .order('analysis_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 분석 기록 조회 실패:', error);
      throw error;
    }

    console.log(`✅ ${history?.length || 0}개 분석 기록 조회 완료`);

    // 3. 날짜 포맷팅
    const formattedHistory = (history || []).map(item => ({
      ...item,
      // 한국 시간으로 변환 (선택사항)
      formattedDate: new Date(item.analysis_date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      formattedTime: new Date(item.created_at).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    return NextResponse.json({
      success: true,
      history: formattedHistory,
      count: formattedHistory.length
    });

  } catch (error: any) {
    console.error('❌ 분석 기록 리스트 조회 오류:', error);
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