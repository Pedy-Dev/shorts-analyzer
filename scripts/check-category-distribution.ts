/**
 * 12월 2일 카테고리별 영상 분포 확인 스크립트
 */

import { createClient } from '@supabase/supabase-js';
import { SHORTS_CATEGORIES } from '../app/lib/constants/shorts-categories';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dufjnyojlsojjrmavrcs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZmpueW9qbHNvampybWF2cmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODE5MDMsImV4cCI6MjA3ODk1NzkwM30.RWKXgB76rDBDpXFe4aqODGzrJqdZvShYXMhF2RvbI_k';

const supabase = createClient(supabaseUrl, supabaseKey);
const TARGET_DATE = '2025-12-02';

async function checkCategoryDistribution() {
  console.log(`\n🔍 [카테고리 분포 확인] ${TARGET_DATE}\n`);

  // 페이지네이션으로 전체 데이터 로드 (analyzer.ts와 동일한 방식)
  let allVideos: {
    video_id: string;
    category_id: string;
    title: string;
    view_count: number;
  }[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batch, error: fetchError } = await supabase
      .from('category_shorts_snapshot')
      .select('video_id, category_id, title, view_count')
      .eq('region_code', 'KR')
      .eq('snapshot_date', TARGET_DATE)
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      console.error('❌ 영상 로드 실패:', fetchError.message);
      return;
    }

    if (!batch || batch.length === 0) break;

    allVideos = [...allVideos, ...batch];
    offset += batchSize;

    console.log(`  📄 페이지 ${Math.ceil(offset / batchSize)}: 누적 ${allVideos.length}개`);

    if (batch.length < batchSize) break;
  }

  console.log(`\n✅ 전체 KR 영상: ${allVideos.length}개\n`);

  // 카테고리별 그룹핑
  const videosByCategory: Record<string, typeof allVideos> = {};
  for (const v of allVideos) {
    if (!videosByCategory[v.category_id]) {
      videosByCategory[v.category_id] = [];
    }
    videosByCategory[v.category_id].push(v);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 카테고리별 영상 분포');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 한국어 체크 함수
  const hasKorean = (text: string) => /[\uAC00-\uD7A3]/.test(text);

  for (const category of SHORTS_CATEGORIES) {
    const videos = videosByCategory[category.id] || [];
    const koreanVideos = videos.filter(v => hasKorean(v.title));

    console.log(`[${category.label}] (ID: ${category.id})`);
    console.log(`  ├─ 전체 영상: ${videos.length}개`);
    console.log(`  ├─ 한글 영상: ${koreanVideos.length}개`);

    if (videos.length === 0) {
      console.log(`  └─ ❌ 영상 수집 안 됨!\n`);
    } else if (koreanVideos.length < 10) {
      console.log(`  └─ ⚠️ 한글 영상 10개 미만 → 키워드 추출 스킵됨\n`);
    } else {
      console.log(`  └─ ✅ 키워드 추출 대상\n`);
    }
  }

  // 카테고리 ID로 찾을 수 없는 영상이 있는지 확인
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 정의되지 않은 카테고리 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const knownCategoryIds = new Set(SHORTS_CATEGORIES.map(c => c.id));
  const unknownCategories = new Set<string>();

  for (const video of allVideos) {
    if (!knownCategoryIds.has(video.category_id)) {
      unknownCategories.add(video.category_id);
    }
  }

  if (unknownCategories.size === 0) {
    console.log('✅ 모든 영상이 알려진 카테고리에 속합니다.\n');
  } else {
    console.log('⚠️ 알 수 없는 카테고리 발견:');
    for (const catId of unknownCategories) {
      const count = allVideos.filter(v => v.category_id === catId).length;
      console.log(`  - 카테고리 ID ${catId}: ${count}개`);
    }
    console.log('');
  }
}

checkCategoryDistribution()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  });
