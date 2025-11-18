// get-channel-id/route.ts
import { NextRequest, NextResponse } from 'next/server';

// API 에러 타입 판별 함수들
function isQuotaError(error: any): boolean {
  if (!error) return false;

  if (error.code === 403 && error.message?.includes('quota')) {
    return true;
  }
  if (error.code === 429) {
    return true;
  }
  if (error.errors?.[0]?.reason === 'quotaExceeded') {
    return true;
  }

  return false;
}

function isInvalidKeyError(error: any): boolean {
  if (!error) return false;

  // 400 에러 + API key 메시지 추가
  if (error.code === 400 && error.message?.includes('API key not valid')) {
    return true;
  }

  // 기존 체크들
  if (error.code === 403 && (error.message?.includes('key') || error.message?.includes('API key'))) {
    return true;
  }
  if (error.code === 401) {
    return true;
  }
  if (error.errors?.[0]?.reason === 'keyInvalid') {
    return true;
  }

  // badRequest reason 추가
  if (error.errors?.[0]?.reason === 'badRequest' && error.message?.includes('API key')) {
    return true;
  }

  // API_KEY_INVALID 체크 추가
  if (error.details?.[0]?.reason === 'API_KEY_INVALID') {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  console.log('===== 환경변수 체크 =====');
  console.log('1. NODE_ENV:', process.env.NODE_ENV);
  console.log('2. 서버 키 존재:', !!process.env.YOUTUBE_API_KEY_SERVER);
  console.log('3. 서버 키 길이:', process.env.YOUTUBE_API_KEY_SERVER?.length);
  console.log('4. 모든 YOUTUBE 환경변수:', Object.keys(process.env).filter(k => k.includes('YOUTUBE')));
  console.log('=========================');
  try {
    const { url, apiKey } = await request.json();

    if (!url || !apiKey) {
      return NextResponse.json(
        { error: 'URL과 API Key가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. URL에서 채널 ID가 직접 있는지 확인
    // 예: youtube.com/channel/UCj1VqrHhDte54oLgPG4xpuQ
    const channelIdMatch = url.match(/\/channel\/(UC[\w-]+)/);
    if (channelIdMatch) {
      return NextResponse.json({ channelId: channelIdMatch[1] });
    }

    // 2. @핸들 형식인지 확인
    // 예: youtube.com/@brandssam 또는 youtube.com/@소식쏭-z4w
    const handleMatch = url.match(/@([^/?&#]+)/);
    if (!handleMatch) {
      return NextResponse.json(
        { error: '올바른 YouTube URL 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // URL 디코딩 (한글 처리)
    const handle = decodeURIComponent(handleMatch[1]);

    // 3. 서버 API 키로 먼저 시도
    const serverApiKey = process.env.YOUTUBE_API_KEY_SERVER;
    if (serverApiKey) {
      try {
        console.log('🔑 서버 API 키로 채널 ID 추출 시도...');
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${serverApiKey}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            console.log('✅ [API 키: 서버] 채널 ID 추출 성공');
            return NextResponse.json({ channelId: data.items[0].id });
          }
        } else {
          const errorData = await response.json();
          if (isQuotaError(errorData.error)) {
            console.log('⚠️ 서버 API 키 할당량 초과, 유저 API 키로 전환...');
          } else {
            // 할당량 초과가 아닌 다른 에러는 throw
            throw new Error('서버 API 키 오류');
          }
        }
      } catch (error: any) {
        // 할당량 초과가 아닌 에러는 로그만 남기고 계속 진행
        if (!error.message?.includes('할당량')) {
          console.error('서버 API 키 오류:', error);
        }
      }
    }

    // 4. 유저 API 키로 폴백
    console.log('🔑 [API 키: 유저] 채널 ID 추출 시도...');
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`
    );

    if (!response.ok) {
      const errorData = await response.json();

      // 에러 타입별 메시지 구분
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        // API 키 에러 체크 (400, 401, 403 모두 가능)
        if (errorData.error?.message?.includes('API key not valid') ||
          errorData.error?.message?.includes('API key') ||
          errorData.error?.details?.[0]?.reason === 'API_KEY_INVALID' ||
          errorData.error?.errors?.[0]?.reason === 'keyInvalid') {
          return NextResponse.json(
            { error: '입력하신 YouTube API 키가 유효하지 않습니다.' },
            { status: 403 }
          );
        }

        // 할당량 초과 체크
        if (errorData.error?.message?.includes('quota') ||
          errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
          return NextResponse.json(
            { error: 'YouTube API 일일 할당량을 초과했습니다. 내일 다시 시도해주세요.' },
            { status: 429 }
          );
        }

        // 기타 403 에러
        if (response.status === 403) {
          return NextResponse.json(
            { error: 'YouTube API 접근이 거부되었습니다. API 키 설정을 확인해주세요.' },
            { status: 403 }
          );
        }
      }

      // 404 체크 (채널을 못 찾는 경우는 보통 200 OK에 items가 비어있음)
      if (response.status === 404) {
        return NextResponse.json(
          { error: '요청한 리소스를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      throw new Error('YouTube API 호출 실패');
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: '채널을 찾을 수 없습니다. URL을 확인해주세요.' },
        { status: 404 }
      );
    }

    console.log('✅ [API 키: 유저] 채널 ID 추출 성공');
    return NextResponse.json({ channelId: data.items[0].id });

  } catch (error) {
    console.error('채널 ID 변환 오류:', error);
    return NextResponse.json(
      { error: '채널 ID 변환 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}