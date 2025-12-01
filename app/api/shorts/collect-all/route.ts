/**
 * YouTube 인기 영상 전체 수집 API (Vercel Cron용)
 *
 * 매일 KST 23:55에 실행 (UTC 14:55)
 * - 4개국(KR, US, GB, JP) 순차 수집
 * - GET 요청으로 트리거 (Vercel Cron 호환)
 *
 * GET /api/shorts/collect-all
 */

import { NextRequest, NextResponse } from 'next/server';
import { SHORTS_CATEGORIES, REGION_CODES } from '@/app/lib/constants/shorts-categories';
import {
  fetchCategoryVideosRaw,
  saveToSnapshot,
  getTodayKST,
} from '@/app/lib/youtube/shorts-collector';
import { createServerClient } from '@/app/lib/supabase-server';

export const maxDuration = 300; // 5분 타임아웃 (Vercel Pro)
export const dynamic = 'force-dynamic';

interface RegionResult {
  region_code: string;
  region_label: string;
  total_videos: number;
  success_count: number;
  failed_count: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // ==================== 1. 인증 체크 ====================
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cron은 자동으로 Authorization 헤더를 붙여줌
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const snapshotDate = getTodayKST();
  const supabase = createServerClient();

  console.log('🚀 전체 국가 배치 수집 시작');
  console.log(`📅 스냅샷 저장일: ${snapshotDate}`);

  // ==================== 2. 배치 로그 시작 ====================
  const { data: batchLog } = await supabase
    .from('shorts_batch_logs')
    .insert({
      batch_type: 'collect-all',
      snapshot_date: snapshotDate,
      status: 'running',
      metadata: { regions: REGION_CODES.map(r => r.code) },
    })
    .select()
    .single();

  // ==================== 3. 국가별 순차 수집 ====================
  const regionResults: RegionResult[] = [];
  let grandTotalVideos = 0;

  for (const region of REGION_CODES) {
    console.log(`\n🌏 === ${region.flag} ${region.label} (${region.code}) 수집 시작 ===`);

    let regionVideos = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const category of SHORTS_CATEGORIES) {
      try {
        const videos = await fetchCategoryVideosRaw(category.id, region.code);

        if (videos.length > 0) {
          await saveToSnapshot(videos, snapshotDate, category.id, region.code);
          regionVideos += videos.length;
          successCount++;

          const shortsCount = videos.filter(v => v.is_shorts).length;
          const longCount = videos.filter(v => !v.is_shorts).length;
          console.log(`  ✅ ${category.label}: ${videos.length}개 (쇼츠 ${shortsCount}, 롱폼 ${longCount})`);
        } else {
          console.log(`  ⚠️ ${category.label}: 영상 없음`);
          successCount++;
        }

        // API 호출 간격 (쿼터 보호)
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`  ❌ ${category.label} 실패:`, error.message);
        failedCount++;
      }
    }

    regionResults.push({
      region_code: region.code,
      region_label: region.label,
      total_videos: regionVideos,
      success_count: successCount,
      failed_count: failedCount,
    });

    grandTotalVideos += regionVideos;
    console.log(`🏁 ${region.label} 완료: ${regionVideos}개 영상`);

    // 국가 간 간격 (1초)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // ==================== 4. 배치 로그 완료 ====================
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);

  const allSuccess = regionResults.every(r => r.failed_count === 0);
  const finalStatus = allSuccess ? 'success' : 'partial_success';

  if (batchLog) {
    await supabase
      .from('shorts_batch_logs')
      .update({
        completed_at: new Date().toISOString(),
        status: finalStatus,
        metadata: {
          regions: REGION_CODES.map(r => r.code),
          region_results: regionResults,
          grand_total_videos: grandTotalVideos,
          duration_sec: duration,
        },
      })
      .eq('id', batchLog.id);
  }

  // ==================== 5. 응답 ====================
  console.log('\n✅ 전체 배치 수집 완료!');
  console.log(`⏱️ 소요 시간: ${duration}초`);
  console.log(`📹 총 영상 수: ${grandTotalVideos}개`);

  return NextResponse.json({
    success: allSuccess,
    snapshot_date: snapshotDate,
    summary: {
      total_regions: REGION_CODES.length,
      grand_total_videos: grandTotalVideos,
      duration_sec: duration,
    },
    region_results: regionResults,
  });
}
