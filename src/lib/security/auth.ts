/**
 * API 라우트용 Supabase 인증 헬퍼
 * - 웹: 쿠키 기반 인증
 * - 네이티브 앱(Flutter): Authorization: Bearer <token> 헤더
 */
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * 현재 요청의 인증된 사용자를 반환.
 * 1) Authorization: Bearer <token> 헤더가 있으면 토큰으로 인증 (Flutter 네이티브)
 * 2) 없으면 쿠키 기반 인증 (웹)
 * 인증 실패 시 null 반환.
 */
export async function getAuthUser() {
  try {
    // 1. Bearer 토큰 체크 (Flutter 네이티브 앱)
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) return user
    }

    // 2. 쿠키 기반 인증 (웹 브라우저)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component에서는 set 불가 — 무시
            }
          },
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
