import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendFcmToToken } from "@/lib/push/fcm"
import { sendWebPush, isWebPushSubscription } from "@/lib/push/webpush"

/**
 * GET /api/cron/daily-insight
 * 매일 08:00 KST (23:00 UTC 전날) 실행
 * 어제 이벤트 데이터 기반 개인화 푸시 (Gemini 배치 1회 호출)
 * Gemini 실패 시 정적 메시지로 폴백
 */

export const maxDuration = 60

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

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

const FALLBACK_MESSAGES = [
  { title: '오늘도 잘 하고 있어요 💪', body: '아이와 함께한 모든 순간이 소중한 기억이 돼요. 오늘도 도담과 함께해요.' },
  { title: '아이의 성장은 매일 일어나요', body: '어제보다 조금 더 자란 아이를 오늘도 기록해보세요.' },
  { title: '육아는 마라톤이에요', body: '잘 쉬는 것도 좋은 부모의 조건이에요. 오늘 하루도 수고해요.' },
  { title: '기록이 추억이 됩니다', body: '지금 이 순간을 도담에 남겨두면, 나중에 아이와 함께 볼 수 있어요.' },
  { title: '오늘 수유·수면은 어때요?', body: 'AI가 패턴을 분석하고 있어요. 기록할수록 예측이 정확해져요.' },
]

function getFallback(): { title: string; body: string } {
  return FALLBACK_MESSAGES[new Date().getDay() % FALLBACK_MESSAGES.length]
}

// 최대 20명 프로필을 한 번의 Gemini 호출로 개인화 메시지 생성
async function batchPersonalize(
  profiles: { idx: number; feed: number; sleep: number; poop: number; lastType: string }[]
): Promise<Map<number, { title: string; body: string }>> {
  const result = new Map<number, { title: string; body: string }>()
  if (!GEMINI_API_KEY || profiles.length === 0) return result

  const profileLines = profiles.map(p => {
    if (p.feed === 0 && p.sleep === 0 && p.poop === 0) {
      return `${p.idx}: 기록없음`
    }
    const parts = []
    if (p.feed > 0) parts.push(`수유${p.feed}회`)
    if (p.sleep > 0) parts.push(`수면${p.sleep}회`)
    if (p.poop > 0) parts.push(`배변${p.poop}회`)
    parts.push(`마지막:${p.lastType}`)
    return `${p.idx}: ${parts.join(', ')}`
  }).join('\n')

  const prompt = `다음 ${profiles.length}명의 부모에게 보낼 개인화된 아침 육아 응원 푸시 알림을 만들어주세요.
어제 기록 데이터 기반으로 구체적이고 따뜻한 메시지를 작성하세요.

[어제 기록]
${profileLines}

[규칙]
- title: 15자 이내, 데이터 기반 구체적 언급 (기록없음이면 일반 격려)
- body: 45자 이내, 공감 + 오늘 하루 응원
- 뻔한 표현("잘하고 있어요") 금지, "도담하게"라는 표현 활용 가능

JSON 배열만 출력:
[{"i":0,"t":"제목","b":"내용"},...]`

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return result

    const data = await res.json()
    const parts = data.candidates?.[0]?.content?.parts || []
    const raw = parts.map((p: any) => p.text || '').join('').trim()
      .replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return result

    const parsed: { i: number; t: string; b: string }[] = JSON.parse(match[0])
    for (const item of parsed) {
      if (typeof item.i === 'number' && item.t && item.b) {
        result.set(item.i, { title: item.t, body: item.b })
      }
    }
  } catch {
    // 폴백으로 처리
  }

  return result
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

  // ── 배치 쿼리 ──
  const yesterdayStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [settingsRes, sentRes, tokensRes, yesterdayEventsRes] = await Promise.all([
    supabase.from('notification_settings').select('user_id, enabled, daily_encourage').in('user_id', userIds),
    supabase.from('notification_log').select('user_id').in('user_id', userIds)
      .eq('type', 'daily_encourage').gte('sent_at', `${today}T00:00:00Z`),
    supabase.from('push_tokens').select('user_id, token').in('user_id', userIds),
    supabase.from('events').select('recorder_id, type, start_ts').in('recorder_id', userIds)
      .gte('start_ts', yesterdayStart).order('start_ts', { ascending: false }),
  ])

  const settingsMap = new Map((settingsRes.data || []).map(s => [s.user_id, s]))
  const sentSet = new Set((sentRes.data || []).map(s => s.user_id))
  const tokensMap = new Map<string, string[]>()
  for (const t of tokensRes.data || []) {
    if (!tokensMap.has(t.user_id)) tokensMap.set(t.user_id, [])
    tokensMap.get(t.user_id)!.push(t.token)
  }

  // ── 어제 이벤트 집계 ──
  type EventRow = { recorder_id: string; type: string; start_ts: string }
  const eventsByUser = new Map<string, EventRow[]>()
  for (const e of (yesterdayEventsRes.data || []) as EventRow[]) {
    if (!eventsByUser.has(e.recorder_id)) eventsByUser.set(e.recorder_id, [])
    eventsByUser.get(e.recorder_id)!.push(e)
  }

  // ── 푸시 보낼 대상 필터링 ──
  const targets: { userId: string; idx: number }[] = []
  let idx = 0
  for (const userId of userIds) {
    const settings = settingsMap.get(userId)
    if (settings && (!settings.enabled || !settings.daily_encourage)) continue
    if (sentSet.has(userId)) continue
    const tokens = tokensMap.get(userId)
    if (!tokens || tokens.length === 0) continue
    targets.push({ userId, idx: idx++ })
  }

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no eligible users' })
  }

  // ── Gemini 배치 개인화 (최대 20명) ──
  const personalizeTargets = targets.slice(0, 20)
  const profiles = personalizeTargets.map(({ userId, idx: i }) => {
    const events = eventsByUser.get(userId) || []
    const feed = events.filter(e => e.type === 'feed' || e.type === 'pump').length
    const sleep = events.filter(e => e.type === 'sleep').length
    const poop = events.filter(e => e.type === 'poop' || e.type === 'pee').length
    const lastType = events[0]?.type || ''
    const typeMap: Record<string, string> = {
      feed: '수유', pump: '유축', sleep: '수면', poop: '배변', pee: '소변',
      bath: '목욕', temp: '체온', memo: '메모', medication: '투약',
    }
    return { idx: i, feed, sleep, poop, lastType: typeMap[lastType] || lastType }
  })

  const personalizedMap = await batchPersonalize(profiles)

  // ── 발송 ──
  let sent = 0
  const logsToInsert: object[] = []

  for (const { userId, idx: i } of targets) {
    const tokens = tokensMap.get(userId)!
    const personalized = personalizedMap.get(i)
    const { title, body } = personalized ?? getFallback()

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

  const personalizedCount = [...personalizedMap.values()].length
  return NextResponse.json({ ok: true, sent, total: userIds.length, personalized: personalizedCount })
}
