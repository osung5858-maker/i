import { NextResponse } from 'next/server'
import { getAuthUserSoft } from '@/lib/security/auth'
import { checkRateLimit, getClientIP, AI_RATE_LIMIT } from '@/lib/security/rate-limit'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

async function callGemini(prompt: string, maxTokens = 800): Promise<{ text: string | null; error: string | null }> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? '' },
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

  const user = await getAuthUserSoft()
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`ai-growth-sim:${user?.id || ip}`, AI_RATE_LIMIT)
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 })

  const { currentAgeMonths, childName, targetMonths, sex, motherHeight, fatherHeight } = await request.json()

  if (typeof currentAgeMonths !== 'number' || typeof targetMonths !== 'number') {
    return NextResponse.json({ error: '월령 정보가 필요해요' }, { status: 400 })
  }

  const targetAge = currentAgeMonths + targetMonths
  const periodLabel = targetMonths <= 6 ? `${targetMonths}개월 후` : targetMonths <= 12 ? '1년 후' : '3년 후'

  try {
    const prompt = `당신은 소아과 전문의이자 아동 발달 전문가입니다. WHO 성장 기준과 발달 단계에 근거하여 아이의 미래 성장을 예측해주세요.

[아이 정보]
- 이름: ${childName || '아이'}
- 현재 월령: ${currentAgeMonths}개월
- 성별: ${sex === 'male' ? '남아' : sex === 'female' ? '여아' : '미지정'}
- 예측 시점: ${targetAge}개월 (${periodLabel})${motherHeight ? `\n- 엄마 키: ${motherHeight}cm` : ''}${fatherHeight ? `\n- 아빠 키: ${fatherHeight}cm` : ''}${motherHeight && fatherHeight ? `\n- CMH 예상 최종 키: ${sex === 'female' ? Math.round((motherHeight + fatherHeight - 13) / 2) : Math.round((motherHeight + fatherHeight + 13) / 2)}cm` : ''}

[중요 규칙]
1. WHO 성장 기준 50th percentile 기반으로 예측
2. 부모 키가 제공되면 유전적 요인을 반영하여 예측 조정
3. 해당 월령에 맞는 구체적인 발달 이정표 제시
4. 부모가 읽기 쉬운 따뜻한 톤
5. 키/몸무게는 범위로 제시 (예: "약 70~72cm")

반드시 아래 JSON 형식으로만 응답하세요:
{
  "targetAge": "${targetAge}개월",
  "physical": {
    "height": "약 XX~XXcm",
    "weight": "약 X.X~X.Xkg",
    "changes": ["신체 변화 2~3가지"]
  },
  "milestones": ["발달 이정표 3~4가지"],
  "funFacts": ["이 월령 아기에 대한 재미있는 사실 2가지"],
  "parentTip": "이 시기를 준비하는 육아 팁 1문장"
}
JSON만 출력.`

    const { text, error } = await callGemini(prompt, 800)
    if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
      return NextResponse.json(JSON.parse(match[0]))
    } catch {
      return NextResponse.json({ error: 'parse error' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
