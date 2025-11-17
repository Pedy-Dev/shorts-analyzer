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
  
  if (error.code === 403 && (error.message?.includes('key') || error.message?.includes('API key'))) {
    return true;
  }
  if (error.code === 401) {
    return true;
  }
  if (error.errors?.[0]?.reason === 'keyInvalid') {
    return true;
  }
  
  return false;
}

// ISO 8601 duration을 초로 변환 (PT1M30S → 90)
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

// 실제 쇼츠 가져오기 로직
async function fetchShortsWithKey(channelId: string, apiKey: string, maxResults: number) {
  const BASE_URL = 'https://www.googleapis.com/youtube/v3';
  
  try {
    // 1단계: 채널의 업로드 재생목록 ID 가져오기
    const channelResponse = await fetch(
      `${BASE_URL}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
    );
    
    if (!channelResponse.ok) {
      const errorData = await channelResponse.json();
      
      if (channelResponse.status === 403 || channelResponse.status === 401) {
        if (isInvalidKeyError(errorData.error)) {
          throw { code: 403, message: 'Invalid API key' };
        } else if (isQuotaError(errorData.error)) {
          throw { code: 403, message: 'quota exceeded' };
        }
      }
      
      throw new Error(errorData.error?.message || 'YouTube API 요청 실패');
    }
    
    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('채널을 찾을 수 없습니다');
    }
    
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    
    // 2단계: 페이지네이션으로 쇼츠 수집
    const collectedShorts: any[] = [];
    let nextPageToken: string | null = null;
    let pageCount = 0;
    const MAX_PAGES = 10; // 무한루프 방지
    
    console.log(`🎯 목표: 쇼츠 ${maxResults}개 수집`);
    
    while (collectedShorts.length < maxResults && pageCount < MAX_PAGES) {
      pageCount++;
      
      // playlistItems API로 50개씩 가져오기
      let playlistUrl = `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`;
      if (nextPageToken) {
        playlistUrl += `&pageToken=${nextPageToken}`;
      }
      
      const playlistResponse = await fetch(playlistUrl);
      
      if (!playlistResponse.ok) {
        const errorData = await playlistResponse.json();
        
        if (playlistResponse.status === 403 || playlistResponse.status === 401) {
          if (isInvalidKeyError(errorData.error)) {
            throw { code: 403, message: 'Invalid API key' };
          } else if (isQuotaError(errorData.error)) {
            throw { code: 403, message: 'quota exceeded' };
          }
        }
        
        throw new Error(errorData.error?.message || 'YouTube API 요청 실패');
      }
      
      const playlistData = await playlistResponse.json();
      
      if (!playlistData.items || playlistData.items.length === 0) {
        console.log('❌ 더 이상 영상이 없습니다');
        break;
      }
      
      // 비디오 ID들 추출
      const videoIds = playlistData.items
        .map((item: any) => item.contentDetails.videoId)
        .join(',');
      
      // videos API로 상세 정보 가져오기
      const videosResponse = await fetch(
        `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`
      );
      
      if (!videosResponse.ok) {
        const errorData = await videosResponse.json();
        
        if (videosResponse.status === 403 || videosResponse.status === 401) {
          if (isInvalidKeyError(errorData.error)) {
            throw { code: 403, message: 'Invalid API key' };
          } else if (isQuotaError(errorData.error)) {
            throw { code: 403, message: 'quota exceeded' };
          }
        }
        
        throw new Error(errorData.error?.message || 'YouTube API 요청 실패');
      }
      
      const videosData = await videosResponse.json();
      
      // 61초 이하만 필터링 (쇼츠)
      const shortsInThisPage = videosData.items.filter((video: any) => {
        const duration = video.contentDetails.duration;
        const seconds = parseDuration(duration);
        return seconds <= 61;
      });
      
      // 쇼츠 추가
      shortsInThisPage.forEach((video: any) => {
        if (collectedShorts.length < maxResults) {
          collectedShorts.push({
            id: video.id,
            title: video.snippet.title,
            publishedAt: video.snippet.publishedAt,
            views: parseInt(video.statistics.viewCount || 0),
            likes: parseInt(video.statistics.likeCount || 0),
            comments: parseInt(video.statistics.commentCount || 0),
            duration: parseDuration(video.contentDetails.duration),
            thumbnail: video.snippet.thumbnails.default.url,
            tags: video.snippet.tags ? video.snippet.tags.length : 0,
            tagList: video.snippet.tags || [],
          });
        }
      });
      
      console.log(`📄 [페이지 ${pageCount}] 이 페이지에서 쇼츠 ${shortsInThisPage.length}개 발견 → 현재 총 ${collectedShorts.length}개`);
      
      // 다음 페이지 토큰
      nextPageToken = playlistData.nextPageToken || null;
      
      // 다음 페이지가 없으면 중단
      if (!nextPageToken) {
        console.log('✅ 모든 영상을 확인했습니다');
        break;
      }
      
      // 목표 개수 달성하면 중단
      if (collectedShorts.length >= maxResults) {
        console.log(`✅ 목표 달성! 쇼츠 ${collectedShorts.length}개 수집 완료`);
        break;
      }
    }
    
    if (collectedShorts.length === 0) {
      throw new Error('Shorts 영상을 찾을 수 없습니다');
    }
    
    return collectedShorts;
    
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { channelId, apiKey, maxResults = 50 } = await request.json();

    if (!channelId || !apiKey) {
      return NextResponse.json(
        { error: '채널 ID와 API Key가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 서버 API 키로 먼저 시도
    const serverApiKey = process.env.YOUTUBE_API_KEY_SERVER;
    if (serverApiKey) {
      try {
        console.log('🔑 서버 API 키로 쇼츠 목록 가져오기 시도...');
        const shorts = await fetchShortsWithKey(channelId, serverApiKey, maxResults);
        console.log('✅ [API 키: 서버] 쇼츠 목록 가져오기 성공');
        return NextResponse.json({ shorts });
      } catch (error: any) {
        if (isQuotaError(error)) {
          console.log('⚠️ 서버 API 키 할당량 초과, 유저 API 키로 전환...');
        } else {
          console.error('서버 API 키 오류:', error);
        }
      }
    }

    // 2. 유저 API 키로 폴백
    console.log('🔑 유저 API 키로 쇼츠 목록 가져오기 시도...');
    const shorts = await fetchShortsWithKey(channelId, apiKey, maxResults);
    console.log('✅ 유저 API 키로 쇼츠 목록 가져오기 성공');
    return NextResponse.json({ shorts });

  } catch (error: any) {
    console.error('쇼츠 가져오기 오류:', error);
    
    // 에러 타입별 메시지 구분
    if (isInvalidKeyError(error)) {
      return NextResponse.json(
        { error: '입력하신 YouTube API 키가 유효하지 않습니다.' },
        { status: 403 }
      );
    } else if (isQuotaError(error)) {
      return NextResponse.json(
        { error: 'YouTube API 일일 할당량을 초과했습니다. 내일 다시 시도해주세요.' },
        { status: 429 }
      );
    } else if (error.message === '채널을 찾을 수 없습니다') {
      return NextResponse.json(
        { error: '채널을 찾을 수 없습니다. 채널 ID를 확인해주세요.' },
        { status: 404 }
      );
    } else if (error.message === 'Shorts 영상을 찾을 수 없습니다') {
      return NextResponse.json(
        { error: '이 채널에서 Shorts 영상을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: '쇼츠 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}