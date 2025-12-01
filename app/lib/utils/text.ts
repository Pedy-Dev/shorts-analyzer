/**
 * 텍스트 관련 공용 유틸리티 함수
 */

/**
 * 문자열에 한글이 포함되어 있는지 확인
 * - 한글 자음/모음 (ㄱ-ㅎ, ㅏ-ㅣ)
 * - 한글 음절 (가-힣)
 */
export function hasKoreanCharacter(text: string | null | undefined): boolean {
  if (!text) return false;
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text);
}
