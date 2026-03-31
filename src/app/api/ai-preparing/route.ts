import { NextResponse } from 'next/server'
import { getCachedResponse, setCachedResponse } from '@/lib/ai/cache'
import { getAuthUserSoft } from '@/lib/security/auth'
import { checkRateLimit, getClientIP, AI_RATE_LIMIT } from '@/lib/security/rate-limit'
import { sanitizeForPrompt } from '@/lib/security/sanitize'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

async function callGemini(prompt: string, maxTokens = 500, temperature = 0.7, retries = 1): Promise<{ text: string | null; error: string | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? '' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
      }),
    })

    if (res.ok) {
      const data = await res.json()
      // gemini-2.5-flash는 parts가 여러 개일 수 있음 (thinking + response)
      const parts = data.candidates?.[0]?.content?.parts || []
      const raw = parts.map((p: any) => p.text || '').join('').trim()
      const text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() || null
      return { text, error: null }
    }

    // 429 → 잠시 후 재시도
    if (res.status === 429 && attempt < retries) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
      continue
    }

    const errBody = await res.text().catch(() => 'unknown')
    console.error(`Gemini ${res.status}: ${errBody}`)
    return { text: null, error: `Gemini ${res.status}${res.status === 429 ? ' (한도 초과 — 잠시 후 다시 시도해주세요)' : ''}: ${errBody.slice(0, 150)}` }
  }
  return { text: null, error: 'Max retries exceeded' }
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  // 인증 체크
  const user = await getAuthUserSoft()
  // soft auth — 인증 실패해도 진행 (rate limit은 IP 폴백)

  // Rate limit 체크
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`ai-preparing:${user?.id || ip}`, AI_RATE_LIMIT)
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 })

  const body = await request.json()
  const { type } = body

  try {
    // === 데일리 브리핑 ===
    if (type === 'daily') {
      const { cycleDay, cycleLength, phase, motherAge, fatherAge, mood, supplements, exercise, partnerChecks, sleep, steps, stress } = body

      // 서버 캐시 (주기+단계+기분이 같으면 재사용)
      const cacheKey = `prep-daily-${cycleDay}-${phase}-${mood || 'none'}-${supplements || 0}`
      const cached = getCachedResponse(cacheKey)
      if (cached) return NextResponse.json(cached)

      const prompt = `당신은 "도담" 앱의 AI 임신 준비 코치입니다. 따뜻하면서도 전문적인 톤으로 조언해주세요.
절대 의료 진단을 하지 마세요. "도담하게"라는 표현을 자연스럽게 사용하세요.
사용자는 아직 임신 전 준비 단계입니다. "엄마"가 아닌 "예비맘" 또는 이름 없이 자연스럽게 호칭하세요.

[사용자 상태]
- 생리 주기: ${cycleLength}일 / 현재 ${cycleDay}일차
- 주기 단계: ${phase} (follicular=준비기, fertile=가임기, ovulation=배란일, luteal=황체기, tww=착상 기다리는 중)
- 엄마 나이: ${motherAge || '미입력'}세
- 아빠 나이: ${fatherAge || '미입력'}세
- 오늘 기분: ${mood || '미기록'}
- 영양제 복용: ${supplements || 0}/4 완료
- 오늘 운동/마음챙김: ${exercise?.length ? exercise.join(', ') : '미기록'}
- 파트너 건강 체크: ${partnerChecks}/6 완료
- 수면: ${sleep || '미기록'}시간
- 걸음수: ${steps || '미기록'}보
- 스트레스: ${stress === undefined ? '미기록' : ['좋음', '보통', '높음', '매우높음'][stress]}

[요청]
위 데이터를 종합해 오늘의 맞춤 조언을 JSON 형식으로 작성하세요.
인사말("안녕하세요" 등) 절대 넣지 마세요. 핵심 정보와 행동 제안만.

{
  "summary": "오늘 가장 중요한 핵심 2-3줄 (주기 상태 + 해야 할 것 + 주의사항. 구체적으로)",
  "mainAdvice": "상세 조언 (3-4문장, 구체적 행동 제안)",
  "cycleInsight": "주기 단계별 특화 조언 (1-2문장)",
  "nutritionTip": "오늘 추천 음식/영양소 (1문장)",
  "emotionalCare": "감정 상태 기반 마음 케어 (1-2문장)",
  "partnerTip": "파트너와 함께할 오늘의 팁 (1문장)",
  "todayScore": 1~100 (종합 컨디션 점수, 숫자만)
}

JSON만 출력하세요.`

      const { text, error: geminiErr } = await callGemini(prompt, 600, 0.6)
      if (!text) return NextResponse.json({ error: geminiErr || 'AI failed' }, { status: 500 })

      try {
        const cleanedText = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return NextResponse.json({ summary: text.slice(0, 200), mainAdvice: '', cycleInsight: '', nutritionTip: '', emotionalCare: '', partnerTip: '', todayScore: 70 })
        const parsed = JSON.parse(jsonMatch[0])
        setCachedResponse(cacheKey, parsed)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({ summary: text.slice(0, 200), mainAdvice: '', cycleInsight: '', nutritionTip: '', emotionalCare: '', partnerTip: '', todayScore: 70 })
      }
    }

    // === 편지 AI 답장 ===
    if (type === 'letter') {
      const { letterText, letterCount } = body
      const safeLetterText = sanitizeForPrompt(letterText, 1000)

      const prompt = `당신은 아직 세상에 오지 않은 아기입니다. 엄마(또는 아빠)가 편지를 보냈어요.
아기의 시점에서 따뜻하고 순수하게 답장을 써주세요.

[규칙]
- 아기는 아직 태어나지 않았지만, 엄마 아빠의 마음을 느끼고 있어요
- 2-4문장으로 짧고 감성적으로
- 시적이고 따뜻한 표현 사용
- 이모지 1-2개 자연스럽게 포함
- ${letterCount > 20 ? '많은 편지를 받아 사랑으로 가득 찬 느낌' : letterCount > 5 ? '점점 엄마 아빠를 알아가는 느낌' : '처음 인사하는 설렘'}을 담아주세요

[엄마/아빠의 편지]
"${safeLetterText}"

아기의 답장만 출력하세요. 따옴표 없이.`

      const r2 = await callGemini(prompt, 200, 0.8)
      return NextResponse.json({ reply: r2.text || '엄마 아빠의 마음이 여기까지 닿고 있어요. 곧 만날게요 💛' })
    }

    // === 주기별 식단 추천 ===
    if (type === 'meal') {
      const { phase, cycleDay } = body
      const mealCacheKey = `prep-meal-v3-${phase}-${new Date().toISOString().split('T')[0]}`
      const mealCached = getCachedResponse(mealCacheKey)
      if (mealCached) return NextResponse.json(mealCached)

      const prompt = `당신은 임신 준비 영양 전문가입니다.
현재 생리주기 ${cycleDay}일차, 단계: ${phase}에 맞는 오늘의 식단을 추천해주세요.
각 끼니는 반드시 밥 1가지 + 국/찌개 1가지 + 반찬 3가지 이상으로 구성하세요.

JSON 형식으로 출력:
{
  "dishTitle": "점심 대표 요리명만 짧게 (예: 된장찌개 한상)",
  "cuisine": "한식 또는 양식 또는 중식 또는 일식 중 하나만",
  "breakfast": {"menu": "밥 이름 (예: 잡곡밥)", "sides": ["국/찌개", "메인반찬(단백질요리, 예:달걀찜)", "나물/채소반찬", "김치류"], "calories": 숫자, "reason": "이유 1줄"},
  "lunch": {"menu": "밥 이름 (예: 현미밥)", "sides": ["국/찌개", "메인반찬(단백질요리, 예:제육볶음)", "나물/채소반찬", "김치류"], "calories": 숫자, "reason": "이유 1줄"},
  "dinner": {"menu": "밥 이름 (예: 잡곡밥)", "sides": ["국/찌개", "메인반찬(단백질요리, 예:두부조림)", "나물/채소반찬", "김치류"], "calories": 숫자, "reason": "이유 1줄"},
  "snack": {"menu": "간식명 (예: 두유)", "sides": ["견과류", "과일"], "calories": 숫자, "reason": "이유 1줄"},
  "keyNutrient": "이 단계에 가장 중요한 영양소",
  "avoid": "이 단계에 특히 피할 것"
}

한국 가정식 위주로 현실적으로. calories는 해당 끼니 예상 총칼로리(kcal, 숫자만). JSON만 출력.`

      const { text: mealText, error: mealErr } = await callGemini(prompt, 700, 0.7)
      if (!mealText) return NextResponse.json({ error: mealErr || 'AI failed' }, { status: 500 })

      try {
        // 코드블록 제거 후 JSON 추출
        const cleaned = mealText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return NextResponse.json({ error: `JSON 없음: ${cleaned.slice(0, 100)}` }, { status: 500 })
        const mealResult = JSON.parse(jsonMatch[0])
        setCachedResponse(mealCacheKey, mealResult)
        return NextResponse.json(mealResult)
      } catch (e) {
        return NextResponse.json({ error: `파싱 실패: ${mealText.slice(0, 100)}` }, { status: 500 })
      }
    }

    // === 감정 분석 ===
    if (type === 'emotion') {
      const { moodHistory, currentMood } = body

      const prompt = `당신은 임신 준비 중인 여성의 감정 케어 전문가입니다.
따뜻하고 공감하는 톤으로, 절대 진단하지 마세요.

[최근 감정 기록]
${moodHistory || '기록 없음'}

[오늘 감정]
${currentMood}

2-3문장으로 공감 + 구체적 마음 케어 제안을 해주세요. 순수 텍스트만.`

      const r3 = await callGemini(prompt, 200, 0.7)
      return NextResponse.json({ advice: r3.text || '오늘 하루도 수고했어요. 자신을 위한 시간을 가져보세요 💚' })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
