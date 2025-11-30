/**
 * YouTube 인기 영상 수집 엔진 (v2.4)
 *
 * videos.list(chart=mostPopular)로 카테고리별 인기 영상 수집
 * - 쇼츠(≤120초)와 롱폼(>120초) 모두 한 번에 수집
 * - 최대 4페이지(200개) 페이지네이션
 * - 일간 증가량(daily_metrics) 계산 지원
 */

import { createServerClient } from '@/app/lib/supabase-server';

// ==================== 수집 설정 (v2.3) ====================
const SHORTS_DURATION_THRESHOLD = 120;  // 120초(2분) 이하 = 쇼츠
const MAX_PAGES = 4;                    // 최대 4페이지 (200개)

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
  is_shorts: boolean; // 120초(2분) 이하면 true
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
 * 한국어 포함 여부 체크
 * @param text 검사할 텍스트
 * @returns 한국어가 포함되어 있으면 true
 */
function hasKorean(text: string): boolean {
  // 한글 유니코드 범위:
  // - AC00-D7A3: 한글 음절 (가-힣)
  // - 1100-11FF: 한글 자모
  // - 3130-318F: 한글 호환 자모
  const koreanRegex = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/;
  return koreanRegex.test(text);
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

// ==================== YouTube API 호출 (v2.2) ====================

/**
 * mostPopular 차트에서 쇼츠+롱폼 통합 수집 (v2.4)
 * - 최대 4페이지 (200개) 수집
 * - is_shorts는 duration <= 120초로 자동 판정
 */
async function fetchMostPopularCategoryVideos(
  apiKey: string,
  categoryId: string,
  regionCode: string,
  maxPages: number = MAX_PAGES
): Promise<VideoData[]> {
  const allVideos: VideoData[] = [];
  const seenIds = new Set<string>();
  let pageToken: string | undefined;
  let pagesChecked = 0;
  let shortsCount = 0;
  let longCount = 0;

  console.log(`📊 수집 시작: 카테고리=${categoryId}, 최대 ${maxPages}페이지`);

  while (pagesChecked < maxPages) {
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
    const items: YouTubeVideoDetails[] = data.items || [];

    for (const video of items) {
      if (seenIds.has(video.id)) continue;

      const durationSec = parseDuration(video.contentDetails.duration);
      const title = video.snippet.title;

      seenIds.add(video.id);

      const isShorts = durationSec <= SHORTS_DURATION_THRESHOLD;
      if (isShorts) {
        shortsCount++;
      } else {
        longCount++;
      }

      const thumbnail =
        video.snippet.thumbnails.high?.url ||
        video.snippet.thumbnails.medium?.url ||
        video.snippet.thumbnails.default?.url ||
        '';

      allVideos.push({
        video_id: video.id,
        title: title,
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
        is_shorts: isShorts,
      });
    }

    pageToken = data.nextPageToken;
    pagesChecked++;

    console.log(`  📄 페이지 ${pagesChecked}: 누적 ${allVideos.length}개 (쇼츠 ${shortsCount}, 롱폼 ${longCount})`);

    if (!pageToken) {
      console.log(`  ⚠️ 더 이상 페이지 없음 (총 ${pagesChecked} 페이지)`);
      break;
    }
  }

  console.log(`✅ 수집 완료: 총 ${allVideos.length}개 (쇼츠 ${shortsCount}, 롱폼 ${longCount})`);
  return allVideos;
}

// ==================== 핵심 로직 ====================

/**
 * 카테고리별 인기 영상 수집 (v2.4)
 * - mostPopular 차트에서 최대 200개 수집
 * - is_shorts는 duration <= 120초로 자동 판정
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

  console.log(`📌 수집 시작 (v2.2): 카테고리=${categoryId}, 국가=${regionCode}`);

  // mostPopular 차트에서 쇼츠+롱폼 통합 수집
  const videos = await fetchMostPopularCategoryVideos(apiKey, categoryId, regionCode);

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

// ==================== 일간 증가량 계산 (v2 핵심) ====================

/**
 * 어제 스냅샷과 오늘 스냅샷을 비교해서 일간 증가량 계산
 *
 * @param todayDate 오늘 날짜 (스냅샷 수집일)
 * @param metricDate 증가량 기준 날짜 (보통 어제)
 * @param categoryId 카테고리 ID
 * @param regionCode 지역 코드
 */
export async function calculateDailyMetrics(
  todayDate: string,
  metricDate: string,
  categoryId: string,
  regionCode: string
): Promise<{ shortsCount: number; longCount: number; totalCount: number }> {
  const supabase = createServerClient();

  console.log(`📊 일간 증가량 계산 시작: ${metricDate} 기준 (${categoryId})`);

  // 1. 오늘 스냅샷 조회
  const { data: todaySnap, error: todayError } = await supabase
    .from('category_shorts_snapshot')
    .select('*')
    .eq('snapshot_date', todayDate)
    .eq('category_id', categoryId)
    .eq('region_code', regionCode);

  if (todayError) {
    throw new Error(`오늘 스냅샷 조회 실패: ${todayError.message}`);
  }

  if (!todaySnap || todaySnap.length === 0) {
    console.log(`⚠️ 오늘(${todayDate}) 스냅샷 없음`);
    return { shortsCount: 0, longCount: 0, totalCount: 0 };
  }

  // 2. 어제 스냅샷 조회 (비교용)
  const { data: yesterdaySnap } = await supabase
    .from('category_shorts_snapshot')
    .select('video_id, view_count, like_count, comment_count')
    .eq('snapshot_date', metricDate)
    .eq('category_id', categoryId)
    .eq('region_code', regionCode);

  // 어제 데이터를 Map으로 변환 (빠른 조회용)
  const yesterdayMap = new Map(
    (yesterdaySnap || []).map((v) => [v.video_id, v])
  );

  console.log(`📈 비교: 오늘 ${todaySnap.length}개 vs 어제 ${yesterdayMap.size}개`);

  // 3. 증가량 계산
  const metrics = todaySnap.map((video) => {
    const yesterday = yesterdayMap.get(video.video_id);

    // 어제 데이터 없으면 오늘 수치 그대로 (신규 영상)
    const dailyViewIncrease = yesterday
      ? Math.max(0, video.view_count - yesterday.view_count)
      : video.view_count;
    const dailyLikeIncrease = yesterday
      ? Math.max(0, video.like_count - yesterday.like_count)
      : video.like_count;
    const dailyCommentIncrease = yesterday
      ? Math.max(0, video.comment_count - yesterday.comment_count)
      : video.comment_count;

    return {
      metric_date: metricDate,
      region_code: regionCode,
      category_id: categoryId,
      video_id: video.video_id,

      // 일간 증가량
      daily_view_increase: dailyViewIncrease,
      daily_like_increase: dailyLikeIncrease,
      daily_comment_increase: dailyCommentIncrease,

      // 메타데이터 (조인 없이 바로 표시용)
      title: video.title,
      channel_id: video.channel_id,
      channel_title: video.channel_title,
      thumbnail_url: video.thumbnail_url,
      duration_sec: video.duration_sec,
      is_shorts: video.is_shorts,
      published_at: video.published_at,

      // 누적 수치 (참고용)
      total_view_count: video.view_count,
      total_like_count: video.like_count,
      total_comment_count: video.comment_count,
    };
  });

  // 4. DB 저장
  if (metrics.length > 0) {
    const { error: insertError } = await supabase
      .from('category_shorts_daily_metrics')
      .upsert(metrics, {
        onConflict: 'metric_date,region_code,category_id,video_id',
      });

    if (insertError) {
      throw new Error(`일간 증가량 저장 실패: ${insertError.message}`);
    }
  }

  // 5. 통계 반환
  const shortsCount = metrics.filter((m) => m.is_shorts).length;
  const longCount = metrics.filter((m) => !m.is_shorts).length;

  console.log(`✅ 일간 증가량 저장 완료: ${metrics.length}개 (쇼츠 ${shortsCount}, 롱폼 ${longCount})`);

  return {
    shortsCount,
    longCount,
    totalCount: metrics.length,
  };
}

/**
 * 첫 수집일인 경우: 스냅샷만 저장하고 증가량은 계산하지 않음
 * (어제 데이터가 없으므로)
 */
export function isFirstCollection(yesterdaySnapCount: number): boolean {
  return yesterdaySnapCount === 0;
}
