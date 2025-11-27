/**
 * 키워드 분석용 불용어 사전
 * 의미 없는 단어 필터링
 */

// 한국어 불용어
export const KOREAN_STOPWORDS = [
  // 대명사/지시어
  '이', '그', '저', '이거', '그거', '저거', '이것', '그것', '저것',
  '여기', '거기', '저기', '이곳', '그곳', '저곳',
  '나', '너', '우리', '저희', '당신',

  // 조사/어미
  '의', '가', '이', '은', '는', '을', '를', '에', '에서', '로', '으로',
  '와', '과', '도', '만', '까지', '부터', '께서',

  // 일반 부사/형용사
  '매우', '너무', '정말', '진짜', '완전', '엄청', '아주', '좀', '조금',
  '많이', '적게', '빨리', '천천히', '잘', '못',

  // YouTube 관련 범용어
  '영상', '동영상', '쇼츠', '숏츠', '쇼트', '숏폼', '숏츠',
  '구독', '좋아요', '알림', '설정', '댓글', '공유',
  '유튜브', '유투브', '틱톡', '인스타', '인스타그램',
  '추천', '인기', '핫', '트렌드', '랭킹', '순위',

  // 시간 관련
  '오늘', '어제', '내일', '지금', '방금', '이번', '다음', '지난',
  '년', '월', '일', '시', '분', '초',

  // 숫자/단위
  '개', '명', '번', '회', '째', '등', '위',

  // 범용 동사
  '하다', '되다', '있다', '없다', '보다', '하는', '된', '하고',
  '합니다', '입니다', '해요', '이에요',

  // 기타 범용어
  '것', '거', '때', '곳', '수', '등', '및', '또', '또는', '그리고',
  '하지만', '그러나', '그래서', '따라서',
];

// 영어 불용어
export const ENGLISH_STOPWORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its',
  'youtube', 'shorts', 'short', 'video', 'subscribe', 'like', 'comment',
  'share', 'trending', 'viral', 'hot', 'top',
];

// 전체 불용어 (소문자 변환)
export const ALL_STOPWORDS = new Set([
  ...KOREAN_STOPWORDS.map((w) => w.toLowerCase()),
  ...ENGLISH_STOPWORDS.map((w) => w.toLowerCase()),
]);

/**
 * 불용어 체크
 */
export function isStopword(word: string): boolean {
  return ALL_STOPWORDS.has(word.toLowerCase());
}

/**
 * 특수문자/이모지 제거 정규식
 */
export const SPECIAL_CHARS_REGEX = /[^\p{L}\p{N}\s]/gu; // 문자, 숫자, 공백만 허용

/**
 * 숫자만 있는지 체크
 */
export function isOnlyNumbers(word: string): boolean {
  return /^\d+$/.test(word);
}

/**
 * 최소 단어 길이
 */
export const MIN_KEYWORD_LENGTH = 2;
