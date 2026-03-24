import { NextResponse } from 'next/server'

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
    // === 주차별 데일리 케어 ===
    if (type === 'daily') {
      const { week, trimester, daysLeft, weight, bloodPressure, fetalMovement, mood, sleep } = body

      const prompt = `당신은 "도담" 앱의 AI 임신 케어 코치입니다. 따뜻하면서 전문적으로 조언하세요.
의료 진단은 절대 하지 마세요. "도담하게"를 자연스럽게 사용하세요.
사용자는 현재 임신 중입니다.

[상태]
- 임신 ${week}주차 (${trimester})
- 출산까지 D-${daysLeft}
- 체중: ${weight || '미기록'}kg
- 혈압: ${bloodPressure || '미기록'}
- 오늘 태동: ${fetalMovement || '미기록'}회
- 기분: ${mood || '미기록'}
- 수면: ${sleep || '미기록'}시간

JSON으로 출력:
{
  "greeting": "따뜻한 인사 1문장 (주차 반영)",
  "babyMessage": "아기 시점의 한마디 (1문장, 이모지 포함)",
  "mainAdvice": "이번 주 가장 중요한 조언 (2문장)",
  "bodyTip": "엄마 몸 관리 팁 (1문장)",
  "emotionalCare": "감정 케어 (1문장)",
  "weekHighlight": "이번 주 태아 발달 하이라이트 (1문장)"
}
JSON만 출력.`

      const { text, error } = await callGemini(prompt, 500)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ greeting: text.slice(0, 200) })
        return NextResponse.json(JSON.parse(match[0]))
      } catch {
        return NextResponse.json({ greeting: text.slice(0, 200) })
      }
    }

    // === 태교 일기 AI 코멘트 ===
    if (type === 'diary') {
      const { text: diaryText, week, mood } = body
      const prompt = `임신 ${week}주차 예비맘이 태교 일기를 썼어요. 따뜻하게 1-2문장으로 코멘트해주세요. 이모지 1개 포함.
기분: ${mood || '미기록'}
일기: "${diaryText}"
코멘트만 출력.`
      const { text } = await callGemini(prompt, 100)
      return NextResponse.json({ comment: text || '오늘도 도담하게 잘 지내고 있어요 💚' })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
