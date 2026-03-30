import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendFcmToToken } from "@/lib/push/fcm"
import { sendWebPush, isWebPushSubscription } from "@/lib/push/webpush"

/**
 * GET /api/cron/checkup
 * 매주 월요일 09:00 KST (00:00 UTC) 실행
 * N+1 제거: 후보 필터링(인메모리) 후 배치 쿼리
 */

function verifyAuth(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

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
const CHECKUP_WEEKS = [8, 12, 16, 20, 24, 28, 32, 36, 38, 40]

function getAgeMonths(birthdate: string): number {
  const birth = new Date(birthdate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendBatch(
  supabase: any,
  candidates: { user_id: string; title: string; body: string; type: string; deeplink: string }[],
  notifType: string,
  weekAgo: string,
) {
  if (candidates.length === 0) return 0

  const userIds = [...new Set(candidates.map(c => c.user_id))]

  const [settingsRes, sentRes, tokensRes] = await Promise.all([
    supabase.from('notification_settings').select('user_id, enabled, vaccination').in('user_id', userIds),
    supabase.from('notification_log').select('user_id').in('user_id', userIds)
      .eq('type', notifType).gte('sent_at', weekAgo),
    supabase.from('push_tokens').select('user_id, token').in('user_id', userIds),
  ])

  type SettingsRow = { user_id: string; enabled: boolean; vaccination: boolean }
  type SentRow = { user_id: string }
  type TokenRow = { user_id: string; token: string }
  const settingsMap = new Map<string, SettingsRow>(((settingsRes.data || []) as SettingsRow[]).map(s => [s.user_id, s]))
  const sentSet = new Set<string>(((sentRes.data || []) as SentRow[]).map(s => s.user_id))
  const tokensMap = new Map<string, string[]>()
  for (const t of (tokensRes.data || []) as TokenRow[]) {
    if (!tokensMap.has(t.user_id)) tokensMap.set(t.user_id, [])
    tokensMap.get(t.user_id)!.push(t.token)
  }

  let sent = 0
  const logsToInsert: object[] = []

  for (const c of candidates) {
    const settings = settingsMap.get(c.user_id)
    if (settings && (!settings.enabled || !settings.vaccination)) continue
    if (sentSet.has(c.user_id)) continue
    const tokens = tokensMap.get(c.user_id)
    if (!tokens || tokens.length === 0) continue

    for (const token of tokens) {
      const ok = isWebPushSubscription(token)
        ? await sendWebPush(token, { title: c.title, body: c.body, url: c.deeplink, tag: notifType })
        : await sendFcmToToken(token, { title: c.title, body: c.body, url: c.deeplink, tag: notifType })
      if (ok) sent++
    }

    logsToInsert.push({ user_id: c.user_id, type: c.type, title: c.title, body: c.body, deeplink: c.deeplink })
  }

  if (logsToInsert.length > 0) {
    await supabase.from('notification_log').insert(logsToInsert)
  }

  return sent
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let sent = 0

  // ── 1. 육아 모드: 영유아 검진 ──
  const { data: children } = await supabase
    .from('children')
    .select('id, user_id, name, birthdate')

  const childCandidates = (children || [])
    .filter(child => CHECKUP_MONTHS.some(m => Math.abs(m - getAgeMonths(child.birthdate)) <= 1))
    .map(child => {
      const ageMonths = getAgeMonths(child.birthdate)
      const dueCheckup = CHECKUP_MONTHS.find(m => Math.abs(m - ageMonths) <= 1)!
      return {
        user_id: child.user_id,
        title: `${child.name} 영유아 건강검진 시기예요`,
        body: CHECKUP_NAMES[dueCheckup],
        type: 'checkup',
        deeplink: '/vaccination',
      }
    })

  sent += await sendBatch(supabase, childCandidates, 'checkup', weekAgo)

  // ── 2. 임신 모드: 정기검진 ──
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, due_date')
    .not('due_date', 'is', null)

  const pregCandidates = (profiles || [])
    .filter(p => {
      if (!p.due_date) return false
      const diffDays = Math.floor((new Date(p.due_date).getTime() - Date.now()) / 86400000)
      const currentWeek = Math.max(1, Math.min(42, 40 - Math.floor(diffDays / 7)))
      return CHECKUP_WEEKS.some(w => w === currentWeek)
    })
    .map(p => {
      const diffDays = Math.floor((new Date(p.due_date!).getTime() - Date.now()) / 86400000)
      const currentWeek = Math.max(1, Math.min(42, 40 - Math.floor(diffDays / 7)))
      return {
        user_id: p.user_id,
        title: `${currentWeek}주차 정기검진 시기예요`,
        body: '이번 주 산부인과 정기검진을 잊지 마세요.',
        type: 'ob_checkup',
        deeplink: '/pregnant',
      }
    })

  sent += await sendBatch(supabase, pregCandidates, 'ob_checkup', weekAgo)

  return NextResponse.json({ ok: true, sent })
}
