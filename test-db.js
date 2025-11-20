const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://owhqsvwtiwjwaxgxxqnh.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93aHFzdnd0aXdqd2F4Z3h4cW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0MDIzMDMsImV4cCI6MjA0Njk3ODMwM30.IfoF88p8kJPfIUo8QgQxYL7xtoYqNLNXTz-fhCvh7rk'
);

async function checkDatabase() {
  console.log('📌 데이터베이스 연결 테스트 시작...');

  try {
    // 1. channel_analysis_history 테이블 조회
    console.log('\n📊 channel_analysis_history 테이블 확인...');
    const { data: history, error: historyError, count } = await supabase
      .from('channel_analysis_history')
      .select('*', { count: 'exact', head: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (historyError) {
      console.error('❌ 테이블 조회 실패:', historyError);
    } else {
      console.log('✅ 저장된 분석 기록 수:', count || 0);

      if (history && history.length > 0) {
        console.log('\n🔍 최근 분석 기록 (최대 5개):');
        history.forEach((record, idx) => {
          console.log(`\n${idx + 1}. ${record.channel_title}`);
          console.log(`   - ID: ${record.id}`);
          console.log(`   - 채널 ID: ${record.channel_id}`);
          console.log(`   - 사용자 ID: ${record.user_id}`);
          console.log(`   - 카테고리: ${record.creator_category}`);
          console.log(`   - 분석 영상 수: ${record.video_count}개`);
          console.log(`   - 생성일: ${new Date(record.created_at).toLocaleString('ko-KR')}`);
          console.log(`   - 분석 데이터 존재: ${record.analysis_result ? '✅' : '❌'}`);
        });
      } else {
        console.log('⚠️ 저장된 분석 기록이 없습니다.');
      }
    }

    // 2. users 테이블 확인
    console.log('\n👥 users 테이블 확인...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      console.error('❌ users 테이블 조회 실패:', usersError);
    } else {
      console.log('✅ 등록된 사용자 수:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('\n최근 사용자:');
        users.forEach((user, idx) => {
          console.log(`${idx + 1}. ${user.name || user.email}`);
          console.log(`   - ID: ${user.id}`);
          console.log(`   - 가입일: ${new Date(user.created_at).toLocaleString('ko-KR')}`);
        });
      }
    }

    // 3. 테이블 스키마 확인
    console.log('\n🔧 테이블 구조 확인...');
    const { data: schema } = await supabase
      .from('channel_analysis_history')
      .select('*')
      .limit(0);

    if (schema !== null) {
      console.log('✅ channel_analysis_history 테이블이 존재합니다.');
    }

  } catch (error) {
    console.error('❌ 데이터베이스 오류:', error);
  }
}

// 실행
checkDatabase().then(() => {
  console.log('\n✅ 데이터베이스 확인 완료!');
  process.exit(0);
}).catch(error => {
  console.error('❌ 스크립트 실행 실패:', error);
  process.exit(1);
});