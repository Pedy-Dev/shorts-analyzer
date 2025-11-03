// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Google OAuth 설정
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
);

export async function GET(request: NextRequest) {
  try {
    // URL에서 code 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // 사용자가 권한 거부한 경우
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}?error=access_denied`
      );
    }

    // code가 없는 경우
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}?error=no_code`
      );
    }

    // code를 access_token으로 교환
    const { tokens } = await oauth2Client.getToken(code);

    // 응답 생성
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}?auth=success`
    );

    // 토큰을 쿠키에 저장 (7일간 유효)
    response.cookies.set('google_access_token', tokens.access_token || '', {
      httpOnly: true,  // JavaScript로 접근 불가 (보안)
      secure: process.env.NODE_ENV === 'production',  // HTTPS에서만 전송
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,  // 7일
      path: '/',
    });

    // Refresh Token도 있으면 저장
    if (tokens.refresh_token) {
      response.cookies.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,  // 30일
        path: '/',
      });
    }

    return response;

  } catch (error: any) {
    console.error('OAuth 콜백 처리 실패:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}?error=auth_failed`
    );
  }
}