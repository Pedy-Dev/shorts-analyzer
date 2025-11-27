/**
 * 키워드 분석 엔진
 * 쇼츠 데이터에서 핫 키워드 추출 및 트렌드 계산
 */

import { createServerClient } from '@/app/lib/supabase-server';
import {
  isStopword,
  isOnlyNumbers,
  SPECIAL_CHARS_REGEX,
  MIN_KEYWORD_LENGTH,
} from './stopwords';

// ==================== 타입 정의 ====================

interface Video {
  video_id: string;
  title: string;
  description: string;
  tags: string[];
  view_count: number;
  published_at: string;
}

interface KeywordScore {
  keyword: string;
  raw_score: number;
  video_count: number;
  sample_titles: string[];
  sample_video_ids: string[];
}

// ==================== 텍스트 전처리 ====================

/**
 * 텍스트 전처리 및 키워드 추출
 * @param text - 제목 + 설명 + 태그 합친 텍스트
 * @returns 정제된 키워드 배열
 */
export function preprocessText(text: string): string[] {
  // 1. 특수문자, 이모지 제거
  let cleaned = text.replace(SPECIAL_CHARS_REGEX, ' ');

  // 2. 소문자 변환
  cleaned = cleaned.toLowerCase();

  // 3. 공백 기준 토큰화
  const tokens = cleaned.split(/\s+/);

  // 4. 필터링
  const keywords = tokens.filter((word) => {
    // 빈 문자열 제거
    if (!word || word.trim() === '') return false;

    // 길이 체크 (2글자 이상)
    if (word.length < MIN_KEYWORD_LENGTH) return false;

    // 숫자만 있는 경우 제거
    if (isOnlyNumbers(word)) return false;

    // 불용어 제거
    if (isStopword(word)) return false;

    return true;
  });

  return keywords;
}

/**
 * 영상 데이터에서 분석용 텍스트 생성
 */
export function getAnalysisText(video: Video): string {
  const parts = [
    video.title,
    video.description,
    ...(video.tags || []),
  ];

  return parts.join(' ');
}

// ==================== 키워드 점수 계산 ====================

/**
 * 조회수 기반 가중치 계산
 * log10 스케일로 큰 값 차이를 완화
 */
function calculateWeight(viewCount: number): number {
  return Math.log10(viewCount + 1);
}

/**
 * 영상 목록에서 키워드별 점수 계산
 */
export function calculateKeywordScores(videos: Video[]): Map<string, KeywordScore> {
  const keywordMap = new Map<string, {
    totalScore: number;
    videoIds: Set<string>;
    videoTitles: Array<{ title: string; views: number; videoId: string }>;
  }>();

  // 1. 각 영상 순회
  for (const video of videos) {
    const text = getAnalysisText(video);
    const keywords = preprocessText(text);
    const weight = calculateWeight(video.view_count);

    // 2. 키워드별 집계
    for (const keyword of keywords) {
      if (!keywordMap.has(keyword)) {
        keywordMap.set(keyword, {
          totalScore: 0,
          videoIds: new Set(),
          videoTitles: [],
        });
      }

      const entry = keywordMap.get(keyword)!;
      entry.totalScore += weight;
      entry.videoIds.add(video.video_id);
      entry.videoTitles.push({
        title: video.title,
        views: video.view_count,
        videoId: video.video_id,
      });
    }
  }

  // 3. 결과 포맷팅
  const result = new Map<string, KeywordScore>();

  for (const [keyword, data] of keywordMap.entries()) {
    // 조회수 높은 순으로 정렬 후 상위 3개 샘플
    const sortedTitles = data.videoTitles
      .sort((a, b) => b.views - a.views)
      .slice(0, 3);

    result.set(keyword, {
      keyword,
      raw_score: data.totalScore,
      video_count: data.videoIds.size,
      sample_titles: sortedTitles.map((t) => t.title),
      sample_video_ids: sortedTitles.map((t) => t.videoId),
    });
  }

  return result;
}

// ==================== 트렌드 점수 계산 ====================

/**
 * 급상승 점수 계산
 * @param todayScore - 오늘 키워드 점수
 * @param last7DaysScores - 지난 7일 점수 배열
 * @returns trend_score = 오늘점수 / (지난7일평균 + 0.1)
 */
export function calculateTrendScore(
  todayScore: number,
  last7DaysScores: number[]
): number {
  if (last7DaysScores.length === 0) {
    // 과거 데이터 없으면 오늘 점수만으로 판단
    return todayScore;
  }

  const average = last7DaysScores.reduce((sum, score) => sum + score, 0) / last7DaysScores.length;
  const epsilon = 0.1; // 0으로 나누기 방지

  return todayScore / (average + epsilon);
}

/**
 * 특정 키워드의 과거 7일 점수 조회
 */
async function fetchLast7DaysScores(
  keyword: string,
  categoryId: string,
  period: 'daily' | 'weekly' | 'monthly',
  regionCode: string,
  snapshotDate: string
): Promise<number[]> {
  const supabase = createServerClient();

  // 7일 전 날짜 계산
  const endDate = new Date(snapshotDate);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const { data, error } = await supabase
    .from('category_keywords_trend')
    .select('raw_score')
    .eq('keyword', keyword)
    .eq('category_id', categoryId)
    .eq('period', period)
    .eq('region_code', regionCode)
    .gte('snapshot_date', startDate.toISOString().split('T')[0])
    .lt('snapshot_date', snapshotDate);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.raw_score);
}

// ==================== 메인 로직 ====================

/**
 * 카테고리별 키워드 추출 및 저장
 * @param snapshotDate - 기준일 (YYYY-MM-DD)
 * @param categoryId - YouTube videoCategoryId
 * @param period - daily/weekly/monthly
 * @param regionCode - 국가 코드
 */
export async function extractKeywordsForCategory(
  snapshotDate: string,
  categoryId: string,
  period: 'daily' | 'weekly' | 'monthly',
  regionCode: string = 'KR'
): Promise<number> {
  const supabase = createServerClient();

  console.log(`\n📊 키워드 추출 시작: ${categoryId} / ${period}`);

  // 1. 해당 기간 영상 조회
  const snapshotDateObj = new Date(snapshotDate);
  let startDate: Date;

  if (period === 'daily') {
    startDate = new Date(snapshotDate);
  } else if (period === 'weekly') {
    startDate = new Date(snapshotDateObj);
    startDate.setDate(startDate.getDate() - 6);
  } else {
    // monthly
    startDate = new Date(snapshotDateObj);
    startDate.setDate(startDate.getDate() - 29);
  }

  const { data: videos, error: fetchError } = await supabase
    .from('category_shorts_snapshot')
    .select('video_id, title, description, tags, view_count, published_at')
    .eq('snapshot_date', snapshotDate)
    .eq('category_id', categoryId)
    .eq('region_code', regionCode)
    .gte('published_at', startDate.toISOString())
    .lte('published_at', snapshotDateObj.toISOString());

  if (fetchError || !videos || videos.length === 0) {
    console.log(`⚠️ 영상 없음: ${fetchError?.message}`);
    return 0;
  }

  console.log(`📹 영상 수: ${videos.length}개`);

  // 2. 키워드 점수 계산
  const keywordScores = calculateKeywordScores(videos);

  console.log(`🔑 키워드 수: ${keywordScores.size}개`);

  // 3. 상위 N개만 저장 (너무 많으면 DB 부담)
  const topKeywords = Array.from(keywordScores.values())
    .sort((a, b) => b.raw_score - a.raw_score)
    .slice(0, 200); // TOP 200

  // 4. 트렌드 점수 계산 및 DB 저장
  const rows = await Promise.all(
    topKeywords.map(async (kw) => {
      const last7DaysScores = await fetchLast7DaysScores(
        kw.keyword,
        categoryId,
        period,
        regionCode,
        snapshotDate
      );

      const trendScore = calculateTrendScore(kw.raw_score, last7DaysScores);

      return {
        snapshot_date: snapshotDate,
        region_code: regionCode,
        category_id: categoryId,
        period,
        keyword: kw.keyword,
        raw_score: kw.raw_score,
        trend_score: trendScore,
        video_count: kw.video_count,
        sample_titles: kw.sample_titles,
        sample_video_ids: kw.sample_video_ids,
      };
    })
  );

  // 5. DB 저장
  const { error: insertError } = await supabase
    .from('category_keywords_trend')
    .upsert(rows, {
      onConflict: 'snapshot_date,region_code,category_id,period,keyword',
    });

  if (insertError) {
    throw new Error(`키워드 저장 실패: ${insertError.message}`);
  }

  console.log(`✅ 키워드 저장 완료: ${rows.length}개`);

  return rows.length;
}
