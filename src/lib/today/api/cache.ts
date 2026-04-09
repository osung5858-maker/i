/**
 * 인메모리 캐시 유틸 — TTL별 Map 관리
 * Vercel Serverless: 콜드스타트 시 캐시 초기화, Warm Function에서 유지
 */

interface CacheEntry<T> {
  data: T;
  expireAt: number; // Unix timestamp (ms)
}

/** TTL 상수 (ms) */
export const CACHE_TTL = {
  AIRKOREA: 30 * 60 * 1000,       // 30분
  KMA_FORECAST: 60 * 60 * 1000,   // 1시간
  KMA_UV: 6 * 60 * 60 * 1000,     // 6시간
  KDCA: 24 * 60 * 60 * 1000,      // 24시간
  SCORE: 30 * 60 * 1000,          // 30분 (최소 TTL 기준)
} as const;

class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5분

  /** 캐시 조회 — 만료 시 null 반환 */
  get<T>(key: string): T | null {
    this.maybeCleanup();
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /** 캐시 저장 */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expireAt: Date.now() + ttlMs,
    });
  }

  /** 패턴 매칭으로 캐시 삭제 */
  clear(pattern?: RegExp): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /** 만료된 엔트리 정리 */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expireAt) {
        this.cache.delete(key);
      }
    }
    this.lastCleanup = now;
  }

  /** 5분 주기 자동 정리 */
  private maybeCleanup(): void {
    if (Date.now() - this.lastCleanup > this.CLEANUP_INTERVAL) {
      this.cleanup();
    }
  }

  /** 캐시 사이즈 (디버깅용) */
  get size(): number {
    return this.cache.size;
  }
}

// 싱글턴 인스턴스 (Serverless Function 인스턴스 당 1개)
export const cacheManager = new CacheManager();
