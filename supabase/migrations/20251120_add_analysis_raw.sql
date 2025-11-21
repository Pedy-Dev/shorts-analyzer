-- Migration: analysis_raw 컬럼 추가
-- 목적: Gemini 원본 응답을 저장하여 스키마 변경 시 재파싱 가능하도록 함

-- channel_analysis_history 테이블에 analysis_raw 컬럼 추가
ALTER TABLE channel_analysis_history
ADD COLUMN IF NOT EXISTS analysis_raw jsonb;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN channel_analysis_history.analysis_raw IS
'Gemini API 원본 응답을 저장. 스키마 변경 시 이 데이터를 재파싱하여 analysis_summary를 재생성할 수 있음';

-- 기존 데이터는 모두 보존됨 (NULL 허용)
