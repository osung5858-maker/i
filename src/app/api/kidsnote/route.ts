import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, unauthorizedResponse } from '@/lib/security/auth'
import { checkRateLimit, getClientIP, DEFAULT_RATE_LIMIT } from '@/lib/security/rate-limit'

const KN_BASE = 'https://www.kidsnote.com/api'

// 이미지 URL을 프록시 경로로 변환
function proxyImg(url: string): string {
  if (!url) return ''
  return `/api/kidsnote/image?url=${encodeURIComponent(url)}`
}

// 키즈노트 응답을 도담 형식으로 변환
function normalizeItem(item: any) {
  return {
    id: item.id,
    title: item.title || item.child_name || '',
    content: item.content || '',
    created: item.created || item.date_written || '',
    author: item.author_name || item.author?.name || '',
    images: (item.attached_images || []).map((img: any) => ({
      original: proxyImg(img.original || ''),
      thumbnail: proxyImg(img.small || img.small_resize || img.original || ''),
      large: proxyImg(img.large || img.large_resize || img.original || ''),
    })),
    weather: item.weather || null,
    childName: item.child_name || '',
  }
}

export async function POST(request: NextRequest) {
  // 인증 체크
  const user = await getAuthUser()
  if (!user) return unauthorizedResponse()

  // Rate limit 체크
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`kidsnote:${user.id || ip}`, DEFAULT_RATE_LIMIT)
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 })

  const body = await request.json()
  const { action, username, password, sessionCookie, childId, cursor } = body

  try {
    // === 로그인 ===
    if (action === 'login') {
      const res = await fetch(`${KN_BASE}/web/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        redirect: 'manual',
      })

      const setCookies = res.headers.getSetCookie?.() || []
      const cookies = setCookies.map(c => c.split(';')[0]).join('; ')

      if (!cookies) {
        const errText = await res.text().catch(() => '')
        return NextResponse.json({ error: '로그인 실패. 아이디/비밀번호를 확인해주세요.', detail: errText }, { status: 401 })
      }

      const infoRes = await fetch(`${KN_BASE}/v1/me/info`, { headers: { Cookie: cookies } })
      const info = await infoRes.json().catch(() => null)

      // children 정규화
      const children = (info?.children || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        birthdate: c.date_birth,
        gender: c.gender,
        picture: c.picture,
      }))

      return NextResponse.json({ success: true, sessionCookie: cookies, children })
    }

    // === 내 아이 목록 ===
    if (action === 'children') {
      if (!sessionCookie) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
      const res = await fetch(`${KN_BASE}/v1/me/info`, { headers: { Cookie: sessionCookie } })
      const data = await res.json()
      const children = (data?.children || []).map((c: any) => ({
        id: c.id, name: c.name, birthdate: c.date_birth, gender: c.gender,
      }))
      return NextResponse.json({ children })
    }

    // cursor가 전체 URL인지 토큰인지 판별해서 URL 구성
    function buildPageUrl(base: string, cursor: string | undefined) {
      if (!cursor) return base
      // kidsnote API는 next를 전체 URL로 반환할 수 있음
      if (cursor.startsWith('http')) return cursor
      return `${base}?cursor=${cursor}&page_size=20`
    }

    // === 앨범 ===
    if (action === 'albums') {
      if (!sessionCookie || !childId) return NextResponse.json({ error: '파라미터 부족' }, { status: 400 })
      const baseUrl = `${KN_BASE}/v1_2/children/${childId}/albums?page_size=20`
      const url = buildPageUrl(baseUrl, cursor)
      const res = await fetch(url, { headers: { Cookie: sessionCookie } })
      const data = await res.json()
      // next에서 cursor 토큰만 추출 (중복 방지)
      const nextCursor = data.next
        ? (data.next.startsWith('http') ? data.next : data.next)
        : null
      return NextResponse.json({
        count: data.count || 0,
        next: nextCursor,
        results: (data.results || []).map(normalizeItem),
      })
    }

    // === 알림장 ===
    if (action === 'reports') {
      if (!sessionCookie || !childId) return NextResponse.json({ error: '파라미터 부족' }, { status: 400 })
      const baseUrl = `${KN_BASE}/v1_2/children/${childId}/reports?page_size=20`
      const url = buildPageUrl(baseUrl, cursor)
      const res = await fetch(url, { headers: { Cookie: sessionCookie } })
      const data = await res.json()
      const nextCursor = data.next
        ? (data.next.startsWith('http') ? data.next : data.next)
        : null
      return NextResponse.json({
        count: data.count || 0,
        next: nextCursor,
        results: (data.results || []).map(normalizeItem),
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: `서버 오류: ${e}` }, { status: 500 })
  }
}
