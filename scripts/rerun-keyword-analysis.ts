/**
 * 특정 날짜의 키워드 분석을 수동으로 재실행하는 스크립트
 */

import { runDailyKeywordAnalysisKR } from '../app/lib/keywords/analyzer';

const TARGET_DATE = process.argv[2] || '2025-12-02';

console.log(`\n🔄 [키워드 분석 재실행] ${TARGET_DATE}\n`);

runDailyKeywordAnalysisKR(TARGET_DATE)
  .then(() => {
    console.log(`\n✅ [완료] ${TARGET_DATE} 키워드 분석 재실행 완료\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ [에러] ${TARGET_DATE} 키워드 분석 실패:`, error);
    process.exit(1);
  });
