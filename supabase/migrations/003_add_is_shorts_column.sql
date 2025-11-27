-- ============================================================
-- 003: is_shorts 컬럼 추가
-- 쇼츠(≤180초)와 롱폼(>180초) 구분을 위한 컬럼
-- ============================================================

-- 1. category_shorts_snapshot 테이블에 is_shorts 컬럼 추가
ALTER TABLE category_shorts_snapshot
ADD COLUMN IF NOT EXISTS is_shorts BOOLEAN DEFAULT true;

-- 기존 데이터 업데이트: duration_sec <= 180이면 쇼츠
UPDATE category_shorts_snapshot
SET is_shorts = (duration_sec <= 180)
WHERE is_shorts IS NULL OR is_shorts = true;

-- 2. category_shorts_ranking 테이블에 is_shorts 컬럼 추가
ALTER TABLE category_shorts_ranking
ADD COLUMN IF NOT EXISTS is_shorts BOOLEAN DEFAULT true;

-- 기존 데이터 업데이트
UPDATE category_shorts_ranking
SET is_shorts = (duration_sec <= 180)
WHERE is_shorts IS NULL OR is_shorts = true;

-- 3. 인덱스 추가 (is_shorts 필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_snapshot_is_shorts
ON category_shorts_snapshot(snapshot_date, category_id, is_shorts);

CREATE INDEX IF NOT EXISTS idx_ranking_is_shorts
ON category_shorts_ranking(snapshot_date, category_id, period, sort_type, is_shorts);

-- 4. UNIQUE 제약조건 업데이트 (is_shorts 포함)
-- 기존 제약조건 삭제 후 재생성
ALTER TABLE category_shorts_ranking
DROP CONSTRAINT IF EXISTS category_shorts_ranking_snapshot_date_region_code_category__key;

ALTER TABLE category_shorts_ranking
ADD CONSTRAINT category_shorts_ranking_unique_key
UNIQUE (snapshot_date, region_code, category_id, period, sort_type, is_shorts, rank);
