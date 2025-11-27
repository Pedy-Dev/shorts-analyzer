/**
 * YouTube Shorts 수집 엔진
 * YouTube Data API로 카테고리별 쇼츠 TOP 100 수집
 */

import { createServerClient } from '@/app/lib/supabase-server';

// ==================== 타입 정의 ====================

export interface ShortVideo {
  video_id: string;
  title: string;
  description: string;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string; // ISO string
  duration_sec: number;
  channel_id: string;
  channel_title: string;
  thumbnail_url: string;
}

interface YouTubeSearchResult {
  kind: string;
  etag: string;
  id: { videoId: string };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      high: { url: string };
    };
    channelTitle: string;
  };
}

interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    description: string;
    tags?: string[];
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high: { url: string };
    };
  };
  contentDetails: {
    duration: string; // ISO 8601 format (PT1M23S)
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
}

// ==================== 헬퍼 함수 ====================

/**
 * YouTube duration 포맷 파싱 (PT1M23S → 83초)
 */
export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 배열을 N개씩 나누기 (YouTube API는 한 번에 50개까지)
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * KST 기준 어제 날짜 (YYYY-MM-DD)
 */
export function getYesterdayKST(): string {
  const now = new Date();
  const kstOffset = 9 * 60; // KST는 UTC+9
  const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
  kstTime.setDate(kstTime.getDate() - 1); // 어제
  return kstTime.toISOString().split('T')[0];
}

// ==================== YouTube API 호출 ====================

/**
 * 페이지 토큰으로 다음 페이지 검색 (한국 인기 영상)
 */
async function searchShortsWithPagination(
  apiKey: string,
  categoryId: string,
  regionCode: string,
  publishedAfter: string,
  totalNeeded: number = 150
): Promise<string[]> {
  const videoIds: string[] = [];
  let pageToken: string | undefined;
  let pagesChecked = 0;
  const maxPages = Math.ceil(totalNeeded / 50);

  while (videoIds.length < totalNeeded && pagesChecked < maxPages) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('videoCategoryId', categoryId);
    url.searchParams.set('videoDuration', 'short');
    url.searchParams.set('regionCode', regionCode);
    url.searchParams.set('publishedAfter', publishedAfter);
    url.searchParams.set('order', 'viewCount');
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', apiKey);

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('❌ YouTube search API error:', await response.text());
      break;
    }

    const data = await response.json();
    const items = data.items || [];

    items.forEach((item: YouTubeSearchResult) => {
      if (item.id?.videoId) {
        videoIds.push(item.id.videoId);
      }
    });

    pageToken = data.nextPageToken;
    pagesChecked++;

    if (!pageToken) break; // 더 이상 페이지 없음
  }

  return videoIds;
}

/**
 * 영상 ID 목록으로 상세 정보 조회
 */
async function fetchVideoDetails(
  apiKey: string,
  videoIds: string[]
): Promise<YouTubeVideoDetails[]> {
  const chunks = chunkArray(videoIds, 50); // YouTube API는 한 번에 50개까지
  const allVideos: YouTubeVideoDetails[] = [];

  for (const chunk of chunks) {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails,statistics');
    url.searchParams.set('id', chunk.join(','));
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API videos.list error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    allVideos.push(...(data.items || []));
  }

  return allVideos;
}

/**
 * 채널 ID 목록으로 채널 정보 조회 (country 확인용)
 */
async function fetchChannelDetails(
  apiKey: string,
  channelIds: string[]
): Promise<Map<string, string>> {
  const chunks = chunkArray([...new Set(channelIds)], 50); // 중복 제거 + 50개씩 나누기
  const channelCountryMap = new Map<string, string>();

  for (const chunk of chunks) {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('id', chunk.join(','));
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('❌ channels.list API error:', await response.text());
      continue;
    }

    const data = await response.json();
    const channels = data.items || [];

    channels.forEach((channel: any) => {
      const country = channel.snippet?.country || '';
      channelCountryMap.set(channel.id, country);
    });
  }

  return channelCountryMap;
}

// ==================== 핵심 로직 ====================

/**
 * 카테고리별 쇼츠 원본 데이터 수집
 * @returns 61초 이하 쇼츠만 필터링된 배열 (최대 100개)
 */
export async function fetchCategoryShortsRaw(
  categoryId: string,
  regionCode: string = 'KR',
  daysBack: number = 30
): Promise<ShortVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY_SERVER;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY_SERVER 환경변수가 설정되지 않았습니다');
  }

  // 1. publishedAfter 계산 (30일 전)
  const publishedAfter = new Date();
  publishedAfter.setDate(publishedAfter.getDate() - daysBack);
  const publishedAfterISO = publishedAfter.toISOString();

  console.log(`📌 수집 시작: 카테고리=${categoryId}, 국가=${regionCode}, 기간=${daysBack}일`);

  // 2. search.list로 영상 ID 수집 (페이지네이션)
  const videoIds = await searchShortsWithPagination(
    apiKey,
    categoryId,
    regionCode,
    publishedAfterISO,
    150 // 여유있게 150개 수집 후 필터링
  );

  console.log(`📹 검색 결과: ${videoIds.length}개 영상`);

  if (videoIds.length === 0) {
    return [];
  }

  // 3. videos.list로 상세 정보 조회
  const videoDetails = await fetchVideoDetails(apiKey, videoIds);

  // 4. 채널 ID 목록 추출
  const channelIds = videoDetails.map((video) => video.snippet.channelId);

  // 5. 채널 정보 조회 (country 확인)
  console.log(`🔍 채널 정보 조회 중... (${new Set(channelIds).size}개 고유 채널)`);
  const channelCountryMap = await fetchChannelDetails(apiKey, channelIds);

  // 6. 한국 채널 필터링
  const koreanChannelIds = new Set<string>();
  channelCountryMap.forEach((country, channelId) => {
    if (country === 'KR') {
      koreanChannelIds.add(channelId);
    }
  });

  console.log(`🇰🇷 한국 채널: ${koreanChannelIds.size}개 / 전체 ${new Set(channelIds).size}개`);

  // 7. 한국 채널 영상만 + 61초 이하만 필터링 + 데이터 변환
  const shorts: ShortVideo[] = videoDetails
    .filter((video) => koreanChannelIds.has(video.snippet.channelId)) // 한국 채널만
    .map((video) => {
      const durationSec = parseDuration(video.contentDetails.duration);

      return {
        video_id: video.id,
        title: video.snippet.title,
        description: video.snippet.description || '',
        tags: video.snippet.tags || [],
        view_count: parseInt(video.statistics.viewCount || '0'),
        like_count: parseInt(video.statistics.likeCount || '0'),
        comment_count: parseInt(video.statistics.commentCount || '0'),
        published_at: video.snippet.publishedAt,
        duration_sec: durationSec,
        channel_id: video.snippet.channelId,
        channel_title: video.snippet.channelTitle,
        thumbnail_url: video.snippet.thumbnails.high.url,
      };
    })
    .filter((video) => video.duration_sec <= 61 && video.duration_sec >= 10) // 10~61초만
    .sort((a, b) => b.view_count - a.view_count) // 조회수 정렬
    .slice(0, 100); // TOP 100만

  console.log(`✅ 쇼츠 필터링 완료: ${shorts.length}개 (한국 채널 + 61초 이하)`);

  return shorts;
}

/**
 * Supabase에 스냅샷 저장
 */
export async function saveToSnapshot(
  videos: ShortVideo[],
  snapshotDate: string,
  categoryId: string,
  regionCode: string
): Promise<void> {
  const supabase = createServerClient();

  const rows = videos.map((video) => ({
    snapshot_date: snapshotDate,
    region_code: regionCode,
    category_id: categoryId,
    video_id: video.video_id,
    title: video.title,
    description: video.description,
    tags: video.tags,
    view_count: video.view_count,
    like_count: video.like_count,
    comment_count: video.comment_count,
    published_at: video.published_at,
    duration_sec: video.duration_sec,
    channel_id: video.channel_id,
    channel_title: video.channel_title,
    thumbnail_url: video.thumbnail_url,
  }));

  const { error } = await supabase.from('category_shorts_snapshot').upsert(rows, {
    onConflict: 'snapshot_date,region_code,category_id,video_id',
  });

  if (error) {
    throw new Error(`Supabase insert error: ${error.message}`);
  }

  console.log(`💾 DB 저장 완료: ${rows.length}개 영상`);
}

/**
 * 스냅샷에서 기간별 랭킹 계산 후 저장
 */
export async function calculateRankings(
  snapshotDate: string,
  categoryId: string,
  regionCode: string
): Promise<void> {
  const supabase = createServerClient();

  // 1. 해당 카테고리의 스냅샷 데이터 조회
  const { data: snapshots, error: fetchError } = await supabase
    .from('category_shorts_snapshot')
    .select('*')
    .eq('snapshot_date', snapshotDate)
    .eq('category_id', categoryId)
    .eq('region_code', regionCode);

  if (fetchError || !snapshots) {
    throw new Error(`스냅샷 조회 실패: ${fetchError?.message}`);
  }

  console.log(`📊 랭킹 계산 시작: ${snapshots.length}개 영상`);

  // 2. 기간별 필터링 함수
  const filterByPeriod = (period: 'daily' | 'weekly' | 'monthly') => {
    const snapshotDateObj = new Date(snapshotDate);

    return snapshots.filter((video) => {
      const publishedDate = new Date(video.published_at);

      if (period === 'daily') {
        // 당일 업로드
        return publishedDate.toISOString().split('T')[0] === snapshotDate;
      } else if (period === 'weekly') {
        // 최근 7일
        const weekAgo = new Date(snapshotDateObj);
        weekAgo.setDate(weekAgo.getDate() - 6);
        return publishedDate >= weekAgo && publishedDate <= snapshotDateObj;
      } else {
        // 최근 30일
        const monthAgo = new Date(snapshotDateObj);
        monthAgo.setDate(monthAgo.getDate() - 29);
        return publishedDate >= monthAgo && publishedDate <= snapshotDateObj;
      }
    });
  };

  // 3. 정렬 함수
  const sortBy = (videos: typeof snapshots, sortType: 'views' | 'likes' | 'comments') => {
    return [...videos].sort((a, b) => {
      if (sortType === 'views') return b.view_count - a.view_count;
      if (sortType === 'likes') return b.like_count - a.like_count;
      return b.comment_count - a.comment_count;
    });
  };

  // 4. 랭킹 데이터 생성
  const rankingRows: any[] = [];
  const periods: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
  const sortTypes: Array<'views' | 'likes' | 'comments'> = ['views', 'likes', 'comments'];

  for (const period of periods) {
    const filtered = filterByPeriod(period);

    for (const sortType of sortTypes) {
      const sorted = sortBy(filtered, sortType);
      const top100 = sorted.slice(0, 100);

      top100.forEach((video, index) => {
        rankingRows.push({
          snapshot_date: snapshotDate,
          region_code: regionCode,
          category_id: categoryId,
          period,
          sort_type: sortType,
          rank: index + 1,
          video_id: video.video_id,
          title: video.title,
          channel_id: video.channel_id,
          channel_title: video.channel_title,
          view_count: video.view_count,
          like_count: video.like_count,
          comment_count: video.comment_count,
          published_at: video.published_at,
          duration_sec: video.duration_sec,
          thumbnail_url: video.thumbnail_url,
        });
      });
    }
  }

  // 5. DB 저장
  if (rankingRows.length > 0) {
    const { error: insertError } = await supabase.from('category_shorts_ranking').upsert(rankingRows, {
      onConflict: 'snapshot_date,region_code,category_id,period,sort_type,rank',
    });

    if (insertError) {
      throw new Error(`랭킹 저장 실패: ${insertError.message}`);
    }
  }

  console.log(`✅ 랭킹 계산 완료: ${rankingRows.length}개 랭킹 저장`);
}
