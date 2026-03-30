import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendFcmToToken } from "@/lib/push/fcm"
import { sendWebPush, isWebPushSubscription } from "@/lib/push/webpush"

/**
 * GET /api/cron/daily-insight
 * 매일 08:00 KST (23:00 UTC 전날) 실행
 * N+1 제거: 3개 배치 쿼리 + 배치 인서트
 */

function verifyAuth(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

function getGreetingMessage(): { title: string; body: string } {
  const messages = [
    { title: '오늘도 잘 하고 있어요 💪', body: '아이와 함께한 모든 순간이 소중한 기억이 돼요. 오늘도 도담과 함께해요.' },
    { title: '아이의 성장은 매일 일어나요', body: '어제보다 조금 더 자란 아이를 오늘도 기록해보세요.' },
    { title: '육아는 마라톤이에요', body: '잘 쉬는 것도 좋은 부모의 조건이에요. 오늘 하루도 수고해요.' },
    { title: '기록이 추억이 됩니다', body: '지금 이 순간을 도담에 남겨두면, 나중에 아이와 함께 볼 수 있어요.' },
    { title: '오늘 수유·수면은 어때요?', body: 'AI가 패턴을 분석하고 있어요. 기록할수록 예측이 정확해져요.' },
  ]
  return messages[new Date().getDay() % messages.length]
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: activeUsers } = await supabase
    .from('events')
    .select('recorder_id')
    .gte('start_ts', sevenDaysAgo)
    .limit(1000)

  if (!activeUsers || activeUsers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no active users' })
  }

  const userIds = [...new Set(activeUsers.map(e => e.recorder_id as string))]
  const today = new Date().toISOString().split('T')[0]

  // ── 배치 쿼리 (N→3개) ──
  const [settingsRes, sentRes, tokensRes] = await Promise.all([
    supabase.from('notification_settings').select('user_id, enabled, daily_encourage').in('user_id', userIds),
    supabase.from('notification_log').select('user_id').in('user_id', userIds)
      .eq('type', 'daily_encourage').gte('sent_at', `${today}T00:00:00Z`),
    supabase.from('push_tokens').select('user_id, token').in('user_id', userIds),
  ])

  const settingsMap = new Map((settingsRes.data || []).map(s => [s.user_id, s]))
  const sentSet = new Set((sentRes.data || []).map(s => s.user_id))
  const tokensMap = new Map<string, string[]>()
  for (const t of tokensRes.data || []) {
    if (!tokensMap.has(t.user_id)) tokensMap.set(t.user_id, [])
    tokensMap.get(t.user_id)!.push(t.token)
  }

  const { title, body } = getGreetingMessage()
  let sent = 0
  const logsToInsert: object[] = []

  for (const userId of userIds) {
    const settings = settingsMap.get(userId)
    if (settings && (!settings.enabled || !settings.daily_encourage)) continue
    if (sentSet.has(userId)) continue
    const tokens = tokensMap.get(userId)
    if (!tokens || tokens.length === 0) continue

    for (const token of tokens) {
      const ok = isWebPushSubscription(token)
        ? await sendWebPush(token, { title, body, url: '/', tag: 'daily' })
        : await sendFcmToToken(token, { title, body, url: '/', tag: 'daily' })
      if (ok) sent++
    }

    logsToInsert.push({ user_id: userId, type: 'daily_encourage', title, body, deeplink: '/' })
  }

  // ── 배치 인서트 ──
  if (logsToInsert.length > 0) {
    await supabase.from('notification_log').insert(logsToInsert)
  }

  return NextResponse.json({ ok: true, sent, total: userIds.length })
}
