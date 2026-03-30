import { NextResponse } from 'next/server'
import { getAuthUserSoft } from '@/lib/security/auth'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendFcmToToken, type FcmMessage } from '@/lib/push/fcm'

/**
 * POST /api/push — 특정 유저에게 푸시 발송
 * Body: { userId, title, body, url?, tag? }
 *
 * 내부 서버 호출 또는 Cron에서 사용
 */
export async function POST(request: Request) {
  const user = await getAuthUserSoft()

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

    // 유저의 푸시 토큰 조회
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no tokens' })
    }

    const message: FcmMessage = { title, body, url, tag }
    let sent = 0

    for (const t of tokens) {
      if (t.platform === 'web') {
        // 웹 푸시: Web Push API 사용 (VAPID)
        // 여기서는 FCM 경유 또는 직접 web-push 사용
        // 일단 FCM으로 통일 (웹 토큰도 FCM 등록 시)
        const ok = await sendFcmToToken(t.token, message)
        if (ok) sent++
      } else {
        // 네이티브: FCM 직접
        const ok = await sendFcmToToken(t.token, message)
        if (ok) sent++
      }
    }

    // 발송 이력 저장
    await supabase.from('notification_log').insert({
      user_id: userId,
      type: tag || 'general',
      title,
      body,
      deeplink: url,
    })

    return NextResponse.json({ sent, total: tokens.length })
  } catch (err) {
    return NextResponse.json({ error: 'Push failed' }, { status: 500 })
  }
}
