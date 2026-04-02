/**
 * LocalStorage 유틸리티
 *
 * 전체 코드베이스에서 일관된 스토리지 접근 패턴 제공
 * - 자동 에러 처리
 * - 타입 안전성
 * - SSR 호환
 * - 암호화 지원
 */

import { getSecure as getSecureOriginal, setSecure as setSecureOriginal } from '@/lib/secureStorage'

/**
 * 일반 LocalStorage 읽기
 */
export function get<T>(key: string): T | null
export function get<T>(key: string, defaultValue: T): T
export function get<T>(key: string, defaultValue?: T): T | null {
  if (typeof window === 'undefined') {
    return defaultValue ?? null
  }

  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue ?? null
    return JSON.parse(item) as T
  } catch (error) {
    console.warn(`[Storage] Failed to get '${key}':`, error)
    return defaultValue ?? null
  }
}

/**
 * 일반 LocalStorage 쓰기
 */
export function set(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[Storage] Failed to set '${key}':`, error)
    return false
  }
}

/**
 * LocalStorage에서 키 제거
 */
export function remove(key: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`[Storage] Failed to remove '${key}':`, error)
    return false
  }
}

/**
 * LocalStorage 전체 삭제
 */
export function clear(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    localStorage.clear()
    return true
  } catch (error) {
    console.error('[Storage] Failed to clear:', error)
    return false
  }
}

/**
 * 특정 키가 존재하는지 확인
 */
export function has(key: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return localStorage.getItem(key) !== null
}

/**
 * 암호화된 데이터 읽기 (기존 secureStorage 래핑)
 */
export function getSecure<T>(key: string): T | null
export function getSecure<T>(key: string, defaultValue: T): T
export function getSecure<T>(key: string, defaultValue?: T): T | null {
  try {
    const value = getSecureOriginal(key)
    if (value === null) return defaultValue ?? null
    return value as T
  } catch (error) {
    console.warn(`[Storage] Failed to get secure '${key}':`, error)
    return defaultValue ?? null
  }
}

/**
 * 암호화된 데이터 쓰기 (기존 secureStorage 래핑)
 */
export function setSecure(key: string, value: unknown): boolean {
  try {
    setSecureOriginal(key, value as string)
    return true
  } catch (error) {
    console.error(`[Storage] Failed to set secure '${key}':`, error)
    return false
  }
}

/**
 * 스토리지 용량 체크 (MB 단위)
 */
export function getStorageSize(): number {
  if (typeof window === 'undefined') {
    return 0
  }

  let total = 0
  try {
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += localStorage[key].length + key.length
      }
    }
    return Math.round((total * 2) / 1024 / 1024 * 100) / 100 // MB, 2 bytes per char
  } catch {
    return 0
  }
}

/**
 * 네임스페이스 기반 스토리지 관리
 */
export function createNamespace(prefix: string) {
  return {
    get: <T>(key: string, defaultValue?: T) => get<T>(`${prefix}_${key}`, defaultValue as T),
    set: (key: string, value: unknown) => set(`${prefix}_${key}`, value),
    remove: (key: string) => remove(`${prefix}_${key}`),
    has: (key: string) => has(`${prefix}_${key}`),
    getSecure: <T>(key: string, defaultValue?: T) => getSecure<T>(`${prefix}_${key}`, defaultValue as T),
    setSecure: (key: string, value: unknown) => setSecure(`${prefix}_${key}`, value),
  }
}

// 네임스페이스 예시
export const dodamStorage = createNamespace('dodam')
export const cacheStorage = createNamespace('cache')
export const sessionStorage = createNamespace('session')
