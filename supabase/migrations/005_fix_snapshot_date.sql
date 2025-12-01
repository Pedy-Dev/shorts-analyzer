-- =====================================================
-- 옵션 2: 기존 11월 30일 삭제 후, 12월 1일을 11월 30일로 변경
-- =====================================================

-- 1. 기존 11월 30일 데이터 삭제
DELETE FROM category_shorts_snapshot
WHERE snapshot_date = '2025-11-30';

-- 2. 12월 1일 → 11월 30일로 변경
UPDATE category_shorts_snapshot
SET snapshot_date = '2025-11-30'
WHERE snapshot_date = '2025-12-01';

-- 3. shorts_batch_logs도 동일하게
DELETE FROM shorts_batch_logs
WHERE snapshot_date = '2025-11-30';

UPDATE shorts_batch_logs
SET snapshot_date = '2025-11-30'
WHERE snapshot_date = '2025-12-01';

-- 4. 확인 쿼리
SELECT
  snapshot_date,
  region_code,
  COUNT(*) as video_count
FROM category_shorts_snapshot
GROUP BY snapshot_date, region_code
ORDER BY snapshot_date DESC, region_code;
