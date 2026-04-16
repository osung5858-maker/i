import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthUser, unauthorizedResponse } from '@/lib/security/auth'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'
import { refreshGoogleToken, getGoogleToken, setTokenCookie } from '@/lib/google/token'

const FOLDER_NAME = 'Dodam - 키즈노트 백업'

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return unauthorizedResponse()

  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`gdrive-folder:${user.id || ip}`, { limit: 10, windowMs: 60_000 })
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const cookieStore = await cookies()
  const tokenResult = await getGoogleToken(cookieStore)
  const { refresh } = tokenResult
  let { token, newToken } = tokenResult

  if (!token) {
    return NextResponse.json({ error: 'no_google_token' }, { status: 401 })
  }

  const callDrive = async (url: string, options: RequestInit, accessToken: string) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers as Record<string, string>,
        Authorization: `Bearer ${accessToken}`,
      },
    })
  }

  try {
    // 기존 폴더 검색
    const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
    let searchRes = await callDrive(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      { method: 'GET' },
      token,
    )

    // 401 → refresh and retry
    if (searchRes.status === 401 && refresh) {
      const refreshed = await refreshGoogleToken(refresh)
      if (refreshed) {
        newToken = refreshed
        token = refreshed
        searchRes = await callDrive(
          `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
          { method: 'GET' },
          refreshed,
        )
      }
    }

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'drive_search_failed' }, { status: searchRes.status })
    }

    const searchData = await searchRes.json()
    let folderId: string

    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id
    } else {
      // 폴더 생성
      const createOpts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      }
      let createRes = await callDrive('https://www.googleapis.com/drive/v3/files', createOpts, token)

      // 401 → refresh and retry
      if (createRes.status === 401 && refresh) {
        const refreshed = await refreshGoogleToken(refresh)
        if (refreshed) {
          newToken = refreshed
          token = refreshed
          createRes = await callDrive('https://www.googleapis.com/drive/v3/files', createOpts, refreshed)
        }
      }

      if (!createRes.ok) {
        return NextResponse.json({ error: 'folder_create_failed' }, { status: createRes.status })
      }

      const createData = await createRes.json()
      folderId = createData.id
    }

    const response = NextResponse.json({ folderId })

    if (newToken) {
      setTokenCookie(response, newToken)
    }

    return response
  } catch (e) {
    console.error('Google Drive folder error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
