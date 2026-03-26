import { NextRequest, NextResponse } from 'next/server'
import { isAllowedImageUrl } from '@/lib/security/sanitize'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'

export async function GET(request: NextRequest) {
  // Rate limit 체크 (이미지 프록시는 IP 기반, 분당 60회)
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`kn-image:${ip}`, { limit: 60, windowMs: 60_000 })
  if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const url = request.nextUrl.searchParams.get('url')
  // URL 파싱 기반 도메인 검증 (SSRF 방지)
  if (!url || !isAllowedImageUrl(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.kidsnote.com/',
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!res.ok) return NextResponse.json({ error: 'Fetch failed' }, { status: res.status })

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
