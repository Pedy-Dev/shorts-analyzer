/**
 * YouTube 인기 영상 수집 엔진
 * videos.list(chart=mostPopular)로 카테고리별 인기 영상 수집
 * 쇼츠(≤180초)와 롱폼(>180초) 모두 수집
 */

import { createServerClient } from '@/app/lib/supabase-server';

// ==================== 타입 정의 ====================

export interface VideoData {
  video_id: string;
  title: string;
  description: string;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  duration_sec: number;
  channel_id: string;
  channel_title: string;
  thumbnail_url: string;
  is_shorts: boolean; // 180초(3분) 이하면 true
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
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
  contentDetails: {
    duration: string;
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
 * KST 기준 어제 날짜 (YYYY-MM-DD)
 */
export function getYesterdayKST(): string {
  const now = new Date();
  const kstOffset = 9 * 60;
  const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
  kstTime.setDate(kstTime.getDate() - 1);
  return kstTime.toISOString().split('T')[0];
}

/**
 * KST 기준 오늘 날짜 (YYYY-MM-DD)
 */
export function getTodayKST(): string {
  const now = new Date();
  const kstOffset = 9 * 60;
  const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
  return kstTime.toISOString().split('T')[0];
}

// ==================== YouTube API 호출 ====================

/**
 * YouTube 인기 동영상 차트 조회 (chart=mostPopular)
 * 해당 지역에서 실제로 인기있는 영상을 가져옴
 */
async function fetchMostPopularVideos(
  apiKey: string,
  categoryId: string,
  regionCode: string,
  totalNeeded: number = 200
): Promise<YouTubeVideoDetails[]> {
  const allVideos: YouTubeVideoDetails[] = [];
  let pageToken: string | undefined;
  let pagesChecked = 0;
  const maxPages = Math.ceil(totalNeeded / 50);

  while (allVideos.length < totalNeeded && pagesChecked < maxPages) {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails,statistics');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('regionCode', regionCode);
    url.searchParams.set('videoCategoryId', categoryId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', apiKey);

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ YouTube videos.list API error (category ${categoryId}):`, errorText);
      break;
    }

    const data = await response.json();
    const items = data.items || [];

    allVideos.push(...items);

    pageToken = data.nextPageToken;
    pagesChecked++;

    if (!pageToken) break;
  }

  console.log(`📊 mostPopular 조회: ${allVideos.length}개 영상 (카테고리 ${categoryId})`);
  return allVideos;
}

// ==================== 핵심 로직 ====================

/**
 * 카테고리별 인기 영상 수집 (쇼츠 + 롱폼 전체)
 * @returns is_shorts 플래그가 포함된 영상 배열
 */
export async function fetchCategoryVideosRaw(
  categoryId: string,
  regionCode: string = 'KR'
): Promise<VideoData[]> {
  const apiKey = process.env.YOUTUBE_API_KEY_SERVER;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY_SERVER 환경변수가 설정되지 않았습니다');
  }

  console.log(`📌 수집 시작: 카테고리=${categoryId}, 국가=${regionCode}`);

  // 1. videos.list(chart=mostPopular)로 인기 영상 조회
  const videoDetails = await fetchMostPopularVideos(apiKey, categoryId, regionCode, 200);

  if (videoDetails.length === 0) {
    console.log(`⚠️ 카테고리 ${categoryId}: 영상 없음`);
    return [];
  }

  // 2. 데이터 변환 + is_shorts 플래그 추가
  const videos: VideoData[] = videoDetails.map((video) => {
    const durationSec = parseDuration(video.contentDetails.duration);
    const thumbnail =
      video.snippet.thumbnails.high?.url ||
      video.snippet.thumbnails.medium?.url ||
      video.snippet.thumbnails.default?.url ||
      '';

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
      thumbnail_url: thumbnail,
      is_shorts: durationSec <= 180, // 180초(3분) 이하면 쇼츠
    };
  });

  const shortsCount = videos.filter((v) => v.is_shorts).length;
  const longCount = videos.filter((v) => !v.is_shorts).length;

  console.log(`✅ 수집 완료: 총 ${videos.length}개 (쇼츠 ${shortsCount}개, 롱폼 ${longCount}개)`);

  return videos;
}

/**
 * Supabase에 스냅샷 저장 (is_shorts 포함)
 */
export async function saveToSnapshot(
  videos: VideoData[],
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
    is_shorts: video.is_shorts,
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
 * 스냅샷에서 기간별 + is_shorts별 랭킹 계산 후 저장
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
  const filterByPeriod = (videos: typeof snapshots, period: 'daily' | 'weekly' | 'monthly') => {
    const snapshotDateObj = new Date(snapshotDate);

    return videos.filter((video) => {
      const publishedDate = new Date(video.published_at);

      if (period === 'daily') {
        return publishedDate.toISOString().split('T')[0] === snapshotDate;
      } else if (period === 'weekly') {
        const weekAgo = new Date(snapshotDateObj);
        weekAgo.setDate(weekAgo.getDate() - 6);
        return publishedDate >= weekAgo && publishedDate <= snapshotDateObj;
      } else {
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

  // 4. 랭킹 데이터 생성 (is_shorts별로 분리)
  const rankingRows: any[] = [];
  const periods: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
  const sortTypes: Array<'views' | 'likes' | 'comments'> = ['views', 'likes', 'comments'];
  const videoTypes: Array<boolean> = [true, false]; // true=쇼츠, false=롱폼

  for (const period of periods) {
    for (const sortType of sortTypes) {
      for (const isShorts of videoTypes) {
        // is_shorts 별로 필터링
        const typeFiltered = snapshots.filter((v) => v.is_shorts === isShorts);
        const periodFiltered = filterByPeriod(typeFiltered, period);
        const sorted = sortBy(periodFiltered, sortType);
        const top100 = sorted.slice(0, 100);

        top100.forEach((video, index) => {
          rankingRows.push({
            snapshot_date: snapshotDate,
            region_code: regionCode,
            category_id: categoryId,
            period,
            sort_type: sortType,
            is_shorts: isShorts,
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
  }

  // 5. DB 저장
  if (rankingRows.length > 0) {
    const { error: insertError } = await supabase.from('category_shorts_ranking').upsert(rankingRows, {
      onConflict: 'snapshot_date,region_code,category_id,period,sort_type,is_shorts,rank',
    });

    if (insertError) {
      throw new Error(`랭킹 저장 실패: ${insertError.message}`);
    }
  }

  const shortsRankings = rankingRows.filter((r) => r.is_shorts).length;
  const longRankings = rankingRows.filter((r) => !r.is_shorts).length;

  console.log(`✅ 랭킹 계산 완료: 총 ${rankingRows.length}개 (쇼츠 ${shortsRankings}, 롱폼 ${longRankings})`);
}
