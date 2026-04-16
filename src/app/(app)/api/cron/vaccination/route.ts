import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendFcmToToken } from "@/lib/push/fcm"
import { sendWebPush, isWebPushSubscription } from "@/lib/push/webpush"

/**
 * GET /api/cron/vaccination
 * 매일 09:00 KST (00:00 UTC) 실행
 * N+1 제거: 후보 필터링(인메모리) 후 3개 배치 쿼리로 처리
 */

const VACCINE_SCHEDULE: Record<number, string> = {
  0: 'BCG·B형간염 1차',
  1: 'B형간염 2차',
  2: 'DTaP·폴리오·Hib·폐렴구균 1차',
  4: 'DTaP·폴리오·Hib·폐렴구균 2차',
  6: 'DTaP·폴리오·Hib·폐렴구균 3차·인플루엔자',
  12: 'MMR·수두·A형간염·일본뇌염',
  15: 'DTaP 4차·Hib·폐렴구균 추가',
  18: 'A형간염 2차',
  24: '일본뇌염 추가·인플루엔자',
  36: 'DTaP 5차·폴리오 4차',
}

const vaccineMonths = Object.keys(VACCINE_SCHEDULE).map(Number).sort((a, b) => a - b)

function getAgeMonths(birthdate: string): number {
  const birth = new Date(birthdate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function getAgeDays(birthdate: string): number {
  return Math.floor((Date.now() - new Date(birthdate).getTime()) / 86400000)
}

function verifyAuth(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || !auth) return false
  const expected = `Bearer ${secret}`
  if (auth.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < auth.length; i++) {
    mismatch |= auth.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: children, error } = await supabase
    .from('children')
    .select('id, user_id, name, birthdate')

  if (error || !children) {
    return NextResponse.json({ error: 'DB error', detail: error?.message }, { status: 500 })
  }

  // ── 1. 인메모리 후보 필터 (DB 쿼리 없음) ──
  type Candidate = typeof children[number] & { nextMonth: number; daysUntil: number }
  const candidates: Candidate[] = []

  for (const child of children) {
    const ageDays = getAgeDays(child.birthdate)
    const ageMonths = getAgeMonths(child.birthdate)
    const nextMonth = vaccineMonths.find(m => m > ageMonths)
    if (nextMonth === undefined) continue
    const daysUntil = (nextMonth * 30) - ageDays
    if (daysUntil < 0 || daysUntil > 7) continue
    candidates.push({ ...child, nextMonth, daysUntil })
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: children.length, reason: 'no candidates' })
  }

  const userIds = [...new Set(candidates.map(c => c.user_id))]
  const today = new Date().toISOString().split('T')[0]

  // ── 2. 배치 쿼리 (N→3개) ──
  const [settingsRes, sentRes, tokensRes] = await Promise.all([
    supabase.from('notification_settings').select('user_id, enabled, vaccination').in('user_id', userIds),
    supabase.from('notification_log').select('user_id').in('user_id', userIds)
      .eq('type', 'vaccination').gte('sent_at', `${today}T00:00:00Z`),
    supabase.from('push_tokens').select('user_id, token').in('user_id', userIds),
  ])

  // ── 3. 룩업맵 구성 ──
  const settingsMap = new Map((settingsRes.data || []).map(s => [s.user_id, s]))
  const sentSet = new Set((sentRes.data || []).map(s => s.user_id))
  const tokensMap = new Map<string, string[]>()
  for (const t of tokensRes.data || []) {
    if (!tokensMap.has(t.user_id)) tokensMap.set(t.user_id, [])
    tokensMap.get(t.user_id)!.push(t.token)
  }

  let sent = 0
  let skipped = children.length - candidates.length
  const logsToInsert: object[] = []
  const notifiedUsers = new Set<string>()

  for (const child of candidates) {
    const settings = settingsMap.get(child.user_id)
    if (settings && (!settings.enabled || !settings.vaccination)) { skipped++; continue }
    if (sentSet.has(child.user_id) || notifiedUsers.has(child.user_id)) { skipped++; continue }
    const tokens = tokensMap.get(child.user_id)
    if (!tokens || tokens.length === 0) { skipped++; continue }

    const title = child.daysUntil === 0
      ? `${child.name} 예방접종 오늘이에요!`
      : `${child.name} 예방접종 D-${child.daysUntil}`
    const body = `${child.nextMonth}개월 접종: ${VACCINE_SCHEDULE[child.nextMonth]}. 가까운 소아과를 예약해보세요.`

    for (const token of tokens) {
      const ok = isWebPushSubscription(token)
        ? await sendWebPush(token, { title, body, url: '/vaccination', tag: 'vaccination' })
        : await sendFcmToToken(token, { title, body, url: '/vaccination', tag: 'vaccination' })
      if (ok) sent++
    }

    logsToInsert.push({ user_id: child.user_id, type: 'vaccination', title, body, deeplink: '/vaccination' })
    notifiedUsers.add(child.user_id)
  }

  // ── 4. 배치 인서트 ──
  if (logsToInsert.length > 0) {
    await supabase.from('notification_log').insert(logsToInsert)
  }

  return NextResponse.json({ ok: true, sent, skipped, total: children.length })
}
