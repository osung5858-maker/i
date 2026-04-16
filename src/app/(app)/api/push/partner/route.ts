import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendFcmToToken, type FcmMessage } from '@/lib/push/fcm'
import { sendWebPush, isWebPushSubscription } from '@/lib/push/webpush'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'

/**
 * POST /api/push/partner — 파트너(caregivers)에게 푸시 전송
 * Body: { title, body, url?, tag? }
 * 카카오 OAuth 없이도 FCM/WebPush로 파트너에게 알림 가능
 */
export async function POST(request: Request) {
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`push-partner:${ip}`, { limit: 10, windowMs: 60_000 })
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요.' }, { status: 429 })

  const { title, body, url, tag } = await request.json()
  if (!title || !body) {
    return NextResponse.json({ error: 'title, body required' }, { status: 400 })
  }

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

    // caregivers 테이블에서 파트너 찾기
    const { data: relations } = await supabase
      .from('caregivers')
      .select('user_id, caregiver_id')
      .or(`user_id.eq.${user.id},caregiver_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (!relations || relations.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no_partner' })
    }

    const partnerIds = relations.map(r =>
      r.user_id === user.id ? r.caregiver_id : r.user_id
    )

    let totalSent = 0

    for (const partnerId of partnerIds) {
      // 파트너의 push tokens 조회
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token, platform')
        .eq('user_id', partnerId)

      if (!tokens || tokens.length === 0) continue

      const fcmMessage: FcmMessage = { title, body, url, tag }
      const webPayload = { title, body, url, tag }

      for (const t of tokens) {
        let ok = false
        if (isWebPushSubscription(t.token)) {
          ok = await sendWebPush(t.token, webPayload)
        } else {
          ok = await sendFcmToToken(t.token, fcmMessage)
        }
        if (ok) totalSent++
      }

      // 알림 로그 기록
      await supabase.from('notification_log').insert({
        user_id: partnerId,
        type: tag || 'mission',
        title,
        body,
        deeplink: url,
      })
    }

    return NextResponse.json({ sent: totalSent, partners: partnerIds.length })
  } catch (err) {
    console.error('Partner push error:', err)
    return NextResponse.json({ error: 'Push failed' }, { status: 500 })
  }
}
