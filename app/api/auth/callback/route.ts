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
    const rawState = searchParams.get('state') || '';

    // state 디코딩 (base64 JSON)
    let state = 'login';
    let returnUrl = '';
    try {
      const decoded = Buffer.from(rawState, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      state = parsed.type || 'login';
      returnUrl = parsed.returnUrl || '';
    } catch {
      // 이전 버전 호환: state가 단순 문자열인 경우
      state = rawState || 'login';
    }

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
    oauth2Client.setCredentials(tokens);

    let userId: string;
    let userEmail: string | undefined;

    // ⭐ 핵심 변경: state에 따라 다르게 처리
    if (state === 'youtube') {
      // YouTube 채널 연결 시 - 기존 로그인 사용자 확인
      console.log('📌 YouTube 채널 연결 모드');

      // 쿠키에서 기존 로그인 사용자 ID 가져오기
      const existingUserId = request.cookies.get('user_id')?.value;

      if (!existingUserId) {
        console.error('❌ YouTube 연결 시도했으나 로그인되어 있지 않음');
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL}?error=login_required`
        );
      }

      // 기존 사용자 정보 확인
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', existingUserId)
        .single();

      if (userError || !existingUser) {
        console.error('❌ 유효하지 않은 사용자 ID:', existingUserId);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL}?error=invalid_session`
        );
      }

      userId = existingUser.id;
      userEmail = existingUser.email;
      console.log('✅ 기존 로그인 사용자 확인:', { userId, email: userEmail });

    } else {
      // 사이트 로그인 시 - 기존 로직 유지
      console.log('📌 사이트 로그인 모드');

      // Google 사용자 정보 가져오기
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();

      // Supabase에 사용자 정보 저장/업데이트
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', userInfo.id)
        .single();

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

      userEmail = userInfo.email || undefined;
      console.log('✅ 사용자 저장 완료:', { userId, email: userEmail });
    }

    // YouTube 권한 연결인 경우, 토큰과 채널 정보를 DB에 저장
    if (state === 'youtube') {
      console.log('📌 YouTube 토큰 및 채널 정보 저장 중...');

      try {
        // YouTube API로 채널 정보 가져오기
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelsResponse = await youtube.channels.list({
          part: ['snippet', 'contentDetails'],
          mine: true,
        });

        const channel = channelsResponse.data.items?.[0];

        if (channel) {
          // 👇 FIX: user_channels 먼저 확인하여 첫 채널인지 판단
          console.log('📌 기존 채널 확인 중...');

          // 이 사용자의 기존 채널들 확인
          const { data: existingChannels } = await supabase
            .from('user_channels')
            .select('id, youtube_channel_id, is_default')
            .eq('user_id', userId)
            .eq('status', 'active');

          const isFirstChannel = !existingChannels || existingChannels.length === 0;
          const isAlreadyConnected = existingChannels?.some(ch => ch.youtube_channel_id === channel.id);

          console.log(`📌 채널 상태: 첫 채널=${isFirstChannel}, 이미 연결=${isAlreadyConnected}, 기존 채널 수=${existingChannels?.length || 0}`);

          // ⭐ users 테이블 YouTube 필드 제거됨 - user_channels만 사용
          // 모든 YouTube 관련 정보는 user_channels 테이블에서 관리

          // 👇 새 채널이 기본 채널이 될 경우, 기존 채널들의 is_default를 false로
          if (!isAlreadyConnected && !isFirstChannel) {
            console.log('📌 기존 기본 채널의 is_default를 false로 변경...');
            await supabase
              .from('user_channels')
              .update({ is_default: false })
              .eq('user_id', userId)
              .eq('is_default', true);
          }

          // 👇 Phase 2: user_channels 테이블에 저장
          console.log('📌 user_channels 테이블에 채널 정보 저장 중...');

          const { error: channelInsertError } = await supabase
            .from('user_channels')
            .upsert({
              user_id: userId,
              youtube_channel_id: channel.id,
              youtube_channel_title: channel.snippet?.title || null,
              youtube_channel_thumbnail: channel.snippet?.thumbnails?.default?.url || null,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || null,
              scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly'],
              is_default: isFirstChannel,  // 👈 FIX: 첫 채널일 때만 true
              last_used_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,youtube_channel_id',
            });

          if (channelInsertError) {
            console.error('⚠️ user_channels 저장 실패 (계속 진행):', channelInsertError);
            // user_channels 실패해도 계속 진행
          } else {
            console.log('✅ user_channels 저장 완료');
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
    } else if (returnUrl) {
      // returnUrl이 있으면 해당 경로로 리다이렉트
      redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${returnUrl}?auth=success`;
    } else {
      // 사이트 로그인 완료 → 메인 페이지로
      redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}?auth=success`;
    }

    const response = NextResponse.redirect(redirectUrl);

    // ⭐ 핵심 변경: YouTube 연결 시에는 user_id 쿠키를 덮어쓰지 않음
    if (state === 'login') {
      // 사이트 로그인 시에만 user_id 쿠키 설정
      response.cookies.set('user_id', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,  // 7일
        path: '/',
      });

      // 로그인 시 토큰도 저장 (선택사항)
      response.cookies.set('google_access_token', tokens.access_token || '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,  // 7일
        path: '/',
      });

      if (tokens.refresh_token) {
        response.cookies.set('google_refresh_token', tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,  // 30일
          path: '/',
        });
      }
    }
    // state === 'youtube'일 때는 쿠키를 변경하지 않음 (기존 로그인 유지)

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