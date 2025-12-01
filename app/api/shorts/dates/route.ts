/**
 * 사용 가능한 스냅샷 날짜 목록 조회 API
 *
 * GET /api/shorts/dates?region_code=KR
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get('region_code') || 'KR';

  const supabase = createServerClient();

  // 해당 국가의 모든 스냅샷 날짜 조회 (중복 제거, 최신순)
  const { data, error } = await supabase
    .from('category_shorts_snapshot')
    .select('snapshot_date')
    .eq('region_code', regionCode)
    .order('snapshot_date', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Database error: ${error.message}` },
      { status: 500 }
    );
  }

  // 중복 제거
  const uniqueDates = [...new Set(data?.map(d => d.snapshot_date) || [])];

  return NextResponse.json({
    region_code: regionCode,
    dates: uniqueDates,
    total_count: uniqueDates.length,
  });
}
