/**
 * 카테고리별 영상 랭킹 조회 API (v3)
 *
 * GET /api/shorts/ranking?category_id=10&sort_type=views&video_type=shorts&region_code=KR&date=latest
 *
 * v3 변경사항:
 * - category_shorts_snapshot 테이블에서 직접 조회 (누적 수치 기준)
 * - 정렬: view_count / like_count / comment_count
 *
 * video_type:
 *   - shorts: 쇼츠만 (is_shorts = true)
 *   - long: 롱폼만 (is_shorts = false)
 *   - all: 전체 (필터 없음)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase-server';
import {
  getCategoryLabel,
  getRegionLabel,
  getSortLabel,
} from '@/app/lib/constants/shorts-categories';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // ==================== 파라미터 파싱 ====================
  const categoryId = searchParams.get('category_id');
  const sortType = (searchParams.get('sort_type') || 'views') as 'views' | 'likes' | 'comments';
  const regionCode = searchParams.get('region_code') || 'KR';
  const dateParam = searchParams.get('date') || 'latest';
  const videoType = (searchParams.get('video_type') || 'shorts') as 'shorts' | 'long' | 'all';
  const limit = parseInt(searchParams.get('limit') || '100');

  // 필수 파라미터 체크
  if (!categoryId) {
    return NextResponse.json(
      { error: 'category_id is required' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // is_shorts 값 결정
  const isShorts = videoType === 'shorts' ? true : videoType === 'long' ? false : null;

  // ==================== 날짜 결정 ====================
  let snapshotDate: string;

  if (dateParam === 'latest') {
    // 최신 snapshot_date 조회
    let latestQuery = supabase
      .from('category_shorts_snapshot')
      .select('snapshot_date')
      .eq('category_id', categoryId)
      .eq('region_code', regionCode);

    // video_type이 all이 아니면 is_shorts 조건 추가
    if (isShorts !== null) {
      latestQuery = latestQuery.eq('is_shorts', isShorts);
    }

    const { data: latestData, error: latestError } = await latestQuery
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latestData) {
      return NextResponse.json(
        { error: 'No data available for this category' },
        { status: 404 }
      );
    }

    snapshotDate = latestData.snapshot_date;
  } else {
    snapshotDate = dateParam;
  }

  // ==================== 정렬 컬럼 결정 ====================
  const sortColumn =
    sortType === 'views' ? 'view_count' :
    sortType === 'likes' ? 'like_count' :
    'comment_count';

  // ==================== 랭킹 데이터 조회 ====================
  let rankingQuery = supabase
    .from('category_shorts_snapshot')
    .select('*')
    .eq('snapshot_date', snapshotDate)
    .eq('category_id', categoryId)
    .eq('region_code', regionCode)
    .order(sortColumn, { ascending: false })
    .limit(limit);

  // video_type이 all이 아니면 is_shorts 조건 추가
  if (isShorts !== null) {
    rankingQuery = rankingQuery.eq('is_shorts', isShorts);
  }

  const { data: rankings, error: fetchError } = await rankingQuery;

  if (fetchError) {
    return NextResponse.json(
      { error: `Database error: ${fetchError.message}` },
      { status: 500 }
    );
  }

  // ==================== 응답 포맷팅 ====================
  const items = (rankings || []).map((row, index) => ({
    rank: index + 1,  // ORDER BY 결과에서 순서대로 rank 부여
    video_id: row.video_id,
    title: row.title,
    channel_id: row.channel_id,
    channel_title: row.channel_title,
    // 누적 수치
    view_count: row.view_count,
    like_count: row.like_count,
    comment_count: row.comment_count,
    // 메타데이터
    published_at: row.published_at,
    duration_sec: row.duration_sec,
    thumbnail_url: row.thumbnail_url,
    is_shorts: row.is_shorts,
    // 쇼츠면 /shorts/, 롱폼이면 /watch?v=
    youtube_url: row.is_shorts
      ? `https://youtube.com/shorts/${row.video_id}`
      : `https://youtube.com/watch?v=${row.video_id}`,
  }));

  return NextResponse.json({
    metadata: {
      snapshot_date: snapshotDate,
      category_id: categoryId,
      category_label: getCategoryLabel(categoryId),
      sort_type: sortType,
      sort_label: getSortLabel(sortType),
      video_type: videoType,
      video_type_label: videoType === 'shorts' ? '쇼츠' : videoType === 'long' ? '롱폼' : '전체',
      region_code: regionCode,
      region_label: getRegionLabel(regionCode),
      total_count: items.length,
    },
    items,
  });
}
