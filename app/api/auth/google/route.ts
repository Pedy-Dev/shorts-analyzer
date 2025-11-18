//api/google/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Google OAuth 설정
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,        // .env.local에서 가져옴
  process.env.GOOGLE_CLIENT_SECRET,    // .env.local에서 가져옴
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`  // 로그인 후 돌아올 주소
);

export async function GET(request: NextRequest) {
  try {
    // URL 파라미터에서 type 가져오기 (login 또는 youtube)
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'login';

    let scopes: string[];
    let prompt: string;

    if (type === 'youtube') {
      // 내 채널 분석용: YouTube API 권한 필요
      scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/youtube.readonly',           // YouTube 기본 정보
        'https://www.googleapis.com/auth/yt-analytics.readonly',      // YouTube Analytics
      ];
      prompt = 'select_account consent';  // 계정/채널 선택 + 권한 동의 화면 강제 표시
    } else {
      // 사이트 로그인용: 이메일/프로필만
      scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ];
      prompt = 'select_account';  // 계정 선택만
    }

    // Google 로그인 URL 생성
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',  // 리프레시 토큰 발급
      scope: scopes,
      prompt: prompt,
      include_granted_scopes: true,      // 이전 권한 포함
      state: type,  // type을 state로 전달 (callback에서 사용)
    });

    // 생성된 URL 반환
    return NextResponse.json({
      success: true,
      authUrl  // 프론트엔드에서 이 URL로 리다이렉트
    });

  } catch (error: any) {
    console.error('OAuth URL 생성 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Google 로그인 URL 생성 실패',
        details: error.message
      },
      { status: 500 }
    );
  }
}