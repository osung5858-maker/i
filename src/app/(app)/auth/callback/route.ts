import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const cookiesToSetLater: { name: string; value: string; options: any }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cs) {
            cs.forEach(({ name, value, options }) => {
              // cookieStore에도 설정하고, 나중에 Response에도 복사
              cookieStore.set(name, value, options)
              cookiesToSetLater.push({ name, value, options })
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`)

      // Supabase 세션 쿠키를 Response에도 복사
      for (const c of cookiesToSetLater) {
        res.cookies.set(c.name, c.value, c.options)
      }

      // Google Fit provider token 저장
      if (data.session?.provider_token) {
        res.cookies.set('gfit_token', data.session.provider_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 3600,
          path: '/',
        })
      }
      if (data.session?.provider_refresh_token) {
        res.cookies.set('gfit_refresh', data.session.provider_refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        })
      }

      return res
    }
  }

  return NextResponse.redirect(`${origin}/onboarding?error=auth`)
}
