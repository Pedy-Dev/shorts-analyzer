/**
 * YouTube 인기 영상 수집 배치 API (v3)
 *
 * 매일 KST 00:10에 실행 (Vercel Cron)
 * - 스냅샷 저장만 수행 (증가량 계산 제거)
 *
 * POST /api/shorts/collect
 */

import { NextRequest, NextResponse } from 'next/server';
import { SHORTS_CATEGORIES } from '@/app/lib/constants/shorts-categories';
import {
  fetchCategoryVideosRaw,
  saveToSnapshot,
  getTodayKST,
} from '@/app/lib/youtube/shorts-collector';
import { createServerClient } from '@/app/lib/supabase-server';

export const maxDuration = 300; // 5분 타임아웃 (Vercel Pro 필요)
export const dynamic = 'force-dynamic';

interface CollectResult {
  category_id: string;
  category_label: string;
  video_count: number;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ==================== 1. 인증 체크 ====================
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ==================== 2. 파라미터 파싱 ====================
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // body 없으면 기본값 사용
  }

  // v3: 스냅샷만 저장
  const snapshotDate = body.snapshot_date || getTodayKST();
  const regionCode = body.region_code || 'KR';
  const testMode = body.test_mode || false; // 테스트 모드 (1개 카테고리만)
  const categoryFilter = body.category_id; // 특정 카테고리만 수집

  console.log('🚀 배치 수집 시작 (v3)');
  console.log(`📅 스냅샷 저장일: ${snapshotDate}`);
  console.log(`🌏 국가: ${regionCode}`);
  console.log(`🧪 테스트 모드: ${testMode}`);

  // ==================== 3. 배치 로그 시작 ====================
  const supabase = createServerClient();
  const { data: batchLog } = await supabase
    .from('shorts_batch_logs')
    .insert({
      batch_type: 'collect',
      snapshot_date: snapshotDate,
      status: 'running',
      metadata: { region_code: regionCode, test_mode: testMode },
    })
    .select()
    .single();

  // ==================== 4. 카테고리 루프 ====================
  const results: CollectResult[] = [];
  const categoriesToProcess = categoryFilter
    ? SHORTS_CATEGORIES.filter((c) => c.id === categoryFilter)
    : testMode
    ? [SHORTS_CATEGORIES[0]] // 테스트 모드: 첫 번째 카테고리만
    : SHORTS_CATEGORIES;

  let totalVideos = 0;
  let successCount = 0;
  let failedCount = 0;

  for (const category of categoriesToProcess) {
    console.log(`\n📂 카테고리: ${category.label} (ID: ${category.id})`);

    try {
      // 4-1. YouTube API로 인기 영상 수집 (쇼츠 + 롱폼)
      const videos = await fetchCategoryVideosRaw(category.id, regionCode);

      if (videos.length === 0) {
        console.log(`⚠️ 수집된 영상 없음`);
        results.push({
          category_id: category.id,
          category_label: category.label,
          video_count: 0,
          success: true,
        });
        continue;
      }

      // 4-2. DB에 스냅샷 저장
      await saveToSnapshot(videos, snapshotDate, category.id, regionCode);

      const shortsCount = videos.filter(v => v.is_shorts).length;
      const longCount = videos.filter(v => !v.is_shorts).length;

      totalVideos += videos.length;
      successCount++;

      results.push({
        category_id: category.id,
        category_label: category.label,
        video_count: videos.length,
        success: true,
      });

      console.log(`✅ ${category.label} 완료: ${videos.length}개 (쇼츠 ${shortsCount}, 롱폼 ${longCount})`);

      // API 호출 간격 (쿼터 보호)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`❌ ${category.label} 실패:`, error.message);

      failedCount++;
      results.push({
        category_id: category.id,
        category_label: category.label,
        video_count: 0,
        success: false,
        error: error.message,
      });

      // 에러 발생해도 다음 카테고리 계속 진행
      continue;
    }
  }

  // ==================== 5. 배치 로그 완료 ====================
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);

  const finalStatus = failedCount === 0 ? 'success' : 'partial_success';

  if (batchLog) {
    await supabase
      .from('shorts_batch_logs')
      .update({
        completed_at: new Date().toISOString(),
        status: finalStatus,
        metadata: {
          region_code: regionCode,
          test_mode: testMode,
          total_categories: categoriesToProcess.length,
          success_count: successCount,
          failed_count: failedCount,
          total_videos: totalVideos,
          duration_sec: duration,
        },
      })
      .eq('id', batchLog.id);
  }

  // ==================== 6. 응답 ====================
  console.log('\n✅ 배치 수집 완료!');
  console.log(`⏱️ 소요 시간: ${duration}초`);
  console.log(`📊 성공: ${successCount} / 실패: ${failedCount}`);
  console.log(`📹 총 영상 수: ${totalVideos}개`);

  return NextResponse.json({
    success: failedCount === 0,
    snapshot_date: snapshotDate,
    region_code: regionCode,
    summary: {
      total_categories: categoriesToProcess.length,
      success_count: successCount,
      failed_count: failedCount,
      total_videos: totalVideos,
      duration_sec: duration,
    },
    results,
  });
}

// ==================== 수동 트리거용 GET ====================
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'YouTube Shorts 수집 배치 API',
    usage: 'POST 요청으로 실행하세요',
    test_command: `
curl -X POST http://localhost:3000/api/shorts/collect \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${CRON_SECRET}" \\
  -d '{"test_mode": true}'
    `.trim(),
  });
}
