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
import { hasKoreanCharacter } from '@/app/lib/utils/text';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SHORTS_CATEGORIES } from '@/app/lib/constants/shorts-categories';

// ==================== 키워드 불용어 리스트 ====================
const KEYWORD_STOPWORDS = [
  // 미디어/방송 관련
  '뉴스', 'news', '속보', '긴급', '단독', '라이브', 'live', '방송', '생방송',
  // 쇼츠/영상 관련
  '쇼츠', 'shorts', '영상', '클립', '풀버전', '하이라이트', '리뷰',
  // 일반 기능어
  '오늘', '지금', '편', '시즌', 'part', '파트',
  // 카테고리명
  '스포츠', '게임', '음악', '영화', '코미디', '엔터테인먼트',
];

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
    .lte('published_at', snapshotDateObj.toISOString())
    .limit(10000);

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

// ==================== Gemini 기반 키워드 추출 (v1) ====================

interface GeminiKeywordResult {
  keyword: string;
  video_ids: string[];
}

/**
 * Gemini를 사용해 영상 제목에서 핫 키워드 추출
 * @param videos - 영상 목록 (id, title, views)
 * @returns 키워드 + video_ids 배열
 */
async function extractKeywordsWithGemini(
  videos: { id: string; title: string; views: number }[]
): Promise<GeminiKeywordResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const videosJson = JSON.stringify(videos, null, 2);

  const prompt = `
너는 유튜브 쇼츠 인기 영상 목록에서 "핫 키워드"를 뽑는 도우미다.

[중요 전제]
- 입력으로 들어오는 영상들은 이미 같은 카테고리, 같은 국가(KR) 데이터다.
- 제목은 모두 한국어를 포함하고 있다.
- 너는 "영상 비교"를 하는 것이 아니라,
  "제목들에서 자주 반복되는 의미 있는 키워드/구"만 뽑으면 된다.

[입력 데이터 형식]
- videos: 유튜브 영상 목록
- 각 원소는 다음 필드를 가진다:
  - id: 영상 ID (문자열, 고유값)
  - title: 영상 제목 (문자열)
  - views: 조회수 (정수)

[입력 데이터]
${videosJson}

[해야 할 일]
1. title들을 전부 읽고, 자주 등장하는 "의미 있는 키워드 또는 짧은 구"를 뽑아라.
   - 예시: "삼성", "아이폰", "카카오맵", "카드 부정결제", "로봇청소기", "손흥민", "김연경" 등
   - 브랜드, 인물, 사건/이슈, 제품명, 기술명, 서비스명, 나라/지역, 스포츠 팀 등
2. 단순한 기능어/불용어는 모두 버려라. 예를 들어:
   - "뉴스", "오늘", "속보", "긴급", "영상", "쇼츠", "클립", "풀버전", "라이브",
     "EP", "회", "방송", "단독", "지금", "영상입니다", "이것은", "합니다" 같은 말
   - 숫자/시간/날짜만으로 된 표현 (예: "2025", "1부", "2부", "0:30" 등)
3. 각 키워드에 대해, 그 키워드가 제목에 등장하는 video_id 목록을 모두 모아라.
   - video_ids에는 입력 데이터의 "id"를 그대로 사용한다.
   - 키워드 당 video_ids 개수가 3개 미만이라면, 그 키워드는 결과에서 제외해라.
     (즉, 최소 3개 이상의 영상 제목에 등장하는 키워드만 남긴다.)
4. 키워드는 중요도 순으로 정렬하라.
   - 대략적으로 "등장하는 영상 개수"와 "등장하는 영상들의 조회수 규모"를 함께 고려해서
     중요도가 높다고 생각되는 순으로 나열하면 된다.
   - 정확한 수치는 계산할 필요 없다. 정렬 순서만 대략 맞으면 된다.
5. 최종적으로 최대 30개까지만 남겨라.
   - 중요도가 낮은 키워드는 잘라내도 좋다.

[출력 형식]
반드시 아래 JSON 형식 "하나만" 출력해야 한다.
설명 문장, 주석, 코드 블록 마크다운은 넣지 마라.

{
  "keywords": [
    {
      "keyword": "핵심 키워드 또는 짧은 구",
      "video_ids": ["영상ID1", "영상ID2", "영상ID3"]
    }
  ]
}

[출력 시 유의사항]
- JSON 외의 다른 텍스트는 절대 출력하지 마라.
- keyword는 한국어를 우선으로 사용하되, 고유명사가 영어라면 영어 그대로 사용해도 된다.
- video_ids에는 반드시 입력 데이터의 id만 사용하고, 중복 없이 넣어라.
`;

  try {
    console.log(`[Gemini] 키워드 추출 요청 중... (영상 ${videos.length}개)`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    });

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // JSON 파싱 전 정제 (```json 마크다운 제거)
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const parsed = JSON.parse(text);

    if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
      console.error('[Gemini] 응답 형식 오류:', text.substring(0, 200));
      return [];
    }

    console.log(`[Gemini] ✅ 키워드 ${parsed.keywords.length}개 추출 완료`);
    return parsed.keywords;
  } catch (error: any) {
    console.error('[Gemini] 키워드 추출 실패:', error.message);
    return [];
  }
}

// ==================== 한국 전용 일일 키워드 분석 ====================

/**
 * 한국어 영상 기반 일일 키워드 분석 (v1)
 * - region_code = 'KR' 고정
 * - 한글 포함 제목만 필터링
 * - Gemini로 키워드 추출
 * @param targetDate - 분석 대상 날짜 (YYYY-MM-DD)
 */
export async function runDailyKeywordAnalysisKR(targetDate: string): Promise<void> {
  const supabase = createServerClient();

  console.log(`\n🇰🇷 [한국 키워드 분석] 시작: ${targetDate}`);

  // 1. 해당 날짜 + KR 지역 영상 가져오기 (Pagination으로 전체 로드)
  let allVideos: {
    video_id: string;
    category_id: string;
    title: string;
    view_count: number;
  }[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batch, error: fetchError } = await supabase
      .from('category_shorts_snapshot')
      .select('video_id, category_id, title, view_count')
      .eq('region_code', 'KR')
      .eq('snapshot_date', targetDate)
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      console.error('❌ 영상 로드 실패:', fetchError.message);
      return;
    }

    if (!batch || batch.length === 0) break;

    allVideos = [...allVideos, ...batch];
    offset += batchSize;

    // 마지막 페이지면 종료
    if (batch.length < batchSize) break;
  }

  if (allVideos.length === 0) {
    console.log(`⚠️ ${targetDate} KR 영상 없음`);
    return;
  }

  console.log(`📹 전체 KR 영상: ${allVideos.length}개`);

  // 2. 카테고리별 그룹핑
  const videosByCategory: Record<string, typeof allVideos> = {};
  for (const v of allVideos) {
    if (!videosByCategory[v.category_id]) {
      videosByCategory[v.category_id] = [];
    }
    videosByCategory[v.category_id].push(v);
  }

  // 3. 카테고리별 키워드 분석
  for (const [categoryId, categoryVideos] of Object.entries(videosByCategory)) {
    const categoryLabel = SHORTS_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;

    // 3-1. 한국어 제목 포함 영상만 필터링
    const koreanVideos = categoryVideos.filter((v) => hasKoreanCharacter(v.title));

    // 3-2. 너무 적으면 스킵
    if (koreanVideos.length < 10) {
      console.log(`⏭️ [${categoryLabel}] 한글 영상 ${koreanVideos.length}개 - 스킵 (최소 10개 필요)`);
      continue;
    }

    console.log(`\n📊 [${categoryLabel}] 한글 영상 ${koreanVideos.length}개 분석 중...`);

    // 3-3. Gemini 입력 데이터 준비
    const geminiInput = koreanVideos.map((v) => ({
      id: v.video_id,
      title: v.title,
      views: v.view_count ?? 0,
    }));

    // 3-4. Gemini로 키워드 추출
    const keywordGroupsRaw = await extractKeywordsWithGemini(geminiInput);

    // 3-5. 불용어 필터링
    const keywordGroups = keywordGroupsRaw.filter(
      (g) => !KEYWORD_STOPWORDS.includes(g.keyword.toLowerCase())
    );

    if (keywordGroups.length === 0) {
      console.log(`⚠️ [${categoryLabel}] 키워드 추출 결과 없음`);
      continue;
    }

    // 3-6. 중복 키워드 병합 (video_ids 합치기)
    const mergedKeywords = new Map<string, Set<string>>();
    for (const group of keywordGroups) {
      if (!mergedKeywords.has(group.keyword)) {
        mergedKeywords.set(group.keyword, new Set());
      }
      for (const vid of group.video_ids) {
        mergedKeywords.get(group.keyword)!.add(vid);
      }
    }

    // 3-6. 각 키워드별 점수 계산
    const rowsToUpsert: any[] = [];

    for (const [keyword, videoIdSet] of mergedKeywords.entries()) {
      const videoIds = Array.from(videoIdSet);

      // 해당 키워드에 연결된 영상들
      const relatedVideos = koreanVideos.filter((v) =>
        videoIds.includes(v.video_id)
      );

      if (relatedVideos.length === 0) continue;

      const videoCount = relatedVideos.length;
      const totalViews = relatedVideos.reduce(
        (sum, v) => sum + (v.view_count ?? 0),
        0
      );
      const avgViews = Math.floor(totalViews / videoCount);

      // raw_score: 0.5 * log(total_views + 1) + 0.5 * log(video_count + 1)
      const normalizedViews = Math.log(totalViews + 1);
      const normalizedCount = Math.log(videoCount + 1);
      const rawNow = 0.5 * normalizedViews + 0.5 * normalizedCount;

      // 직전 일자 raw_score 가져와서 trend 계산
      const { data: prevRow } = await supabase
        .from('category_keywords_trend')
        .select('raw_score')
        .eq('category_id', categoryId)
        .eq('region_code', 'KR')
        .eq('period', 'daily')
        .eq('keyword', keyword)
        .lt('snapshot_date', targetDate)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const rawPrev = prevRow?.raw_score ?? 0;
      const trendScore = rawNow / (rawPrev + 1);

      // 샘플 제목/ID (상위 3개)
      const sortedVideos = relatedVideos
        .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
        .slice(0, 3);

      rowsToUpsert.push({
        snapshot_date: targetDate,
        region_code: 'KR',
        category_id: categoryId,
        period: 'daily',
        keyword,
        video_count: videoCount,
        total_views: totalViews,
        avg_views: avgViews,
        raw_score: rawNow,
        trend_score: trendScore,
        sample_titles: sortedVideos.map((v) => v.title),
        sample_video_ids: sortedVideos.map((v) => v.video_id),
      });
    }

    // 3-6. DB 저장
    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('category_keywords_trend')
        .upsert(rowsToUpsert, {
          onConflict: 'snapshot_date,region_code,category_id,period,keyword',
        });

      if (upsertError) {
        console.error(`❌ [${categoryLabel}] 키워드 저장 실패:`, upsertError.message);
      } else {
        console.log(`✅ [${categoryLabel}] 키워드 ${rowsToUpsert.length}개 저장 완료`);
      }
    }
  }

  console.log(`\n🇰🇷 [한국 키워드 분석] 완료: ${targetDate}`);
}
