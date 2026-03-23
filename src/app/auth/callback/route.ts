import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session) {
      // Google Fit 연동을 위해 provider_token 쿠키에 저장
      const res = NextResponse.redirect(`${origin}${next}`)
      if (data.session.provider_token) {
        res.cookies.set('gfit_token', data.session.provider_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 3600, // 1시간
          path: '/',
        })
      }
      if (data.session.provider_refresh_token) {
        res.cookies.set('gfit_refresh', data.session.provider_refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30일
          path: '/',
        })
      }
      return res
    }
  }

  // 에러 시 온보딩으로
  return NextResponse.redirect(`${origin}/onboarding?error=auth`)
}
