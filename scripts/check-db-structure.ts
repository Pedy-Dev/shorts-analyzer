// scripts/check-db-structure.ts
// DB 구조 확인 스크립트

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// .env.local 파일 로드
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkDBStructure() {
  console.log('📊 DB 구조 확인 시작...\n');

  // 1. 최신 분석 기록 1개 가져오기
  const { data: records, error } = await supabase
    .from('channel_analysis_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  if (!records || records.length === 0) {
    console.log('⚠️ 분석 기록이 없습니다.');
    return;
  }

  const record = records[0];

  console.log('✅ 최신 기록 1개 조회 완료\n');
  console.log('='.repeat(60));
  console.log('📌 기본 정보:');
  console.log('  - ID:', record.id);
  console.log('  - 채널:', record.channel_title);
  console.log('  - 생성일:', record.created_at);
  console.log('='.repeat(60));

  console.log('\n📊 analysis_summary 구조 분석:\n');

  const summary = record.analysis_summary;

  if (!summary) {
    console.log('⚠️ analysis_summary가 null입니다.');
    return;
  }

  // 최상위 키 확인
  console.log('1️⃣ 최상위 키 목록:');
  const topLevelKeys = Object.keys(summary);
  topLevelKeys.forEach(key => {
    const valueType = typeof summary[key];
    const isObject = valueType === 'object' && summary[key] !== null;
    const isArray = Array.isArray(summary[key]);

    let typeStr = valueType;
    if (isArray) typeStr = 'array';
    else if (isObject) typeStr = 'object';

    console.log(`  - ${key}: ${typeStr}`);
  });

  // fullAnalysis 존재 여부 확인
  console.log('\n2️⃣ fullAnalysis 키 존재 여부:');
  if ('fullAnalysis' in summary) {
    console.log('  ✅ fullAnalysis 키가 존재합니다!');
    console.log('  📦 fullAnalysis 내부 구조:');
    const fullAnalysisKeys = Object.keys(summary.fullAnalysis);
    fullAnalysisKeys.forEach(key => {
      console.log(`    - ${key}`);
    });
  } else {
    console.log('  ❌ fullAnalysis 키가 없습니다!');
    console.log('  → FE에서 record.analysis_summary?.fullAnalysis로 접근하면 undefined 반환');
  }

  // contentGuideline 존재 여부 확인
  console.log('\n3️⃣ contentGuideline 키 존재 여부:');
  if ('contentGuideline' in summary) {
    console.log('  ✅ contentGuideline 키가 존재합니다!');
    console.log('  📝 내용 길이:', typeof summary.contentGuideline === 'string' ? summary.contentGuideline.length : 'N/A');
  } else {
    console.log('  ❌ contentGuideline 키가 없습니다!');
  }

  // channel_identity 존재 여부 확인
  console.log('\n4️⃣ channel_identity 키 존재 여부:');
  if ('channel_identity' in summary) {
    console.log('  ✅ channel_identity 키가 존재합니다!');
    console.log('  📦 channel_identity 내부 구조:');
    const identityKeys = Object.keys(summary.channel_identity);
    identityKeys.forEach(key => {
      console.log(`    - ${key}: ${typeof summary.channel_identity[key]}`);
    });
  } else {
    console.log('  ❌ channel_identity 키가 없습니다!');
  }

  // 주요 분석 섹션 확인
  console.log('\n5️⃣ 주요 분석 섹션 존재 여부:');
  const expectedSections = [
    'topic_characteristics',
    'title_analysis',
    'script_analysis',
    'summary_differences',
    '_meta'
  ];

  expectedSections.forEach(section => {
    if (section in summary) {
      console.log(`  ✅ ${section} 존재`);
    } else {
      console.log(`  ❌ ${section} 없음`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📋 결론:');
  console.log('='.repeat(60));

  if ('fullAnalysis' in summary) {
    console.log('✅ DB 구조: analysis_summary = { fullAnalysis: {...} }');
    console.log('   FE 접근: record.analysis_summary.fullAnalysis ← 정상');
  } else {
    console.log('❌ DB 구조: analysis_summary = { topic_characteristics, ... }');
    console.log('   FE 접근: record.analysis_summary.fullAnalysis ← 에러!');
    console.log('   수정 필요: record.analysis_summary로 직접 접근해야 함');
  }

  console.log('\n📦 전체 JSON 구조 출력:\n');
  console.log(JSON.stringify(summary, null, 2).substring(0, 2000) + '...(truncated)');
}

// 실행
checkDBStructure().catch(console.error);
