/**
 * 핫 키워드 조회 API
 *
 * GET /api/keywords/hot?category_id=10&period=daily&region_code=KR&date=latest&sort_by=raw&limit=50
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase-server';
import {
  getCategoryLabel,
  getRegionLabel,
  getPeriodLabel,
} from '@/app/lib/constants/shorts-categories';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // ==================== 파라미터 파싱 ====================
  const categoryId = searchParams.get('category_id');
  const period = (searchParams.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly';
  const regionCode = searchParams.get('region_code') || 'KR';
  const dateParam = searchParams.get('date') || 'latest';
  const sortBy = (searchParams.get('sort_by') || 'raw') as 'raw' | 'trend';
  const limit = parseInt(searchParams.get('limit') || '50');

  // 필수 파라미터 체크
  if (!categoryId) {
    return NextResponse.json(
      { error: 'category_id is required' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // ==================== 날짜 결정 ====================
  let snapshotDate: string;

  if (dateParam === 'latest') {
    const { data: latestData, error: latestError } = await supabase
      .from('category_keywords_trend')
      .select('snapshot_date')
      .eq('category_id', categoryId)
      .eq('period', period)
      .eq('region_code', regionCode)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latestData) {
      return NextResponse.json(
        { error: 'No keyword data available for this category' },
        { status: 404 }
      );
    }

    snapshotDate = latestData.snapshot_date;
  } else {
    snapshotDate = dateParam;
  }

  // ==================== 키워드 데이터 조회 ====================
  const sortColumn = sortBy === 'raw' ? 'raw_score' : 'trend_score';

  const { data: keywords, error: fetchError } = await supabase
    .from('category_keywords_trend')
    .select('*')
    .eq('snapshot_date', snapshotDate)
    .eq('category_id', categoryId)
    .eq('period', period)
    .eq('region_code', regionCode)
    .order(sortColumn, { ascending: false })
    .limit(limit);

  if (fetchError) {
    return NextResponse.json(
      { error: `Database error: ${fetchError.message}` },
      { status: 500 }
    );
  }

  // ==================== 응답 포맷팅 ====================
  const items = (keywords || []).map((row, index) => ({
    rank: index + 1,
    keyword: row.keyword,
    raw_score: Math.round(row.raw_score * 100) / 100, // 소수점 2자리
    trend_score: Math.round(row.trend_score * 100) / 100,
    video_count: row.video_count,
    sample_titles: row.sample_titles || [],
    sample_video_ids: row.sample_video_ids || [],
  }));

  return NextResponse.json({
    metadata: {
      snapshot_date: snapshotDate,
      category_id: categoryId,
      category_label: getCategoryLabel(categoryId),
      period,
      period_label: getPeriodLabel(period),
      region_code: regionCode,
      region_label: getRegionLabel(regionCode),
      sort_by: sortBy,
      total_count: items.length,
    },
    keywords: items,
  });
}
