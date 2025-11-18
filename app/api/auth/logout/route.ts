// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 쿠키 삭제 응답 생성
    const response = NextResponse.json({
      success: true,
      message: '로그아웃 성공',
    });

    // 모든 인증 관련 쿠키 삭제
    response.cookies.delete('user_id');
    response.cookies.delete('google_access_token');
    response.cookies.delete('google_refresh_token');

    return response;

  } catch (error: any) {
    console.error('로그아웃 오류:', error);
    return NextResponse.json(
      { success: false, error: '로그아웃 실패' },
      { status: 500 }
    );
  }
}
