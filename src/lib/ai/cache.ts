/**
 * AI 응답 타입 정의
 */
export interface AIMealResponse {
  type: 'meal'
  recommendation: string
  nutritionTips?: string[]
  allergyWarnings?: string[]
}

export interface AITroubleshootResponse {
  type: 'troubleshoot'
  diagnosis: string
  suggestions: string[]
  severity: 'low' | 'medium' | 'high'
}

export interface AIEmergencyResponse {
  type: 'emergency'
  alert: string
  immediateActions: string[]
  whenToSeekHelp: string
}

export interface AIPregnantResponse {
  type: 'pregnant'
  weekInfo: string
  tips: string[]
  warnings?: string[]
}

export interface AIPreparingResponse {
  type: 'preparing'
  advice: string
  checklist?: string[]
}

export interface AITemperamentResponse {
  type: 'temperament'
  analysis: string
  traits: string[]
  parentingTips: string[]
}

export interface AINameResponse {
  type: 'name'
  suggestions: Array<{
    name: string
    meaning: string
    hanja?: string
  }>
}

export interface AIGrowthSimResponse {
  type: 'growth_sim'
  prediction: {
    height: number
    weight: number
    month: number
  }[]
  insights: string[]
}

export type AIResponse =
  | AIMealResponse
  | AITroubleshootResponse
  | AIEmergencyResponse
  | AIPregnantResponse
  | AIPreparingResponse
  | AITemperamentResponse
  | AINameResponse
  | AIGrowthSimResponse

interface CacheEntry {
  data: AIResponse | Record<string, unknown>
  expiry: number
  hitCount: number
}

// 서버 사이드 AI 응답 캐시 — 하루 단위
const cache = new Map<string, CacheEntry>()
let cacheHits = 0
let cacheMisses = 0

export function getCachedResponse(key: string): AIResponse | Record<string, unknown> | null {
  const entry = cache.get(key)
  if (!entry) {
    cacheMisses++
    return null
  }
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    cacheMisses++
    return null
  }
  entry.hitCount++
  cacheHits++
  return entry.data
}

export function setCachedResponse(key: string, data: AIResponse | Record<string, unknown>, ttlMs = 4 * 60 * 60 * 1000) {
  // 기본 4시간 캐시 (하루에 최대 6회만 호출)
  cache.set(key, { data, expiry: Date.now() + ttlMs, hitCount: 0 })

  // 캐시 크기 제한 (100개 초과 시 오래된 것 제거)
  if (cache.size > 100) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].expiry - b[1].expiry)[0]
    if (oldest) cache.delete(oldest[0])
  }
}

/**
 * 캐시 통계 (모니터링용)
 */
export interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
  totalEntries: number
}

export function getCacheStats(): CacheStats {
  const total = cacheHits + cacheMisses
  return {
    size: cache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? Math.round((cacheHits / total) * 100) : 0,
    totalEntries: cache.size,
  }
}

/**
 * 캐시 초기화 (테스트/개발용)
 */
export function clearCache() {
  cache.clear()
  cacheHits = 0
  cacheMisses = 0
}
