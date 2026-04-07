import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendFcmToToken, type FcmMessage } from '@/lib/push/fcm'
import { sendWebPush, isWebPushSubscription } from '@/lib/push/webpush'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'

/**
 * POST /api/push/chat — 거래 채팅 상대방에게 푸시 전송
 * Body: { recipientId, title, body, url?, tag? }
 */
export async function POST(request: Request) {
  const ct = request.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const { recipientId, title, body, url, tag } = await request.json()
  if (!recipientId || !title || !body) {
    return NextResponse.json({ error: 'recipientId, title, body required' }, { status: 400 })
  }

  // H-3: Validate url is a relative path (prevent open redirect)
  const safeUrl = (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) ? url : undefined

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit by authenticated user (not IP)
    const ip = getClientIP(request)
    const { limited } = checkRateLimit(`push-chat:${user.id}:${ip}`, { limit: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: '요청이 너무 많아요.' }, { status: 429 })

    // 발신자가 수신자와 채팅 관계인지 확인 (스팸 방지)
    const { data: chatRelation } = await supabase
      .from('market_chats')
      .select('id')
      .or(`and(buyer_id.eq.${user.id},seller_id.eq.${recipientId}),and(buyer_id.eq.${recipientId},seller_id.eq.${user.id})`)
      .limit(1)

    if (!chatRelation || chatRelation.length === 0) {
      return NextResponse.json({ error: 'Not a chat participant' }, { status: 403 })
    }

    // 수신자의 push tokens 조회
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', recipientId)

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no tokens' })
    }

    const fcmMessage: FcmMessage = { title, body, url: safeUrl, tag }
    const webPayload = { title, body, url: safeUrl, tag }
    let sent = 0

    for (const t of tokens) {
      try {
        let ok = false
        if (isWebPushSubscription(t.token)) {
          ok = await sendWebPush(t.token, webPayload)
        } else {
          ok = await sendFcmToToken(t.token, fcmMessage)
        }
        if (ok) sent++
        else console.warn(`[push/chat] Failed to deliver to ${t.platform} token for user ${recipientId}`)
      } catch (pushErr) {
        console.error(`[push/chat] Error sending to ${t.platform}:`, pushErr)
      }
    }

    // 알림 로그
    await supabase.from('notification_log').insert({
      user_id: recipientId,
      type: tag || 'market_chat',
      title,
      body,
      deeplink: safeUrl,
    })

    return NextResponse.json({ sent, total: tokens.length })
  } catch (err) {
    console.error('Chat push error:', err)
    return NextResponse.json({ error: 'Push failed' }, { status: 500 })
  }
}
