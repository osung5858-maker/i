import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Google OAuth refresh token으로 새 access token 발급.
 * gfit_token/gfit_refresh 쿠키에 저장된 토큰은 Fit + Drive 모두에 사용됨.
 */
export async function refreshGoogleToken(rt: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret || !rt) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: rt,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.access_token || null
}

/**
 * httpOnly 쿠키에서 Google access token 추출.
 * 만료 시 refresh token으로 자동 갱신.
 */
export async function getGoogleToken(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  let token = cookieStore.get('gfit_token')?.value || null
  const refresh = cookieStore.get('gfit_refresh')?.value || null
  let newToken: string | null = null

  if (!token && refresh) {
    newToken = await refreshGoogleToken(refresh)
    token = newToken
  }

  return { token, refresh, newToken }
}

/**
 * 갱신된 토큰을 NextResponse 쿠키에 저장하는 헬퍼.
 */
export function setTokenCookie(response: NextResponse, newToken: string) {
  response.cookies.set('gfit_token', newToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 3600,
    path: '/',
  })
}
