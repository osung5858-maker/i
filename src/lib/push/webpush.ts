/**
 * Web Push API 발송 (VAPID 인증)
 * - 브라우저 PushManager.subscribe() 로 얻은 구독 객체를 사용
 */
import webpush from 'web-push'

interface WebPushSubscription {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

let initialized = false

function init() {
  if (initialized) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.FIREBASE_CLIENT_EMAIL || 'mailto:admin@dodam.life'

  if (!publicKey || !privateKey) throw new Error('VAPID keys not configured')

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey)
  initialized = true
}

export interface WebPushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * 단일 Web Push 구독에 알림 발송
 * @param subscriptionJson push_tokens.token 컬럼 값 (JSON 문자열 or 구독 객체)
 */
export async function sendWebPush(
  subscriptionJson: string | WebPushSubscription,
  payload: WebPushPayload,
): Promise<boolean> {
  try {
    init()

    const subscription: WebPushSubscription =
      typeof subscriptionJson === 'string'
        ? JSON.parse(subscriptionJson)
        : subscriptionJson

    // endpoint가 없으면 Web Push 구독이 아님
    if (!subscription.endpoint) return false

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
        tag: payload.tag || 'dodam',
        icon: '/icon-192.png',
        badge: '/favicon-32x32.png',
      }),
    )
    return true
  } catch (err: any) {
    // 410 Gone: 구독 만료 → 토큰 삭제 필요 신호
    if (err?.statusCode === 410) return false
    return false
  }
}

/**
 * token 값이 Web Push 구독인지 FCM 토큰인지 판별
 */
export function isWebPushSubscription(token: string): boolean {
  try {
    const parsed = JSON.parse(token)
    return typeof parsed === 'object' && 'endpoint' in parsed && 'keys' in parsed
  } catch {
    return false
  }
}
