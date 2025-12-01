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

  // RPC 함수로 distinct 날짜 조회
  const { data, error } = await supabase
    .rpc('get_shorts_snapshot_dates', { p_region_code: regionCode });

  if (error) {
    return NextResponse.json(
      { error: `Database error: ${error.message}` },
      { status: 500 }
    );
  }

  const dates = (data ?? []).map((d: { snapshot_date: string }) => d.snapshot_date);

  return NextResponse.json({
    region_code: regionCode,
    dates,
    total_count: dates.length,
  });
}
