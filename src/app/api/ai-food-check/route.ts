import { NextResponse } from 'next/server'
import { getCachedResponse, setCachedResponse } from '@/lib/ai/cache'
import { checkRateLimit, getClientIP, AI_RATE_LIMIT } from '@/lib/security/rate-limit'
import { sanitizeForPrompt } from '@/lib/security/sanitize'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

async function callGemini(prompt: string): Promise<{ text: string | null; error: string | null }> {
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? '' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(25000),
      })
      if (res.status === 429 && attempt < 2) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue }
      if (!res.ok) { if (attempt < 2) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue } return { text: null, error: 'AI 서버 오류' } }
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts || []
      const raw = parts.map((p: { text?: string }) => p.text || '').join('').trim()
      const text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() || null
      return { text, error: null }
    } catch (e) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue }
      return { text: null, error: (e as Error)?.message?.slice(0, 100) || 'Network error' }
    }
  }
  return { text: null, error: 'Max retries exceeded' }
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`food-check:${ip}`, AI_RATE_LIMIT)
  if (limited) return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 })

  const body = await request.json()
  const { food, mode } = body
  if (!food || typeof food !== 'string') return NextResponse.json({ error: '음식명을 입력해주세요.' }, { status: 400 })

  const safeFood = sanitizeForPrompt(food, 100)
  const cacheKey = `food-check-${mode}-${safeFood.toLowerCase().replace(/\s/g, '')}`
  const cached = getCachedResponse(cacheKey)
  if (cached) return NextResponse.json(cached)

  const context = mode === 'pregnant'
    ? '임신 중인 산모'
    : mode === 'preparing'
    ? '임신을 준비 중인 여성'
    : '영유아를 키우는 부모'

  const doctor = mode === 'parenting' ? '소아과·영양 전문의' : '산부인과 전문의'
  const prompt = `당신은 ${doctor}입니다. ${context}가 "${safeFood}"을(를) 먹어도 되는지 알려주세요.

JSON으로만 출력:
{
  "safety": "safe 또는 caution 또는 avoid 중 하나",
  "emoji": "음식을 나타내는 이모지 1개",
  "summary": "한 줄 결론 (예: 익혀서 먹으면 안전해요)",
  "reason": "이유 2-3문장, 구체적으로",
  "tip": "실용적인 팁 1문장 (대체 식품 또는 먹는 방법)"
}

safe = 자유롭게 먹어도 됨
caution = 주의해서 소량만 / 조리 방법 따라야 함
avoid = 먹지 않는 것이 좋음

JSON만 출력.`

  const { text, error } = await callGemini(prompt)
  if (!text) return NextResponse.json({ error: error || 'AI 오류' }, { status: 500 })

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
    const result = JSON.parse(match[0])
    setCachedResponse(cacheKey, result)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'parse error' }, { status: 500 })
  }
}
