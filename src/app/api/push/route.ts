import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendFcmToToken, type FcmMessage } from '@/lib/push/fcm'
import { sendWebPush, isWebPushSubscription } from '@/lib/push/webpush'

/**
 * POST /api/push — 특정 유저에게 푸시 발송
 * Body: { userId, title, body, url?, tag? }
 *
 * - Web Push 구독(JSON): web-push + VAPID
 * - FCM 네이티브 토큰: FCM v1 API
 */
export async function POST(request: Request) {
  const { userId, title, body, url, tag } = await request.json()

  if (!userId || !title || !body) {
    return NextResponse.json({ error: 'userId, title, body required' }, { status: 400 })
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
    )

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no tokens' })
    }

    const fcmMessage: FcmMessage = { title, body, url, tag }
    const webPayload = { title, body, url, tag }
    let sent = 0

    for (const t of tokens) {
      let ok = false
      if (isWebPushSubscription(t.token)) {
        // Web Push (브라우저 PushManager 구독)
        ok = await sendWebPush(t.token, webPayload)
      } else {
        // FCM 네이티브 토큰 (iOS/Android)
        ok = await sendFcmToToken(t.token, fcmMessage)
      }
      if (ok) sent++
    }

    await supabase.from('notification_log').insert({
      user_id: userId,
      type: tag || 'general',
      title,
      body,
      deeplink: url,
    })

    return NextResponse.json({ sent, total: tokens.length })
  } catch (err) {
    console.error('Push error:', err)
    return NextResponse.json({ error: 'Push failed' }, { status: 500 })
  }
}
