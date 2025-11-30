-- ============================================================
-- 004: 일간 증가량 테이블 + 키워드 요약 테이블
-- v1: 일간 증가량 기반 랭킹 시스템
-- ============================================================

-- ==================== 1. category_shorts_daily_metrics ====================
-- 날짜별 영상 증가량 저장 (어제 대비 오늘 증가분)
-- 랭킹은 이 테이블에서 ORDER BY로 직접 조회 (별도 ranking 테이블 불필요)

CREATE TABLE IF NOT EXISTS category_shorts_daily_metrics (
  metric_date DATE NOT NULL,           -- 성과 기준 날짜 (예: 11/26 = 11/26의 성과)
  region_code TEXT NOT NULL,
  category_id TEXT NOT NULL,
  video_id TEXT NOT NULL,

  -- 일간 증가량 (v1 핵심)
  daily_view_increase INT DEFAULT 0,
  daily_like_increase INT DEFAULT 0,
  daily_comment_increase INT DEFAULT 0,

  -- 메타데이터 (조인 없이 바로 표시용)
  title TEXT,
  channel_id TEXT,
  channel_title TEXT,
  thumbnail_url TEXT,
  duration_sec INT,
  is_shorts BOOLEAN,
  published_at TIMESTAMPTZ,

  -- 누적 수치 (참고용)
  total_view_count INT DEFAULT 0,
  total_like_count INT DEFAULT 0,
  total_comment_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (metric_date, region_code, category_id, video_id)
);

-- 랭킹 조회용 인덱스 (is_shorts별 증가량 정렬)
CREATE INDEX IF NOT EXISTS idx_daily_metrics_views_ranking
ON category_shorts_daily_metrics(metric_date, region_code, category_id, is_shorts, daily_view_increase DESC);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_likes_ranking
ON category_shorts_daily_metrics(metric_date, region_code, category_id, is_shorts, daily_like_increase DESC);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_comments_ranking
ON category_shorts_daily_metrics(metric_date, region_code, category_id, is_shorts, daily_comment_increase DESC);


-- ==================== 2. category_keywords_summary ====================
-- Gemini가 생성한 키워드/패턴 요약 (배치 저장)

CREATE TABLE IF NOT EXISTS category_keywords_summary (
  summary_date DATE NOT NULL,          -- 기준 날짜 (보통 어제)
  region_code TEXT NOT NULL,
  category_id TEXT NOT NULL,

  -- Gemini 요약 결과 (JSON)
  summary_json JSONB NOT NULL,

  -- 메타데이터
  video_count INT DEFAULT 0,           -- 분석에 사용된 영상 수
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (summary_date, region_code, category_id)
);

-- summary_json 예시 구조:
-- {
--   "top_keywords": [
--     { "keyword": "충격", "count": 23, "example_titles": ["..."] }
--   ],
--   "title_patterns": [
--     "숫자 + 경고형 단어 (예: '5가지 절대 하면 안되는')"
--   ],
--   "hook_styles": [
--     "첫 문장에 충격적 사실 제시"
--   ],
--   "sample_video_ids": ["abc123", "def456"]
-- }


-- ==================== 3. 기존 테이블 정리 (선택적) ====================
-- category_shorts_ranking 테이블은 B안 선택으로 더 이상 사용 안함
-- 하지만 기존 데이터 보존을 위해 삭제하지 않고 유지
-- 나중에 필요 없으면 DROP TABLE category_shorts_ranking;


-- ==================== 4. 코멘트 ====================
COMMENT ON TABLE category_shorts_daily_metrics IS '일간 영상 증가량 데이터. 랭킹은 이 테이블에서 ORDER BY로 조회';
COMMENT ON TABLE category_keywords_summary IS 'Gemini가 생성한 카테고리별 키워드/패턴 요약';
COMMENT ON COLUMN category_shorts_daily_metrics.metric_date IS '성과 측정 기준 날짜. 11/27에 수집하면 metric_date=11/26';
COMMENT ON COLUMN category_shorts_daily_metrics.daily_view_increase IS '전일 대비 조회수 증가량';
