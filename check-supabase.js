// Supabase 테이블 구조 확인 스크립트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Supabase 연결 확인 중...\n');

  // 1. users 테이블 확인
  console.log('📊 users 테이블 확인:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (usersError) {
    console.log('❌ users 테이블 없음:', usersError.message);
  } else {
    console.log('✅ users 테이블 존재');
    console.log('   샘플 데이터:', users);
  }

  // 2. channel_analysis_history 테이블 확인
  console.log('\n📊 channel_analysis_history 테이블 확인:');
  const { data: history, error: historyError } = await supabase
    .from('channel_analysis_history')
    .select('*')
    .limit(1);

  if (historyError) {
    console.log('❌ channel_analysis_history 테이블 없음:', historyError.message);
  } else {
    console.log('✅ channel_analysis_history 테이블 존재');
    console.log('   샘플 데이터:', history);
  }

  // 3. popular_shorts_snapshot 테이블 확인
  console.log('\n📊 popular_shorts_snapshot 테이블 확인:');
  const { data: shorts, error: shortsError } = await supabase
    .from('popular_shorts_snapshot')
    .select('*')
    .limit(1);

  if (shortsError) {
    console.log('❌ popular_shorts_snapshot 테이블 없음:', shortsError.message);
  } else {
    console.log('✅ popular_shorts_snapshot 테이블 존재');
    console.log('   샘플 데이터:', shorts);
  }
}

checkTables().catch(console.error);
