import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendFcmToToken } from '@/lib/push/fcm'

/**
 * GET /api/cron/vaccination
 * 매일 09:00 KST (00:00 UTC) 실행
 * 예방접종 7일 이내 아이 → 보호자에게 푸시 발송
 */

// 월령 → 접종 이름
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

function getVaccineMonths(): number[] {
  return Object.keys(VACCINE_SCHEDULE).map(Number).sort((a, b) => a - b)
}

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
  if (!secret) return true // 로컬 개발 시 패스
  return auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // 전체 아이 목록 조회
  const { data: children, error } = await supabase
    .from('children')
    .select('id, user_id, name, birthdate')

  if (error || !children) {
    return NextResponse.json({ error: 'DB error', detail: error?.message }, { status: 500 })
  }

  const vaccineMonths = getVaccineMonths()
  let sent = 0
  let skipped = 0

  for (const child of children) {
    const ageDays = getAgeDays(child.birthdate)
    const ageMonths = getAgeMonths(child.birthdate)

    // 다음 접종 월령 찾기
    const nextMonth = vaccineMonths.find(m => m > ageMonths)
    if (nextMonth === undefined) continue // 접종 완료

    // 다음 접종 D-day 계산 (월령 → 일수 근사)
    const nextDueDay = nextMonth * 30
    const daysUntil = nextDueDay - ageDays

    // 7일 이내 또는 당일이면 알림
    if (daysUntil < 0 || daysUntil > 7) { skipped++; continue }

    // 알림 설정 확인
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('enabled, vaccination, dnd_start, dnd_end')
      .eq('user_id', child.user_id)
      .single()

    if (settings && (!settings.enabled || !settings.vaccination)) { skipped++; continue }

    // 오늘 이미 발송했는지 확인 (중복 방지)
    const today = new Date().toISOString().split('T')[0]
    const { data: alreadySent } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', child.user_id)
      .eq('type', 'vaccination')
      .gte('sent_at', `${today}T00:00:00Z`)
      .limit(1)

    if (alreadySent && alreadySent.length > 0) { skipped++; continue }

    // 푸시 토큰 조회
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', child.user_id)

    if (!tokens || tokens.length === 0) { skipped++; continue }

    const vaccineName = VACCINE_SCHEDULE[nextMonth]
    const title = daysUntil === 0
      ? `${child.name} 예방접종 오늘이에요!`
      : `${child.name} 예방접종 D-${daysUntil}`
    const body = `${nextMonth}개월 접종: ${vaccineName}. 가까운 소아과를 예약해보세요.`

    // 발송
    for (const t of tokens) {
      const ok = await sendFcmToToken(t.token, {
        title,
        body,
        url: '/vaccination',
        tag: 'vaccination',
      })
      if (ok) sent++
    }

    // 이력 저장
    await supabase.from('notification_log').insert({
      user_id: child.user_id,
      type: 'vaccination',
      title,
      body,
      deeplink: '/vaccination',
    })
  }

  return NextResponse.json({ ok: true, sent, skipped, total: children.length })
}
