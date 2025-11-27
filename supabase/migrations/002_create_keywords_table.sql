-- =====================================================
-- Phase 2: 키워드 분석 엔진 DB 스키마
-- =====================================================

-- 1. 카테고리별 키워드 트렌드 테이블
CREATE TABLE IF NOT EXISTS category_keywords_trend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 키워드 메타데이터
  snapshot_date DATE NOT NULL,                    -- 기준일
  region_code TEXT NOT NULL DEFAULT 'KR',
  category_id TEXT NOT NULL,
  period shorts_period_type NOT NULL,             -- daily/weekly/monthly (이미 정의된 enum)

  -- 키워드 정보
  keyword TEXT NOT NULL,                          -- 키워드
  raw_score FLOAT NOT NULL DEFAULT 0,             -- 가중치 합산 점수
  trend_score FLOAT DEFAULT 0,                    -- 급상승 점수 (오늘/지난7일평균)
  video_count INT NOT NULL DEFAULT 0,             -- 포함된 영상 수

  -- 샘플 데이터
  sample_titles TEXT[],                           -- 대표 제목 3개
  sample_video_ids TEXT[],                        -- 대표 영상 ID 3개

  -- 생성 시간
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건: 같은 날짜/카테고리/기간에 키워드 중복 방지
  UNIQUE(snapshot_date, region_code, category_id, period, keyword)
);

-- 인덱스: raw_score 정렬 (항상 강한 키워드)
CREATE INDEX IF NOT EXISTS idx_keywords_raw_score
  ON category_keywords_trend (snapshot_date DESC, category_id, period, raw_score DESC);

-- 인덱스: trend_score 정렬 (급상승 키워드)
CREATE INDEX IF NOT EXISTS idx_keywords_trend_score
  ON category_keywords_trend (snapshot_date DESC, category_id, period, trend_score DESC);

-- 인덱스: 키워드 검색용
CREATE INDEX IF NOT EXISTS idx_keywords_keyword
  ON category_keywords_trend (keyword, snapshot_date DESC);

-- 코멘트
COMMENT ON TABLE category_keywords_trend IS '카테고리별 핫 키워드 및 트렌드 분석 결과';
COMMENT ON COLUMN category_keywords_trend.raw_score IS '조회수 가중치 합산 점수 (항상 강한 키워드 판별)';
COMMENT ON COLUMN category_keywords_trend.trend_score IS '급상승 점수 = 오늘점수 / (지난7일평균 + 0.1)';
COMMENT ON COLUMN category_keywords_trend.sample_titles IS '키워드가 포함된 대표 영상 제목 3개';
