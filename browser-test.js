// 브라우저 콘솔에서 실행할 수 있는 테스트 스크립트
// 1. 먼저 http://localhost:3000 에서 로그인하세요
// 2. F12 개발자 도구를 열고 Console 탭으로 이동
// 3. 이 스크립트 내용을 복사해서 붙여넣고 Enter

// ========== 테스트 시작 ==========

console.log('%c📌 브라우저 테스트 시작...', 'color: blue; font-size: 16px');

// 1단계: 로그인 상태 확인
async function checkLoginStatus() {
  console.log('\n%c1️⃣ 로그인 상태 확인 중...', 'color: green; font-weight: bold');

  try {
    const response = await fetch('/api/user/me');
    const data = await response.json();

    if (response.ok && data.user) {
      console.log('✅ 로그인 확인됨!');
      console.log('사용자 정보:', {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      });
      return data.user.id;
    } else {
      console.error('❌ 로그인되지 않음. 먼저 로그인해주세요!');
      return null;
    }
  } catch (error) {
    console.error('❌ 로그인 확인 실패:', error);
    return null;
  }
}

// 2단계: 테스트 데이터로 분석 저장 시도
async function testSaveAnalysis() {
  console.log('\n%c2️⃣ 분석 결과 저장 테스트...', 'color: green; font-weight: bold');

  const testData = {
    channelId: 'test-' + Date.now(),
    channelTitle: '테스트 채널 - ' + new Date().toLocaleString('ko-KR'),
    isOwnChannel: false,
    videoCount: 5,
    analysisResult: {
      channel_summary: '이것은 테스트 분석 결과입니다.',
      topic_characteristics: {
        successful_topics: [
          '테스트 주제 1',
          '테스트 주제 2'
        ],
        unsuccessful_topics: [
          '실패 주제 1'
        ]
      },
      title_analysis: {
        successful_patterns: [
          '성공 패턴 1'
        ]
      },
      script_analysis: {
        successful_patterns: [
          '스크립트 패턴 1'
        ]
      }
    },
    videoTitles: ['테스트 영상 1', '테스트 영상 2', '테스트 영상 3']
  };

  try {
    const response = await fetch('/api/save-analysis-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ 저장 성공!');
      console.log('저장된 ID:', result.id);
      console.log('카테고리:', result.category);
      return result.id;
    } else {
      console.error('❌ 저장 실패:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ 저장 API 호출 실패:', error);
    return null;
  }
}

// 3단계: 저장된 기록 확인
async function checkSavedHistory() {
  console.log('\n%c3️⃣ 저장된 분석 기록 확인...', 'color: green; font-weight: bold');

  try {
    const response = await fetch('/api/analysis-history');
    const data = await response.json();

    if (response.ok) {
      console.log('✅ 분석 기록 조회 성공!');
      console.log('전체 기록 수:', data.data?.length || 0);

      if (data.data && data.data.length > 0) {
        console.log('\n최근 3개 기록:');
        data.data.slice(0, 3).forEach((record, idx) => {
          console.log(`${idx + 1}. ${record.channel_title}`);
          console.log(`   - ID: ${record.id}`);
          console.log(`   - 채널 ID: ${record.channel_id}`);
          console.log(`   - 생성일: ${new Date(record.created_at).toLocaleString('ko-KR')}`);
          console.log(`   - 분석 데이터 존재: ${record.analysis_summary ? '✅' : '❌'}`);
        });
      }

      return data.data;
    } else {
      console.error('❌ 기록 조회 실패:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ 기록 조회 API 호출 실패:', error);
    return null;
  }
}

// 4단계: 삭제 테스트 (선택사항)
async function testDeleteHistory(recordId) {
  console.log('\n%c4️⃣ 분석 기록 삭제 테스트...', 'color: green; font-weight: bold');

  if (!recordId) {
    console.log('⚠️ 삭제할 기록 ID가 없습니다.');
    return false;
  }

  try {
    const response = await fetch(`/api/analysis-history?id=${recordId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ 삭제 성공!');
      return true;
    } else {
      console.error('❌ 삭제 실패:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ 삭제 API 호출 실패:', error);
    return false;
  }
}

// 전체 테스트 실행
async function runFullTest() {
  console.log('%c========== 전체 테스트 시작 ==========', 'color: blue; font-size: 18px; font-weight: bold');

  // 1. 로그인 확인
  const userId = await checkLoginStatus();
  if (!userId) {
    console.log('%c❌ 테스트 중단: 로그인 필요', 'color: red; font-size: 16px');
    return;
  }

  // 2. 분석 저장 테스트
  const savedId = await testSaveAnalysis();

  // 3. 저장된 기록 확인
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
  const history = await checkSavedHistory();

  // 4. 방금 저장한 기록 찾기
  if (savedId && history) {
    const savedRecord = history.find(r => r.id === savedId);
    if (savedRecord) {
      console.log('\n%c✅ 테스트 성공: 저장한 기록을 DB에서 확인했습니다!', 'color: green; font-size: 16px; font-weight: bold');
      console.log('저장된 데이터:', savedRecord);

      // 5. 삭제 테스트 (선택사항)
      const shouldDelete = confirm('테스트 데이터를 삭제하시겠습니까?');
      if (shouldDelete) {
        await testDeleteHistory(savedId);
      }
    } else {
      console.log('%c⚠️ 저장한 기록을 찾을 수 없습니다.', 'color: orange; font-size: 16px');
    }
  }

  console.log('\n%c========== 테스트 완료 ==========', 'color: blue; font-size: 18px; font-weight: bold');
}

// 실행
runFullTest();