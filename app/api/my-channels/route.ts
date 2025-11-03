// app/api/my-channels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('google_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    // 내 채널 목록 가져오기
    console.log('📌 채널 목록 가져오는 중...');
    const channelsResponse = await youtube.channels.list({
      part: ['id', 'snippet', 'statistics'],
      mine: true,
      maxResults: 50,
    });

    const channels = channelsResponse.data.items || [];

    if (channels.length === 0) {
      return NextResponse.json(
        { error: '채널을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    console.log(`✅ ${channels.length}개 채널 발견!`);

    // 채널 정보 포맷팅
    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      title: channel.snippet?.title,
      description: channel.snippet?.description,
      thumbnail: channel.snippet?.thumbnails?.default?.url,
      customUrl: channel.snippet?.customUrl,
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
    }));

    return NextResponse.json({
      success: true,
      channels: formattedChannels,
    });

  } catch (error: any) {
    console.error('❌ 채널 목록 가져오기 실패:', error);
    
    if (error.code === 401) {
      return NextResponse.json(
        { error: '로그인이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: '채널 목록 가져오기 실패',
        details: error.message 
      },
      { status: 500 }
    );
  }
}