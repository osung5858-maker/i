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
    // === 주차별 데일리 케어 ===
    if (type === 'daily') {
      const { week, trimester, daysLeft, weight, bloodPressure, fetalMovement, mood, sleep } = body
      const cacheKey = `preg-daily-${week}-${mood || 'none'}`
      const cached = getCachedResponse(cacheKey)
      if (cached) return NextResponse.json(cached)

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
        const parsed = JSON.parse(match[0])
        setCachedResponse(cacheKey, parsed)
        return NextResponse.json(parsed)
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

    // === 임신 중 식단 추천 ===
    if (type === 'meal') {
      const { week } = body
      const mealCacheKey = `preg-meal-${week}-${new Date().toISOString().split('T')[0]}`
      const mealCached = getCachedResponse(mealCacheKey)
      if (mealCached) return NextResponse.json(mealCached)

      const prompt = `임신 ${week}주차 예비맘을 위한 오늘의 식단을 추천해주세요.
임산부가 피해야 할 음식(날생선, 생고기, 알코올, 고카페인)은 절대 추천하지 마세요.
엽산, 철분, 칼슘, DHA가 풍부한 음식 위주로.

JSON으로 출력:
{
  "breakfast": {"menu": "아침 메뉴", "reason": "이유 1줄"},
  "lunch": {"menu": "점심 메뉴", "reason": "이유 1줄"},
  "dinner": {"menu": "저녁 메뉴", "reason": "이유 1줄"},
  "snack": {"menu": "간식", "reason": "이유 1줄"},
  "keyNutrient": "이 주차에 중요한 영양소",
  "avoid": "이 주차에 특히 주의할 것"
}
한국 가정식 위주. JSON만 출력.`

      const { text: mealText, error: mealErr } = await callGemini(prompt, 400)
      if (!mealText) return NextResponse.json({ error: mealErr || 'AI failed' }, { status: 500 })
      try {
        const match = mealText.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        const result = JSON.parse(match[0])
        setCachedResponse(mealCacheKey, result)
        return NextResponse.json(result)
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    // === 운세 ===
    if (type === 'fortune') {
      const { birthYear, birthMonth, birthDay, animal, constellation, context, dueDate: dd } = body
      const prompt = `재미있는 운세를 봐주세요. 따뜻하고 긍정적으로.

[정보]
- 생년월일: ${birthYear}년 ${birthMonth}월 ${birthDay}일
- 띠: ${animal}
- 별자리: ${constellation}
- 현재 상황: ${context}
${dd ? `- 출산 예정일: ${dd}` : ''}
- 오늘 날짜: ${new Date().toLocaleDateString('ko-KR')}

JSON 형식으로 풍부하게 출력:
{
  "todayLuck": "오늘의 전체 운세 (3-4문장, 구체적 상황 묘사)",
  "loveLuck": "사랑/가족운 (2문장)",
  "healthLuck": "건강운 (2문장, ${context} 맞춤)",
  "moneyLuck": "재물운 (1문장)",
  "luckyColor": "행운의 색",
  "luckyFood": "행운의 음식 (한식)",
  "luckyNumber": "행운의 숫자",
  "luckyTime": "행운의 시간대",
  "animalFortune": "${animal} 띠 오늘의 운세 (2문장)",
  "starFortune": "${constellation} 오늘의 운세 (2문장)",
  "babyMessage": "아이가 엄마/아빠에게 하는 한마디 (감성적, 1문장)",
  "weekAdvice": "이번 주 조언 (2문장)",
  "avoidToday": "오늘 피할 것 1가지"
}
재미로 보는 것이므로 부담 없이, 하지만 풍부하고 구체적으로. JSON만 출력.`

      const { text, error } = await callGemini(prompt, 900)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(match[0]))
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    // === 임신 중 식단 추천 ===
    if (type === 'meal') {
      const { week } = body
      const trimester = week <= 13 ? '초기' : week <= 27 ? '중기' : '후기'
      const prompt = `임신 ${week}주차(${trimester}) 산모를 위한 오늘의 식단을 추천해주세요.

JSON 형식:
{
  "breakfast": {"menu": "아침 메뉴명 (한식)", "reason": "이유 1줄"},
  "lunch": {"menu": "점심 메뉴명", "reason": "이유 1줄"},
  "dinner": {"menu": "저녁 메뉴명", "reason": "이유 1줄"},
  "snack": {"menu": "간식", "reason": "이유 1줄"},
  "keyNutrient": "${trimester}에 가장 중요한 영양소",
  "avoid": "이 시기에 특히 피할 음식/습관"
}
한국 가정식 위주. 현실적으로. JSON만 출력.`

      const { text, error } = await callGemini(prompt, 700)
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
