import { NextResponse } from 'next/server'
import { getCachedResponse, setCachedResponse } from '@/lib/ai/cache'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

async function callGemini(prompt: string, maxTokens = 500): Promise<{ text: string | null; error: string | null }> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    return { text: null, error: `Gemini ${res.status}: ${err.slice(0, 150)}` }
  }
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const raw = parts.map((p: any) => p.text || '').join('').trim()
  const text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() || null
  return { text, error: null }
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  const body = await request.json()
  const { type } = body

  try {
    // === 데일리 케어 ===
    if (type === 'daily') {
      const { childName, ageMonths, feedCount, sleepCount, poopCount, feedTotal, sleepTotal, mood } = body
      const cacheKey = `parent-daily-${ageMonths}-${feedCount}-${sleepCount}-${mood || 'none'}`
      const cached = getCachedResponse(cacheKey)
      if (cached) return NextResponse.json(cached)

      const { lastFeedMinAgo, lastSleepMinAgo, avgFeedGap, sleepingNow, feedAmounts, recentDays } = body
      const hour = new Date().getHours()
      const timeContext = hour < 6 ? '새벽' : hour < 12 ? '오전' : hour < 18 ? '오후' : '저녁'

      const prompt = `당신은 "도담" 앱의 AI 육아 전문가입니다. 실제 소아과 의사처럼 구체적이고 실용적으로 조언하세요.
의료 진단은 하지 말고, 걱정되면 소아과 상담을 권하세요.

[아이 정보]
- 이름: ${childName || '아이'}
- 월령: ${ageMonths}개월
- 현재 시각: ${timeContext} ${hour}시

[오늘 기록]
- 수유: ${feedCount}회${feedTotal ? ` (총 ${feedTotal}ml)` : ''}${feedAmounts ? ` [각 ${feedAmounts}]` : ''}
- 수면: ${sleepCount}회${sleepTotal ? ` (총 ${sleepTotal}분)` : ''}${sleepingNow ? ' ← 현재 수면 중' : ''}
- 배변: ${poopCount}회
- 마지막 수유: ${lastFeedMinAgo ? `${lastFeedMinAgo}분 전` : '없음'}
- 마지막 수면: ${lastSleepMinAgo ? `${lastSleepMinAgo}분 전` : '없음'}
- 평균 수유 간격: ${avgFeedGap ? `${avgFeedGap}분` : '미측정'}
- 최근 3일 일평균: ${recentDays || '미측정'}
- 부모 기분: ${mood || '미기록'}

[중요 규칙]
1. "잘하고 있어요" 같은 식상한 말 금지. 데이터를 보고 구체적으로 분석하세요.
2. ${ageMonths}개월 아기의 발달/수유/수면 기준에 비춰 현재 상태를 판단하세요.
3. 지금 시각 기준으로 "다음에 할 일"을 제안하세요.
4. 이상 징후가 있으면 부드럽게 알려주세요 (수유량 급감, 수면 패턴 급변 등).

[JSON 출력]
{
  "status": "좋음/보통/주의 중 하나",
  "statusEmoji": "해당 이모지",
  "summary": "지금 아이 상태 한마디 (10자 이내)",
  "mainInsight": "오늘 기록을 분석한 핵심 인사이트 (2-3문장, 수치 근거 포함)",
  "nextAction": "지금 시각 기준 다음에 할 일 제안 (1문장, 구체적 시간 포함)",
  "feedAnalysis": "수유 패턴 분석 (1문장, ${ageMonths}개월 권장량 대비)",
  "sleepAnalysis": "수면 패턴 분석 (1문장, ${ageMonths}개월 권장시간 대비)",
  "warning": "이상 징후 있으면 설명, 없으면 null",
  "parentTip": "부모를 위한 실용 팁 (1문장)"
}
JSON만 출력.`

      const { text, error } = await callGemini(prompt, 500)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ greeting: text.slice(0, 200) })
        const parsed = JSON.parse(match[0])
        setCachedResponse(cacheKey, parsed)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({ greeting: text.slice(0, 200) })
      }
    }

    // === 이유식 추천 ===
    if (type === 'meal') {
      const { ageMonths } = body

      const stage = ageMonths < 6 ? '초기 (미음/퓨레)' : ageMonths < 8 ? '중기 (으깬 음식)' : ageMonths < 10 ? '후기 (잘게 다진)' : '완료기 (부드러운 밥)'

      const prompt = `${ageMonths}개월 아기 이유식 추천. 단계: ${stage}

JSON으로 출력:
{
  "stage": "${stage}",
  "breakfast": {"menu": "아침 메뉴", "ingredients": "재료 나열"},
  "lunch": {"menu": "점심 메뉴", "ingredients": "재료 나열"},
  "snack": {"menu": "간식", "ingredients": "재료 나열"},
  "newFood": "이번 주 도전할 새 식재료 1가지",
  "avoid": "이 월령에 피해야 할 것",
  "tip": "이유식 팁 1문장"
}
한국 가정 이유식 위주. JSON만 출력.`

      const { text, error } = await callGemini(prompt, 400)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(match[0]))
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
