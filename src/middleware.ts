import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/** 서브도메인 → 경로 매핑 (도담 생태계) */
const SUBDOMAIN_ROUTES: Record<string, string> = {
  today: '/today',
  // 향후 서비스 추가 시:
  // map: '/map',
  // town: '/town',
  // growth: '/growth',
  // community: '/community',
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // 서브도메인 추출: "today.dodam.life" → "today"
  const subdomain = hostname.split('.')[0]

  // 서브도메인 라우팅: today.dodam.life → /today
  if (subdomain in SUBDOMAIN_ROUTES) {
    const targetPath = SUBDOMAIN_ROUTES[subdomain]

    // 이미 올바른 경로에 있으면 통과
    if (!pathname.startsWith(targetPath)) {
      const url = request.nextUrl.clone()
      url.pathname = targetPath + pathname
      return NextResponse.rewrite(url)
    }
  }

  // 기존 인증 미들웨어
  try {
    return await updateSession(request)
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images|videos|manifest.json|sw.js|.*\\.png$|.*\\.webm$).*)',
  ],
}
