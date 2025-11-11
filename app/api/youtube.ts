//\app\api\youtube.ts
// // YouTube API 기본 설정
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// 채널 ID 추출하기
export async function getChannelId(channelUrl: string, apiKey: string): Promise<string | null> {
  try {
    // URL에서 채널 핸들(@username) 또는 ID 추출
    const handleMatch = channelUrl.match(/@([^\/\?]+)/);
    const idMatch = channelUrl.match(/channel\/([^\/\?]+)/);
    
    if (handleMatch) {
      // @username 형식
      const handle = handleMatch[1];
      const response = await fetch(
        `${BASE_URL}/search?part=snippet&type=channel&q=${handle}&key=${apiKey}`
      );
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return data.items[0].snippet.channelId;
      }
    } else if (idMatch) {
      // channel/ID 형식
      return idMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('채널 ID 추출 실패:', error);
    return null;
  }
}

// 채널의 쇼츠 영상 가져오기
export async function getChannelShorts(channelId: string, apiKey: string, maxResults: number = 50) {
  try {
    // Search API로 쇼츠만 직접 검색
    const searchResponse = await fetch(
      `${BASE_URL}/search?part=snippet&channelId=${channelId}&type=video&videoDuration=short&maxResults=${maxResults}&order=date&key=${apiKey}`
    );
    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return []; // 쇼츠가 없으면 빈 배열 반환
    }
    
    // 비디오 ID들 추출
    const videoIds = searchData.items
      .map((item: any) => item.id.videoId)
      .join(',');
    
    // 상세 정보 가져오기 (조회수, 좋아요 등)
    const videosResponse = await fetch(
      `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`
    );
    const videosData = await videosResponse.json();
    
    // 필요한 정보만 추출
    return videosData.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      publishedAt: video.snippet.publishedAt,
      views: parseInt(video.statistics.viewCount || 0),
      likes: parseInt(video.statistics.likeCount || 0),
      comments: parseInt(video.statistics.commentCount || 0),
      duration: parseDuration(video.contentDetails.duration),
      thumbnail: video.snippet.thumbnails.default.url,
      tags: video.snippet.tags ? video.snippet.tags.length : 0, 
      tagList: video.snippet.tags || [], // ✅ 태그 배열 추가
    }));
    
  } catch (error) {
    console.error('쇼츠 가져오기 실패:', error);
    throw error;
  }
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

// 날짜를 "X일 전" 형식으로 변환
export function formatDate(dateString: string): string {
  const now = new Date();
  const published = new Date(dateString);
  const diffMs = now.getTime() - published.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '1일 전';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
}

// 자막 추출 함수 (API Route 호출) - subtitle route는 API 키 필요 없음
export async function getSubtitle(videoId: string): Promise<string | null> {
  try {
    // GET 요청: videoId만 전달
    const response = await fetch(`/api/subtitle?videoId=${videoId}`);

    if (!response.ok) {
      console.error('자막 API 응답 에러:', response.status);
      return null;
    }

    const data = await response.json();

    // route.ts의 응답 형식: { subtitle: string } 또는 { error: string }
    if (data.subtitle) {
      return data.subtitle;
    } else {
      console.log('자막 없음:', data.error || '알 수 없는 오류');
      return null;
    }
  } catch (error) {
    console.error('자막 추출 API 호출 실패:', error);
    return null;
  }
}