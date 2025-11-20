// app/api/user/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트
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

    // Supabase에서 사용자 정보 조회 (기본 정보만)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, google_id, email, name, profile_image, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('사용자 조회 실패:', error);
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // ⭐ YouTube 채널 정보는 user_channels 테이블에서 별도로 조회 필요
    // 필요 시 /api/my-channels/list API 사용
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profile_image,
        createdAt: user.created_at,
        // YouTube 관련 필드 제거됨
      },
    });

  } catch (error: any) {
    console.error('사용자 정보 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
