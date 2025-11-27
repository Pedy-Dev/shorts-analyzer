/**
 * 키워드 분석 배치 API
 * 수집된 쇼츠 데이터에서 핫 키워드 추출
 *
 * POST /api/keywords/analyze
 */

import { NextRequest, NextResponse } from 'next/server';
import { SHORTS_CATEGORIES } from '@/app/lib/constants/shorts-categories';
import { extractKeywordsForCategory } from '@/app/lib/keywords/analyzer';
import { getYesterdayKST } from '@/app/lib/youtube/shorts-collector';
import { createServerClient } from '@/app/lib/supabase-server';

export const maxDuration = 300; // 5분 타임아웃
export const dynamic = 'force-dynamic';

interface AnalyzeResult {
  category_id: string;
  category_label: string;
  daily_keywords: number;
  weekly_keywords: number;
  monthly_keywords: number;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ==================== 1. 인증 체크 ====================
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ==================== 2. 파라미터 파싱 ====================
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // body 없으면 기본값
  }

  const snapshotDate = body.snapshot_date || getYesterdayKST();
  const regionCode = body.region_code || 'KR';
  const testMode = body.test_mode || false;
  const categoryFilter = body.category_id;

  console.log('🧠 키워드 분석 배치 시작');
  console.log(`📅 기준일: ${snapshotDate}`);
  console.log(`🌏 국가: ${regionCode}`);
  console.log(`🧪 테스트 모드: ${testMode}`);

  // ==================== 3. 배치 로그 시작 ====================
  const supabase = createServerClient();
  const { data: batchLog } = await supabase
    .from('shorts_batch_logs')
    .insert({
      batch_type: 'analyze',
      snapshot_date: snapshotDate,
      status: 'running',
      metadata: { region_code: regionCode, test_mode: testMode },
    })
    .select()
    .single();

  // ==================== 4. 카테고리 × 기간 루프 ====================
  const results: AnalyzeResult[] = [];
  const categoriesToProcess = categoryFilter
    ? SHORTS_CATEGORIES.filter((c) => c.id === categoryFilter)
    : testMode
    ? [SHORTS_CATEGORIES[0]]
    : SHORTS_CATEGORIES;

  const periods: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];

  let totalKeywords = 0;
  let successCount = 0;
  let failedCount = 0;

  for (const category of categoriesToProcess) {
    console.log(`\n📂 카테고리: ${category.label} (ID: ${category.id})`);

    const result: AnalyzeResult = {
      category_id: category.id,
      category_label: category.label,
      daily_keywords: 0,
      weekly_keywords: 0,
      monthly_keywords: 0,
      success: true,
    };

    try {
      // 각 기간별로 키워드 추출
      for (const period of periods) {
        const keywordCount = await extractKeywordsForCategory(
          snapshotDate,
          category.id,
          period,
          regionCode
        );

        if (period === 'daily') result.daily_keywords = keywordCount;
        else if (period === 'weekly') result.weekly_keywords = keywordCount;
        else result.monthly_keywords = keywordCount;

        totalKeywords += keywordCount;
      }

      successCount++;
      console.log(`✅ ${category.label} 완료`);
    } catch (error: any) {
      console.error(`❌ ${category.label} 실패:`, error.message);
      result.success = false;
      result.error = error.message;
      failedCount++;
    }

    results.push(result);

    // API 호출 간격
    await new Promise((resolve) => setTimeout(resolve, 500));
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
          total_keywords: totalKeywords,
          duration_sec: duration,
        },
      })
      .eq('id', batchLog.id);
  }

  // ==================== 6. 응답 ====================
  console.log('\n✅ 키워드 분석 완료!');
  console.log(`⏱️ 소요 시간: ${duration}초`);
  console.log(`📊 성공: ${successCount} / 실패: ${failedCount}`);
  console.log(`🔑 총 키워드 수: ${totalKeywords}개`);

  return NextResponse.json({
    success: failedCount === 0,
    snapshot_date: snapshotDate,
    region_code: regionCode,
    summary: {
      total_categories: categoriesToProcess.length,
      success_count: successCount,
      failed_count: failedCount,
      total_keywords: totalKeywords,
      duration_sec: duration,
    },
    results,
  });
}

// ==================== 수동 트리거용 GET ====================
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: '키워드 분석 배치 API',
    usage: 'POST 요청으로 실행하세요',
    test_command: `
curl -X POST http://localhost:3000/api/keywords/analyze \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${CRON_SECRET}" \\
  -d '{"test_mode": true}'
    `.trim(),
  });
}
