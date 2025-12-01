-- 핫키워드 v1: 키워드별 조회수 정보 컬럼 추가
-- total_views: 해당 키워드 포함 영상들의 총 조회수
-- avg_views: 평균 조회수

ALTER TABLE category_keywords_trend
ADD COLUMN IF NOT EXISTS total_views BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_views BIGINT DEFAULT 0;

-- 인덱스 추가 (조회수 기준 정렬용)
CREATE INDEX IF NOT EXISTS idx_keywords_total_views
ON category_keywords_trend(snapshot_date, region_code, category_id, total_views DESC);
