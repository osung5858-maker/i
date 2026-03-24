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
    // === 데일리 케어 ===
    if (type === 'daily') {
      const { childName, ageMonths, feedCount, sleepCount, poopCount, feedTotal, sleepTotal, mood } = body

      const prompt = `당신은 "도담" 앱의 AI 육아 케어 파트너입니다. 따뜻하고 실용적으로 조언하세요.
의료 진단은 절대 하지 마세요. "도담하게"를 자연스럽게 사용하세요.

[아이 정보]
- 이름: ${childName || '아이'}
- 월령: ${ageMonths}개월

[오늘 기록]
- 수유: ${feedCount}회${feedTotal ? ` (총 ${feedTotal}ml)` : ''}
- 수면: ${sleepCount}회${sleepTotal ? ` (총 ${sleepTotal}분)` : ''}
- 배변: ${poopCount}회
- 부모 기분: ${mood || '미기록'}

[요청]
JSON으로 출력:
{
  "greeting": "${childName || '아이'}에 대한 따뜻한 인사 (1문장)",
  "mainAdvice": "오늘 기록 기반 가장 중요한 조언 (2문장, 구체적)",
  "feedInsight": "수유 패턴 인사이트 (1문장)",
  "sleepInsight": "수면 패턴 인사이트 (1문장)",
  "parentCare": "부모 자기 케어 조언 (1문장)",
  "developmentTip": "${ageMonths}개월 발달 팁 (1문장)"
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
