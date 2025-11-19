// app/api/my-channels/list/route.ts
// Phase 2: user_channels 테이블에서 연결된 채널 목록 조회
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 쿠키에서 user_id 가져오기
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    console.log('📌 연결된 채널 목록 조회 시작:', userId);

    // user_channels 테이블에서 이 사용자의 채널 목록 조회
    const { data: channels, error } = await supabase
      .from('user_channels')
      .select('id, youtube_channel_id, youtube_channel_title, youtube_channel_thumbnail, is_default, last_used_at, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('is_default', { ascending: false })  // 기본 채널 먼저
      .order('last_used_at', { ascending: false }); // 최근 사용 순

    if (error) {
      console.error('❌ 채널 목록 조회 실패:', error);
      throw error;
    }

    console.log(`✅ ${channels?.length || 0}개 채널 조회 완료`);

    return NextResponse.json({
      success: true,
      channels: channels || [],
      count: channels?.length || 0,
    });

  } catch (error: any) {
    console.error('❌ 채널 리스트 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '채널 리스트 조회 실패',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
