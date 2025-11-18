// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Google OAuth 설정
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
);

// Supabase 클라이언트 (서버용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // URL에서 code 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state') || 'login';  // type을 state로 받음

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

    // Google 사용자 정보 가져오기
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Supabase에 사용자 정보 저장/업데이트
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', userInfo.id)
      .single();

    let userId: string;

    if (existingUser) {
      // 기존 사용자 업데이트
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email: userInfo.email,
          name: userInfo.name,
          profile_image: userInfo.picture,
          updated_at: new Date().toISOString(),
        })
        .eq('google_id', userInfo.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Supabase UPDATE 실패:', updateError);
        throw new Error(`Supabase UPDATE 실패: ${updateError.message}`);
      }

      userId = updatedUser!.id;
    } else {
      // 새 사용자 생성
      console.log('📌 새 사용자 INSERT 시도:', {
        google_id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
      });

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          google_id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          profile_image: userInfo.picture,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Supabase INSERT 실패:', insertError);
        console.error('❌ 에러 코드:', insertError.code);
        console.error('❌ 에러 메시지:', insertError.message);
        console.error('❌ 에러 상세:', insertError.details);
        throw new Error(`Supabase INSERT 실패: ${insertError.message}`);
      }

      if (!newUser) {
        console.error('❌ newUser가 null입니다 (에러는 없지만 데이터도 없음)');
        throw new Error('사용자 생성 실패: 데이터가 반환되지 않음');
      }

      console.log('✅ 새 사용자 생성 성공:', newUser);
      userId = newUser.id;
    }

    console.log('✅ 사용자 저장 완료:', { userId, email: userInfo.email });

    // YouTube 권한 연결인 경우, 토큰과 채널 정보를 DB에 저장
    if (state === 'youtube') {
      console.log('📌 YouTube 토큰 및 채널 정보 저장 중...');

      try {
        // YouTube API로 채널 정보 가져오기
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelsResponse = await youtube.channels.list({
          part: ['snippet'],
          mine: true,
        });

        const channel = channelsResponse.data.items?.[0];

        if (channel) {
          // DB에 YouTube 토큰 및 채널 정보 저장
          const { error: updateError } = await supabase
            .from('users')
            .update({
              youtube_access_token: tokens.access_token,
              youtube_refresh_token: tokens.refresh_token || null,
              youtube_channel_id: channel.id,
              youtube_channel_title: channel.snippet?.title || null,
              youtube_token_updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (updateError) {
            console.error('❌ YouTube 정보 저장 실패:', updateError);
            throw new Error(`YouTube 정보 저장 실패: ${updateError.message}`);
          }

          console.log('✅ YouTube 채널 연동 완료:', {
            channelId: channel.id,
            channelTitle: channel.snippet?.title,
          });
        } else {
          console.error('❌ YouTube 채널 정보를 찾을 수 없습니다.');
        }
      } catch (error: any) {
        console.error('❌ YouTube 채널 정보 가져오기 실패:', error);
        // YouTube 정보 가져오기 실패해도 계속 진행
      }
    }

    // 응답 생성 (type에 따라 리다이렉트 경로 변경)
    let redirectUrl;
    if (state === 'youtube') {
      // YouTube 권한 연결 완료 → 메인 페이지로 (내 채널 분석 탭)
      redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}?youtube_connected=true`;
    } else {
      // 사이트 로그인 완료 → 메인 페이지로
      redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}?auth=success`;
    }

    const response = NextResponse.redirect(redirectUrl);

    // User ID 쿠키 저장 (7일)
    response.cookies.set('user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,  // 7일
      path: '/',
    });

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
    console.error('❌ OAuth 콜백 처리 실패:', error);
    console.error('❌ 에러 상세:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}?error=auth_failed`
    );
  }
}