import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthUser, unauthorizedResponse } from '@/lib/security/auth'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'
import { isAllowedImageUrl } from '@/lib/security/sanitize'
import { refreshGoogleToken, getGoogleToken, setTokenCookie } from '@/lib/google/token'

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorizedResponse()

  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`gdrive:${user.id || ip}`, { limit: 60, windowMs: 60_000 })
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const body = await request.json().catch(() => null)
  if (!body?.imageUrl || !body?.fileName) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  const { imageUrl, fileName: rawFileName, folderId } = body as { imageUrl: string; fileName: string; folderId?: string }

  // fileName 검증: 길이 제한 + 경로 탐색 차단
  const fileName = (rawFileName || '').replace(/[\/\\]/g, '_').slice(0, 200)
  if (!fileName) {
    return NextResponse.json({ error: 'invalid_filename' }, { status: 400 })
  }

  // folderId 검증: Google Drive ID 형식 (영숫자+하이픈+언더스코어)
  if (folderId && !/^[a-zA-Z0-9_-]+$/.test(folderId)) {
    return NextResponse.json({ error: 'invalid_folder_id' }, { status: 400 })
  }

  // SSRF 방지: kidsnote 이미지 URL만 허용
  if (!isAllowedImageUrl(imageUrl)) {
    return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const tokenResult = await getGoogleToken(cookieStore)
  const { refresh } = tokenResult
  let { token, newToken } = tokenResult

  if (!token) {
    return NextResponse.json({ error: 'no_google_token' }, { status: 401 })
  }

  try {
    // 이미지 다운로드 (kidsnote 프록시와 동일 방식, redirect 차단으로 SSRF 방지)
    const imgRes = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://www.kidsnote.com/',
        'User-Agent': 'Mozilla/5.0',
      },
      redirect: 'error',
    })
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'image_fetch_failed' }, { status: 502 })
    }
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const imageBuffer = Buffer.from(await imgRes.arrayBuffer())

    // Google Drive multipart upload
    const mimeType = contentType.split(';')[0].trim() || 'image/jpeg'
    const uploadToDrive = async (accessToken: string) => {
      const boundary = `dodam-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const metadata = JSON.stringify({
        name: fileName,
        parents: [folderId || 'root'],
        mimeType,
      })

      const parts = [
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      ]

      const bodyBuffer = Buffer.concat([
        Buffer.from(parts[0]),
        Buffer.from(parts[1]),
        imageBuffer,
        Buffer.from(`\r\n--${boundary}--`),
      ])

      return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: bodyBuffer,
      })
    }

    let driveRes = await uploadToDrive(token)

    // 401 → refresh and retry
    if (driveRes.status === 401 && refresh) {
      const refreshed = await refreshGoogleToken(refresh)
      if (refreshed) {
        newToken = refreshed
        token = refreshed
        driveRes = await uploadToDrive(refreshed)
      }
    }

    // 403 insufficient scope
    if (driveRes.status === 403) {
      const errBody = await driveRes.json().catch(() => null)
      const reason = errBody?.error?.errors?.[0]?.reason
      if (reason === 'insufficientPermissions') {
        return NextResponse.json({ error: 'insufficient_scope' }, { status: 403 })
      }
      return NextResponse.json({ error: 'drive_forbidden' }, { status: 403 })
    }

    if (!driveRes.ok) {
      return NextResponse.json({ error: 'drive_upload_failed' }, { status: driveRes.status })
    }

    const driveData = await driveRes.json()

    const response = NextResponse.json({ success: true, fileId: driveData.id })

    // 갱신된 토큰 쿠키 저장
    if (newToken) {
      setTokenCookie(response, newToken)
    }

    return response
  } catch (e) {
    console.error('Google Drive upload error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
