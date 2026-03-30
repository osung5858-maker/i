'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CACHE_TTL = 60 * 60 * 1000 // 1시간

function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`rc_${key}`)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data as T
  } catch {
    return null
  }
}

function setCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(`rc_${key}`, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

/**
 * Supabase app_content 테이블에서 key에 해당하는 JSON 데이터를 가져온다.
 * - 1시간 localStorage 캐시 사용
 * - fetch 실패 시 fallback(하드코딩 기본값) 반환
 */
export function useRemoteContent<T>(key: string, fallback: T): T {
  const [data, setData] = useState<T>(() => getCached<T>(key) ?? fallback)

  useEffect(() => {
    const cached = getCached<T>(key)
    if (cached) {
      setData(cached)
      return
    }
    const supabase = createClient()
    supabase
      .from('app_content')
      .select('data')
      .eq('key', key)
      .single()
      .then(({ data: row }: { data: { data: unknown } | null }) => {
        if (row?.data) {
          setData(row.data as T)
          setCache(key, row.data as T)
        }
      })
  }, [key])

  return data
}
