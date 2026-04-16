import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendFcmToToken, type FcmMessage } from '@/lib/push/fcm'
import { sendWebPush, isWebPushSubscription } from '@/lib/push/webpush'

/**
 * POST /api/push — 로그인한 유저 본인에게 푸시 발송
 * Body: { title, body, url?, tag? }
 * userId는 세션에서 추출 (클라이언트 전달 금지)
 */
export async function POST(request: Request) {
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

    // 세션에서 userId 추출 (클라이언트 전달값 사용 금지)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', user.id)

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no tokens' })
    }

    const fcmMessage: FcmMessage = { title, body, url, tag }
    const webPayload = { title, body, url, tag }
    let sent = 0

    for (const t of tokens) {
      let ok = false
      if (isWebPushSubscription(t.token)) {
        ok = await sendWebPush(t.token, webPayload)
      } else {
        ok = await sendFcmToToken(t.token, fcmMessage)
      }
      if (ok) sent++
    }

    await supabase.from('notification_log').insert({
      user_id: user.id,
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
