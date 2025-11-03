//api/google/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Google OAuth 설정
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,        // .env.local에서 가져옴
  process.env.GOOGLE_CLIENT_SECRET,    // .env.local에서 가져옴
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`  // 로그인 후 돌아올 주소
);

export async function GET() {
  try {
    // Google 로그인 URL 생성
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',  // 리프레시 토큰 발급
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',           // YouTube 기본 정보
        'https://www.googleapis.com/auth/yt-analytics.readonly',      // YouTube Analytics
      ],
      prompt: 'select_account consent',  // 계정/채널 선택 + 권한 동의 화면 강제 표시
      include_granted_scopes: true,      // 이전 권한 포함
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