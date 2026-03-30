/**
 * Firebase Cloud Messaging (FCM) 서버 발송
 * - Google OAuth2 토큰을 직접 생성하여 FCM v1 API 호출
 * - firebase-admin SDK 없이 경량 구현
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL
const PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

const FCM_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Google OAuth2 액세스 토큰 생성 (JWT → access_token)
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token
  }

  if (!CLIENT_EMAIL || !PRIVATE_KEY) throw new Error('Firebase credentials not configured')

  // JWT 생성
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = btoa(JSON.stringify({
    iss: CLIENT_EMAIL,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))

  const signInput = `${header}.${payload}`

  // Node.js crypto로 RS256 서명
  const { createSign } = await import('crypto')
  const sign = createSign('RSA-SHA256')
  sign.update(signInput)
  const signature = sign.sign(PRIVATE_KEY, 'base64url')

  const jwt = `${header}.${payload}.${signature}`

  // JWT → access_token 교환
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

export interface FcmMessage {
  title: string
  body: string
  /** 딥링크 URL */
  url?: string
  /** 알림 태그 (같은 태그는 덮어씀) */
  tag?: string
}

/**
 * FCM v1 API로 단일 기기에 푸시 발송
 */
export async function sendFcmToToken(token: string, message: FcmMessage): Promise<boolean> {
  try {
    const accessToken = await getAccessToken()

    const res = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: message.title,
            body: message.body,
          },
          webpush: {
            fcm_options: {
              link: message.url || '/',
            },
            notification: {
              tag: message.tag || 'dodam',
              icon: '/icon-192.png',
              badge: '/favicon-32x32.png',
              vibrate: [100, 50, 100],
            },
          },
          data: {
            url: message.url || '/',
          },
        },
      }),
    })

    return res.ok
  } catch {
    return false
  }
}

/**
 * FCM v1 API로 여러 기기에 발송 (웹 푸시 토큰용)
 */
export async function sendFcmToTokens(tokens: string[], message: FcmMessage): Promise<number> {
  let successCount = 0
  // FCM v1은 batch 미지원이라 순차 발송 (최대 500개/초)
  for (const token of tokens) {
    const ok = await sendFcmToToken(token, message)
    if (ok) successCount++
  }
  return successCount
}
