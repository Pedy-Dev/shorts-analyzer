-- =====================================================
-- Phase 1: 카테고리별 쇼츠 수집 엔진 DB 스키마
-- =====================================================

-- 1. 영상 스냅샷 테이블 (매일 수집한 쇼츠 원본 데이터)
CREATE TABLE IF NOT EXISTS category_shorts_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 수집 메타데이터
  snapshot_date DATE NOT NULL,                    -- 수집 기준일 (어제 날짜)
  region_code TEXT NOT NULL DEFAULT 'KR',         -- 국가 코드 (KR, US, GB, JP)
  category_id TEXT NOT NULL,                      -- YouTube videoCategoryId

  -- 영상 기본 정보
  video_id TEXT NOT NULL,                         -- YouTube video ID
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],                                    -- 태그 배열

  -- 통계
  view_count BIGINT NOT NULL DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,

  -- 영상 메타데이터
  published_at TIMESTAMPTZ NOT NULL,              -- 영상 업로드 시간
  duration_sec INT NOT NULL,                      -- 영상 길이 (초)

  -- 채널 정보
  channel_id TEXT NOT NULL,
  channel_title TEXT,

  -- 썸네일
  thumbnail_url TEXT,

  -- 생성 시간
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건: 같은 날짜에 같은 영상 중복 방지
  UNIQUE(snapshot_date, region_code, category_id, video_id)
);

-- 인덱스: 조회 성능 최적화
CREATE INDEX IF NOT EXISTS idx_snapshot_date_category
  ON category_shorts_snapshot (snapshot_date, category_id, region_code);

CREATE INDEX IF NOT EXISTS idx_snapshot_category_published
  ON category_shorts_snapshot (category_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_video_id
  ON category_shorts_snapshot (video_id);

-- 2. 기간별 랭킹 테이블 (일간/주간/월간 TOP 100)
CREATE TYPE shorts_period_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE shorts_sort_type AS ENUM ('views', 'likes', 'comments');

CREATE TABLE IF NOT EXISTS category_shorts_ranking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 랭킹 메타데이터
  snapshot_date DATE NOT NULL,                    -- 기준일
  region_code TEXT NOT NULL DEFAULT 'KR',
  category_id TEXT NOT NULL,
  period shorts_period_type NOT NULL,             -- daily/weekly/monthly
  sort_type shorts_sort_type NOT NULL DEFAULT 'views',  -- 정렬 기준
  rank INT NOT NULL,                              -- 순위 (1-100)

  -- 영상 정보
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT,

  -- 통계
  view_count BIGINT NOT NULL DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,

  -- 영상 메타데이터
  published_at TIMESTAMPTZ NOT NULL,
  duration_sec INT NOT NULL,
  thumbnail_url TEXT,

  -- 생성 시간
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건: 같은 날짜/카테고리/기간/정렬기준에 순위 중복 방지
  UNIQUE(snapshot_date, region_code, category_id, period, sort_type, rank)
);

-- 인덱스: 조회 성능 최적화
CREATE INDEX IF NOT EXISTS idx_ranking_query
  ON category_shorts_ranking (snapshot_date DESC, region_code, category_id, period, sort_type, rank);

CREATE INDEX IF NOT EXISTS idx_ranking_video
  ON category_shorts_ranking (video_id);

-- 3. 배치 실행 로그 테이블 (선택사항, 모니터링용)
CREATE TABLE IF NOT EXISTS shorts_batch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  batch_type TEXT NOT NULL,                       -- 'collect' | 'analyze'
  snapshot_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'running',         -- 'running' | 'success' | 'failed'
  error_message TEXT,

  metadata JSONB,                                 -- 추가 정보 (카테고리 개수, 영상 수 등)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_logs_date
  ON shorts_batch_logs (snapshot_date DESC, batch_type);

-- 코멘트 추가
COMMENT ON TABLE category_shorts_snapshot IS '매일 수집한 YouTube Shorts 원본 데이터 (61초 이하)';
COMMENT ON TABLE category_shorts_ranking IS '일간/주간/월간 카테고리별 TOP 100 랭킹';
COMMENT ON TABLE shorts_batch_logs IS '배치 작업 실행 로그';

COMMENT ON COLUMN category_shorts_snapshot.snapshot_date IS '수집 기준일 (매일 00:05 실행 시 어제 날짜)';
COMMENT ON COLUMN category_shorts_snapshot.duration_sec IS '영상 길이 (초) - 61초 이하만 저장';
COMMENT ON COLUMN category_shorts_ranking.rank IS '순위 (1-100)';
