/**
 * YouTube Shorts 카테고리 상수 정의
 * 플레이보드와 동일한 카테고리 구조
 */

// YouTube videoCategoryId와 한글 카테고리명 매핑
export const SHORTS_CATEGORIES = [
  { id: '15', label: '애완동물/동물', ytName: 'Pets & Animals' },
  { id: '20', label: '게임', ytName: 'Gaming' },
  { id: '25', label: '뉴스/정치', ytName: 'News & Politics' },
  { id: '22', label: '인물/블로그', ytName: 'People & Blogs' },
  // 19 (여행/이벤트), 27 (교육), 29 (비영리) - 한국 mostPopular 차트 미지원
  { id: '24', label: '엔터테인먼트', ytName: 'Entertainment' },
  { id: '23', label: '코미디', ytName: 'Comedy' },
  { id: '28', label: '과학기술', ytName: 'Science & Technology' },
  { id: '26', label: '노하우/스타일', ytName: 'Howto & Style' },
  { id: '17', label: '스포츠', ytName: 'Sports' },
  { id: '1', label: '영화/애니메이션', ytName: 'Film & Animation' },
  { id: '2', label: '자동차/교통', ytName: 'Autos & Vehicles' },
] as const;

// 지원 국가 코드
export const REGION_CODES = [
  { code: 'KR', label: '한국', flag: '🇰🇷' },
  { code: 'US', label: '미국', flag: '🇺🇸' },
  { code: 'GB', label: '영국', flag: '🇬🇧' },
  { code: 'JP', label: '일본', flag: '🇯🇵' },
] as const;

// 기간 타입
export const PERIOD_TYPES = ['daily', 'weekly', 'monthly'] as const;

// 정렬 기준
export const SORT_TYPES = ['views', 'likes', 'comments'] as const;

// 타입 정의
export type CategoryId = typeof SHORTS_CATEGORIES[number]['id'];
export type RegionCode = typeof REGION_CODES[number]['code'];
export type PeriodType = typeof PERIOD_TYPES[number];
export type SortType = typeof SORT_TYPES[number];

// 카테고리 ID로 라벨 찾기 헬퍼
export function getCategoryLabel(categoryId: string): string {
  return SHORTS_CATEGORIES.find((c) => c.id === categoryId)?.label || '알 수 없음';
}

// 국가 코드로 라벨 찾기 헬퍼
export function getRegionLabel(regionCode: string): string {
  return REGION_CODES.find((r) => r.code === regionCode)?.label || '알 수 없음';
}

// 기간 타입 한글 변환
export function getPeriodLabel(period: PeriodType): string {
  const labels: Record<PeriodType, string> = {
    daily: '일간',
    weekly: '주간',
    monthly: '월간',
  };
  return labels[period];
}

// 정렬 타입 한글 변환
export function getSortLabel(sortType: SortType): string {
  const labels: Record<SortType, string> = {
    views: '조회수',
    likes: '좋아요',
    comments: '댓글',
  };
  return labels[sortType];
}
