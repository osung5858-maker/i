import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // /admin/* 라우트 보호: 어드민 role 체크
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
    const role = user.app_metadata?.role
    if (role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // 비로그인 허용 경로
  const publicPaths = [
    '/onboarding', '/invite', '/auth/callback',
    '/api/',        // API 라우트 (자체 인증 처리)
    '/landing',     // 랜딩 페이지
    '/privacy', '/terms',
    '/map', '/emergency',
    '/babyfood', '/gov-support', '/guide',
  ]
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  if (!user && !isPublic && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
