import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendFcmToToken } from '@/lib/push/fcm'

/**
 * GET /api/cron/daily-insight
 * 매일 08:00 KST (23:00 UTC 전날) 실행
 * 최근 7일 내 활성 유저에게 격려/인사이트 푸시
 */

function verifyAuth(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return auth === `Bearer ${secret}`
}

function getGreetingMessage(hour: number): { title: string; body: string } {
  const messages = [
    { title: '오늘도 잘 하고 있어요 💪', body: '아이와 함께한 모든 순간이 소중한 기억이 돼요. 오늘도 도담과 함께해요.' },
    { title: '아이의 성장은 매일 일어나요', body: '어제보다 조금 더 자란 아이를 오늘도 기록해보세요.' },
    { title: '육아는 마라톤이에요', body: '잘 쉬는 것도 좋은 부모의 조건이에요. 오늘 하루도 수고해요.' },
    { title: '기록이 추억이 됩니다', body: '지금 이 순간을 도담에 남겨두면, 나중에 아이와 함께 볼 수 있어요.' },
    { title: '오늘 수유·수면은 어때요?', body: 'AI가 패턴을 분석하고 있어요. 기록할수록 예측이 정확해져요.' },
  ]
  const today = new Date()
  return messages[today.getDay() % messages.length]
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // 최근 7일 내 이벤트가 있는 활성 유저 조회
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: activeUsers } = await supabase
    .from('events')
    .select('recorder_id')
    .gte('start_ts', sevenDaysAgo)
    .limit(1000)

  if (!activeUsers || activeUsers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no active users' })
  }

  // 중복 제거
  const userIds = [...new Set(activeUsers.map(e => e.recorder_id as string))]
  const { title, body } = getGreetingMessage(new Date().getHours())
  let sent = 0

  for (const userId of userIds) {
    // 알림 설정 확인
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('enabled, daily_encourage')
      .eq('user_id', userId)
      .single()

    if (settings && (!settings.enabled || !settings.daily_encourage)) continue

    // 오늘 이미 발송했는지 확인
    const today = new Date().toISOString().split('T')[0]
    const { data: alreadySent } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'daily_encourage')
      .gte('sent_at', `${today}T00:00:00Z`)
      .limit(1)

    if (alreadySent && alreadySent.length > 0) continue

    // 푸시 토큰 조회
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)

    if (!tokens || tokens.length === 0) continue

    for (const t of tokens) {
      const ok = await sendFcmToToken(t.token, { title, body, url: '/', tag: 'daily' })
      if (ok) sent++
    }

    await supabase.from('notification_log').insert({
      user_id: userId,
      type: 'daily_encourage',
      title,
      body,
      deeplink: '/',
    })
  }

  return NextResponse.json({ ok: true, sent, total: userIds.length })
}
