import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendFcmToToken } from "@/lib/push/fcm"
import { sendWebPush, isWebPushSubscription } from "@/lib/push/webpush"

/**
 * GET /api/cron/checkup
 * 매주 월요일 09:00 KST (00:00 UTC) 실행
 * - 육아 모드: 영유아 검진 시기 알림 (4·9·18·30·42·54·66개월)
 * - 임신 모드: 이번 주 정기검진 안내
 */

function verifyAuth(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return auth === `Bearer ${secret}`
}

// 영유아 건강검진 월령
const CHECKUP_MONTHS = [4, 9, 18, 30, 42, 54, 66]
const CHECKUP_NAMES: Record<number, string> = {
  4: '1차 영유아 건강검진 (4~6개월)',
  9: '2차 영유아 건강검진 (9~12개월)',
  18: '3차 영유아 건강검진 (18~24개월)',
  30: '4차 영유아 건강검진 (30~36개월)',
  42: '5차 영유아 건강검진 (42~48개월)',
  54: '6차 영유아 건강검진 (54~60개월)',
  66: '7차 영유아 건강검진 (66~71개월)',
}

function getAgeMonths(birthdate: string): number {
  const birth = new Date(birthdate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  let sent = 0

  // ── 1. 육아 모드: 영유아 검진 ──
  const { data: children } = await supabase
    .from('children')
    .select('id, user_id, name, birthdate')

  for (const child of children || []) {
    const ageMonths = getAgeMonths(child.birthdate)

    // 이번 달이 검진 시기인지 확인 (±1개월 여유)
    const dueCheckup = CHECKUP_MONTHS.find(m => Math.abs(m - ageMonths) <= 1)
    if (!dueCheckup) continue

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('enabled, vaccination')
      .eq('user_id', child.user_id)
      .single()

    if (settings && (!settings.enabled || !settings.vaccination)) continue

    // 이번 주 이미 발송했는지 확인
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: alreadySent } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', child.user_id)
      .eq('type', 'checkup')
      .gte('sent_at', weekAgo)
      .limit(1)

    if (alreadySent && alreadySent.length > 0) continue

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', child.user_id)

    if (!tokens || tokens.length === 0) continue

    const title = `${child.name} 영유아 건강검진 시기예요`
    const body = CHECKUP_NAMES[dueCheckup]

    for (const t of tokens) {
      const ok = isWebPushSubscription(t.token)
        ? await sendWebPush(t.token, { title, body, url: '/vaccination', tag: 'checkup' })
        : await sendFcmToToken(t.token, { title, body, url: '/vaccination', tag: 'checkup' })
      if (ok) sent++
    }

    await supabase.from('notification_log').insert({
      user_id: child.user_id,
      type: 'checkup',
      title,
      body,
      deeplink: '/vaccination',
    })
  }

  // ── 2. 임신 모드: 정기검진 안내 ──
  // due_date가 설정된 유저 중 이번 주 정기검진 주차인 경우
  const CHECKUP_WEEKS = [8, 12, 16, 20, 24, 28, 32, 36, 38, 40]

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, due_date')
    .not('due_date', 'is', null)

  for (const profile of profiles || []) {
    if (!profile.due_date) continue
    const diffDays = Math.floor((new Date(profile.due_date).getTime() - Date.now()) / 86400000)
    const currentWeek = Math.max(1, Math.min(42, 40 - Math.floor(diffDays / 7)))

    const isCheckupWeek = CHECKUP_WEEKS.some(w => Math.abs(w - currentWeek) <= 0)
    if (!isCheckupWeek) continue

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('enabled, vaccination')
      .eq('user_id', profile.user_id)
      .single()

    if (settings && (!settings.enabled || !settings.vaccination)) continue

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: alreadySent } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', profile.user_id)
      .eq('type', 'ob_checkup')
      .gte('sent_at', weekAgo)
      .limit(1)

    if (alreadySent && alreadySent.length > 0) continue

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', profile.user_id)

    if (!tokens || tokens.length === 0) continue

    const title = `${currentWeek}주차 정기검진 시기예요`
    const body = '이번 주 산부인과 정기검진을 잊지 마세요.'

    for (const t of tokens) {
      const ok = isWebPushSubscription(t.token)
        ? await sendWebPush(t.token, { title, body, url: '/pregnant', tag: 'ob_checkup' })
        : await sendFcmToToken(t.token, { title, body, url: '/pregnant', tag: 'ob_checkup' })
      if (ok) sent++
    }

    await supabase.from('notification_log').insert({
      user_id: profile.user_id,
      type: 'ob_checkup',
      title,
      body,
      deeplink: '/pregnant',
    })
  }

  return NextResponse.json({ ok: true, sent })
}
