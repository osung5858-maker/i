/**
 * API 라우트용 Supabase 인증 헬퍼
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * 현재 요청의 인증된 사용자를 반환.
 * 인증 실패 시 null 반환.
 */
export async function getAuthUser() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

/**
 * 소프트 인증 체크 — 실패해도 null 반환 (401 안 보냄)
 * Rate limit은 IP 기반으로 폴백
 */
export async function getAuthUserSoft() {
  try {
    return await getAuthUser()
  } catch {
    return null
  }
}

/**
 * 인증 실패 시 401 응답 생성
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: '로그인이 필요합니다' },
    { status: 401 },
  )
}
