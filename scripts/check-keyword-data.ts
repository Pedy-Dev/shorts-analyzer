/**
 * 12월 2일 키워드 추출 실패 원인 진단 스크립트
 */

import { createClient } from '@supabase/supabase-js';
import { SHORTS_CATEGORIES } from '../app/lib/constants/shorts-categories';

// .env.local에서 직접 값 읽기 (Next.js 환경에서 실행 시)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dufjnyojlsojjrmavrcs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZmpueW9qbHNvampybWF2cmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODE5MDMsImV4cCI6MjA3ODk1NzkwM30.RWKXgB76rDBDpXFe4aqODGzrJqdZvShYXMhF2RvbI_k';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('Key available:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_DATE = '2025-12-02';
const PROBLEM_CATEGORIES = ['25', '24', '28']; // 뉴스/정치, 엔터테인먼트, 과학기술

async function checkData() {
  console.log(`\n🔍 [진단 시작] ${TARGET_DATE} 키워드 추출 실패 원인 분석\n`);

  // 1. 카테고리별 영상 수 확인
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 1단계: category_shorts_snapshot 데이터 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const categoryId of PROBLEM_CATEGORIES) {
    const categoryLabel = SHORTS_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;

    // 전체 영상 수
    const { count: totalCount, error: totalError } = await supabase
      .from('category_shorts_snapshot')
      .select('*', { count: 'exact', head: true })
      .eq('snapshot_date', TARGET_DATE)
      .eq('region_code', 'KR')
      .eq('category_id', categoryId);

    if (totalError) {
      console.error(`❌ [${categoryLabel}] 조회 실패:`, totalError.message);
      continue;
    }

    // 한국어 제목 포함 영상 수 (샘플링으로 확인)
    const { data: sampleVideos, error: sampleError } = await supabase
      .from('category_shorts_snapshot')
      .select('title')
      .eq('snapshot_date', TARGET_DATE)
      .eq('region_code', 'KR')
      .eq('category_id', categoryId)
      .limit(1000);

    if (sampleError) {
      console.error(`❌ [${categoryLabel}] 샘플 조회 실패:`, sampleError.message);
      continue;
    }

    // 한국어 체크 함수
    const hasKorean = (text: string) => /[\uAC00-\uD7A3]/.test(text);
    const koreanCount = sampleVideos?.filter(v => hasKorean(v.title)).length || 0;
    const koreanPercentage = sampleVideos ? Math.round((koreanCount / sampleVideos.length) * 100) : 0;

    console.log(`[${categoryLabel}] (ID: ${categoryId})`);
    console.log(`  ├─ 전체 영상: ${totalCount}개`);
    console.log(`  ├─ 한글 영상 (샘플 ${sampleVideos?.length}개 중): ${koreanCount}개 (${koreanPercentage}%)`);

    if (koreanCount < 10) {
      console.log(`  └─ ⚠️ 한글 영상이 10개 미만으로 추정 → 스킵 조건 충족\n`);
    } else {
      console.log(`  └─ ✅ 한글 영상 충분 → 다른 원인 확인 필요\n`);
    }
  }

  // 2. 카테고리별 키워드 추출 결과 확인
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 2단계: category_keywords_trend 데이터 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const categoryId of PROBLEM_CATEGORIES) {
    const categoryLabel = SHORTS_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;

    const { count, error } = await supabase
      .from('category_keywords_trend')
      .select('*', { count: 'exact', head: true })
      .eq('snapshot_date', TARGET_DATE)
      .eq('region_code', 'KR')
      .eq('category_id', categoryId)
      .eq('period', 'daily');

    if (error) {
      console.error(`❌ [${categoryLabel}] 조회 실패:`, error.message);
      continue;
    }

    console.log(`[${categoryLabel}] (ID: ${categoryId})`);
    console.log(`  └─ 키워드 수: ${count || 0}개`);

    if (count === 0) {
      console.log(`     ❌ 키워드 추출 실패 확인!\n`);
    } else {
      console.log(`     ✅ 키워드 추출 성공\n`);
    }
  }

  // 3. 배치 로그 확인
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 3단계: shorts_batch_logs 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: batchLogs, error: logError } = await supabase
    .from('shorts_batch_logs')
    .select('*')
    .eq('snapshot_date', TARGET_DATE)
    .order('created_at', { ascending: false });

  if (logError) {
    console.error('❌ 배치 로그 조회 실패:', logError.message);
  } else if (!batchLogs || batchLogs.length === 0) {
    console.log('⚠️ 배치 로그 없음\n');
  } else {
    for (const log of batchLogs) {
      console.log(`[${log.batch_type}]`);
      console.log(`  ├─ 상태: ${log.status}`);
      console.log(`  ├─ 실행 시각: ${log.created_at}`);
      console.log(`  └─ 메타데이터:`, JSON.stringify(log.metadata, null, 2));
      console.log('');
    }
  }

  // 4. 전체 카테고리 키워드 추출 현황
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 4단계: 전체 카테고리 키워드 추출 현황');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: allKeywords, error: allError } = await supabase
    .from('category_keywords_trend')
    .select('category_id')
    .eq('snapshot_date', TARGET_DATE)
    .eq('region_code', 'KR')
    .eq('period', 'daily');

  if (allError) {
    console.error('❌ 전체 카테고리 조회 실패:', allError.message);
  } else {
    // 카테고리별로 그룹화
    const categoryCounts = new Map<string, number>();
    for (const row of allKeywords || []) {
      categoryCounts.set(row.category_id, (categoryCounts.get(row.category_id) || 0) + 1);
    }

    console.log('카테고리별 키워드 추출 현황:\n');
    for (const category of SHORTS_CATEGORIES) {
      const count = categoryCounts.get(category.id) || 0;
      const status = count > 0 ? '✅' : '❌';
      console.log(`${status} [${category.label}] (ID: ${category.id}): ${count}개`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 [진단 완료]');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  });
