// app/api/search-channels/route.ts
// 채널명으로 YouTube 채널 검색
import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export async function POST(request: NextRequest) {
  try {
    const { query, apiKey } = await request.json();

    if (!query || !apiKey) {
      return NextResponse.json(
        { error: '검색어와 API Key가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('🔍 채널 검색:', query);

    // 1. 서버 API 키로 먼저 시도
    const serverApiKey = process.env.YOUTUBE_API_KEY_SERVER;
    let searchResults = null;

    if (serverApiKey) {
      try {
        console.log('🔑 서버 API 키로 채널 검색 시도...');
        searchResults = await searchChannels(query, serverApiKey);
        console.log('✅ 서버 API 키로 검색 성공');
      } catch (error: any) {
        console.log('⚠️ 서버 API 키 검색 실패, 유저 API 키로 전환...');
      }
    }

    // 2. 서버 키 실패 시 유저 API 키로 폴백
    if (!searchResults) {
      console.log('🔑 유저 API 키로 채널 검색 시도...');
      searchResults = await searchChannels(query, apiKey);
      console.log('✅ 유저 API 키로 검색 성공');
    }

    return NextResponse.json({ channels: searchResults });

  } catch (error: any) {
    console.error('❌ 채널 검색 오류:', error);
    return NextResponse.json(
      { error: error.message || '채널 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function searchChannels(query: string, apiKey: string) {
  // 1단계: 채널 검색
  const searchUrl = `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=5&key=${apiKey}`;

  const searchResponse = await fetch(searchUrl);

  if (!searchResponse.ok) {
    const errorData = await searchResponse.json();
    throw new Error(errorData.error?.message || '채널 검색 실패');
  }

  const searchData = await searchResponse.json();

  if (!searchData.items || searchData.items.length === 0) {
    return [];
  }

  // 2단계: 채널 상세 정보 가져오기 (구독자 수 포함)
  const channelIds = searchData.items.map((item: any) => item.snippet.channelId).join(',');
  const channelsUrl = `${BASE_URL}/channels?part=snippet,statistics&id=${channelIds}&key=${apiKey}`;

  const channelsResponse = await fetch(channelsUrl);

  if (!channelsResponse.ok) {
    const errorData = await channelsResponse.json();
    throw new Error(errorData.error?.message || '채널 정보 조회 실패');
  }

  const channelsData = await channelsResponse.json();

  // 결과 정리
  const channels = channelsData.items.map((channel: any) => ({
    channelId: channel.id,
    title: channel.snippet.title,
    thumbnail: channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url,
    subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
    description: channel.snippet.description,
  }));

  console.log(`✅ ${channels.length}개 채널 검색 완료`);

  return channels;
}
