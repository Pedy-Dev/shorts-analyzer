// get-channel-id/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

    // 3. YouTube Data API로 핸들 → 채널 ID 변환
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('YouTube API 호출 실패');
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: '채널을 찾을 수 없습니다. URL을 확인해주세요.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ channelId: data.items[0].id });
  } catch (error) {
    console.error('채널 ID 변환 오류:', error);
    return NextResponse.json(
      { error: '채널 ID 변환 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}