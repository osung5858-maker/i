import { NextResponse } from 'next/server'
import { getCachedResponse, setCachedResponse } from '@/lib/ai/cache'
import { getAuthUserSoft } from '@/lib/security/auth'
import { checkRateLimit, getClientIP, AI_RATE_LIMIT } from '@/lib/security/rate-limit'
import { sanitizeForPrompt } from '@/lib/security/sanitize'
import type { GeminiParentingResponse } from '@/types/gemini'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

async function callGemini(prompt: string, maxTokens = 500, retries = 2): Promise<{ text: string | null; error: string | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? '' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(25000),
      })
      if (res.status === 429 && attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      if (!res.ok) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
          continue
        }
        return { text: null, error: 'AI 서버가 바빠요. 잠시 후 다시 시도해주세요.' }
      }
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts || []
      const raw = parts.map((p: { text?: string }) => p.text || '').join('').trim()
      const text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() || null
      return { text, error: null }
    } catch (e) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      return { text: null, error: (e as Error)?.message?.slice(0, 150) || 'Network error' }
    }
  }
  return { text: null, error: 'Max retries exceeded' }
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  // 인증 체크
  const user = await getAuthUserSoft()
  // soft auth — 인증 실패해도 진행 (rate limit은 IP 폴백)

  // Rate limit 체크
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`ai-parenting:${user?.id || ip}`, AI_RATE_LIMIT)
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 })

  const body = await request.json()
  const { type } = body

  try {
    // === 데일리 케어 ===
    if (type === 'daily') {
      const { childName: rawChildName, ageMonths, feedCount, sleepCount, poopCount, feedTotal, sleepTotal, mood } = body
      const childName = sanitizeForPrompt(rawChildName, 50)
      const cacheKey = `parent-daily-${ageMonths}-${feedCount}-${sleepCount}-${mood || 'none'}`
      const cached = getCachedResponse(cacheKey)
      if (cached) return NextResponse.json(cached)

      const { lastFeedMinAgo, lastSleepMinAgo, avgFeedGap, sleepingNow, feedAmounts, recentDays } = body
      const hour = new Date().getHours()
      const timeContext = hour < 6 ? '새벽' : hour < 12 ? '오전' : hour < 18 ? '오후' : '저녁'

      const prompt = `당신은 "도담" 앱의 AI 육아 전문가입니다. 소아과 의사처럼 간결하게 조언하세요. 의료 진단은 하지 마세요.

[데이터] ${ageMonths}개월 아기, ${timeContext} ${hour}시
수유 ${feedCount}회${feedTotal ? ` 총${feedTotal}ml` : ''}${feedAmounts ? ` [${feedAmounts}]` : ''} | 수면 ${sleepCount}회${sleepTotal ? ` 총${sleepTotal}분` : ''}${sleepingNow ? ' (수면중)' : ''} | 배변 ${poopCount}회
마지막수유 ${lastFeedMinAgo ? `${lastFeedMinAgo}분전` : '-'} | 마지막수면 ${lastSleepMinAgo ? `${lastSleepMinAgo}분전` : '-'} | 평균수유간격 ${avgFeedGap ? `${avgFeedGap}분` : '-'}

[규칙]
1. 각 필드는 완전히 다른 레이어의 정보를 담는다. 같은 내용을 다른 말로 반복하면 실격.
2. status/mainInsight/warning 사이에 모순 금지. 수유가 과다면 "양호"라 하지 마라.
3. feedAnalysis/sleepAnalysis는 숫자+단위만. 판단어(양호/부족/과다/정상) 절대 금지.
4. mainInsight에 "수유"/"수면" 단어 쓰지 마라 (feedAnalysis/sleepAnalysis가 담당).
5. warning은 수치 반복 금지. 왜 조치가 필요한지 이유만.
6. nextAction은 동사로 시작하는 행동만 (상태 설명 금지).
7. 모든 값 최대 20자.

[JSON]
{"status":"좋음|보통|주의","statusEmoji":"😊|😐|⚠️","mainInsight":"전체 톤 한마디 (수유/수면 언급X)","feedAnalysis":"숫자만 (예: 총540ml, 4회)","sleepAnalysis":"숫자만 (예: 총4시간, 2회)","warning":"이유만 or null","nextAction":"동사+행동"}
JSON만 출력. parentTip 필드 불필요.`

      const { text, error } = await callGemini(prompt, 300)
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
      const today = new Date().toISOString().slice(0, 10)
      const cacheKey = `parent-meal-${ageMonths}-${today}`
      const cached = getCachedResponse(cacheKey)
      if (cached) return NextResponse.json(cached)

      const stage = ageMonths < 6 ? '초기 (미음/퓨레)' : ageMonths < 8 ? '중기 (으깬 음식)' : ageMonths < 10 ? '후기 (잘게 다진)' : '완료기 (부드러운 밥)'

      const prompt = `${ageMonths}개월 아기 이유식 추천. 단계: ${stage}

JSON으로 출력:
{
  "dishTitle": "점심 대표 요리명만 짧게 (예: 소고기 미음, 닭죽)",
  "cuisine": "한식 또는 양식 또는 중식 중 하나만",
  "stage": "${stage}",
  "breakfast": {"menu": "요리명만 짧게 (예: 쌀미음)", "sides": ["핵심재료1", "핵심재료2"], "calories": 숫자, "ingredients": "핵심 재료 2-3가지만"},
  "lunch": {"menu": "요리명만 짧게 (예: 소고기 야채죽)", "sides": ["핵심재료1", "핵심재료2"], "calories": 숫자, "ingredients": "핵심 재료 2-3가지만"},
  "snack": {"menu": "요리명만 짧게 (예: 고구마 퓨레)", "sides": ["핵심재료1"], "calories": 숫자, "ingredients": "핵심 재료 2-3가지만"},
  "newFood": "이번 주 도전할 새 식재료 1가지",
  "avoid": "이 월령에 피해야 할 것",
  "tip": "이유식 팁 1문장"
}
한국 가정 이유식 위주. calories는 해당 끼니 예상 칼로리(kcal, 숫자만). JSON만 출력.`

      const { text, error } = await callGemini(prompt, 700)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        const result = JSON.parse(match[0])
        setCachedResponse(cacheKey, result, 86400 * 1000)
        return NextResponse.json(result)
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    // === 양육자 식단 추천 ===
    if (type === 'caregiver_meal') {
      const { ageMonths } = body
      const cacheKey = `caregiver-meal-v1-${new Date().toISOString().split('T')[0]}`
      const cached = getCachedResponse(cacheKey)
      if (cached) return NextResponse.json(cached)

      const prompt = `${ageMonths}개월 아기를 키우는 양육자를 위한 오늘의 식단을 추천해주세요.
육아로 바쁜 현실을 고려해 간단하면서도 영양 균형 잡힌 식단으로.
한식·양식·일식·중식·분식 등 다양한 장르를 자연스럽게 섞어서 추천하세요. 매번 한식 위주가 되지 않도록 하세요.
각 끼니는 메인 요리 1가지와 곁들이는 음식들로 구성하세요. 밥+국+반찬 형식에 국한하지 마세요.

JSON으로 출력:
{
  "breakfast": {"menu": "메인 요리명", "sides": ["곁들이1", "곁들이2"], "calories": 숫자, "reason": "이유 1줄"},
  "lunch": {"menu": "메인 요리명", "sides": ["곁들이1", "곁들이2", "곁들이3"], "calories": 숫자, "reason": "이유 1줄"},
  "dinner": {"menu": "메인 요리명", "sides": ["곁들이1", "곁들이2", "곁들이3"], "calories": 숫자, "reason": "이유 1줄"},
  "snack": {"menu": "간식명", "sides": ["곁들이1"], "calories": 숫자, "reason": "이유 1줄"},
  "keyNutrient": "육아 중 양육자에게 중요한 영양소",
  "avoid": "피로 회복을 위해 피할 것"
}
calories는 해당 끼니 예상 총칼로리(숫자만). JSON만 출력.`

      const { text, error } = await callGemini(prompt, 800)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
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

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
