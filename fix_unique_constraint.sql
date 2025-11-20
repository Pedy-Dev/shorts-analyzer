-- 기존 UNIQUE 제약 조건 제거
ALTER TABLE channel_analysis_history
DROP CONSTRAINT IF EXISTS unique_user_channel_daily;

-- analysis_date를 TIMESTAMP로 변경하여 시간까지 저장
ALTER TABLE channel_analysis_history
ALTER COLUMN analysis_date TYPE TIMESTAMP USING analysis_date::timestamp;

-- created_at 컬럼이 없다면 추가 (시간 구분용)
ALTER TABLE channel_analysis_history
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_channel_analysis_user_date
ON channel_analysis_history(user_id, analysis_date DESC);