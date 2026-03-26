/**
 * 간이 IP 기반 Rate Limiter (인메모리)
 * - Vercel Serverless에서는 인스턴스별 메모리이므로 완벽하지 않지만 기본 방어 가능
 * - 프로덕션에서는 Upstash Redis 등으로 교체 권장
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// 주기적으로 만료된 엔트리 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL = 60_000 // 1분
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

export interface RateLimitConfig {
  /** 허용 요청 수 */
  limit: number
  /** 윈도우 기간 (밀리초) */
  windowMs: number
}

/** 기본 설정: 분당 30회 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  limit: 30,
  windowMs: 60_000,
}

/** AI API용 설정: 분당 10회 */
export const AI_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowMs: 60_000,
}

/**
 * Rate limit 체크. 초과 시 { limited: true } 반환.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): { limited: boolean; remaining: number; resetAt: number } {
  cleanup()

  const now = Date.now()
  const key = identifier
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { limited: false, remaining: config.limit - 1, resetAt: now + config.windowMs }
  }

  entry.count++
  if (entry.count > config.limit) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt }
  }

  return { limited: false, remaining: config.limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Request에서 IP 주소 추출
 */
export function getClientIP(request: Request): string {
  const headers = new Headers(request.headers)
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
