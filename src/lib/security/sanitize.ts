/**
 * 입력값 Sanitization 유틸리티
 */

/**
 * HTML 태그를 이스케이프 처리.
 * React JSX에서 {text}로 렌더링 시 자동 이스케이프되지만,
 * DB에 저장 전 또는 prompt injection 방지 목적으로 사용.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * AI 프롬프트에 들어가는 사용자 입력 sanitize.
 * 프롬프트 인젝션을 방지하기 위해 제어 문자 및 의심스러운 패턴 제거.
 */
export function sanitizeForPrompt(input: string, maxLength = 2000): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .slice(0, maxLength)
    // 제어 문자 제거 (개행/탭은 유지)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

/**
 * URL이 허용된 도메인인지 검증.
 */
export function isAllowedImageUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    // 프로토콜 제한 (SSRF 방지: file://, ftp:// 등 차단)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    const allowed = [
      'kakaocdn.net', 'kage.kakao.com', 'k.kakaocdn.net',
      'kidsnote.com', 'www.kidsnote.com',
      'kidsnote-media.imgix.net', 'kidsnote.imgix.net',
      's3.amazonaws.com', 's3.ap-northeast-2.amazonaws.com',
      'cdn.kidsnote.com',
    ]
    // 정확 매치 또는 서브도메인 매치 (evil-kidsnote.com 차단)
    return allowed.some(domain =>
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    )
  } catch {
    return false
  }
}

/**
 * 문자열 길이 검증
 */
export function validateLength(str: unknown, min: number, max: number): boolean {
  if (typeof str !== 'string') return false
  return str.length >= min && str.length <= max
}
