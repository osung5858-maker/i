import { NextResponse } from 'next/server'
import { getCachedResponse, setCachedResponse } from '@/lib/ai/cache'
import { getAuthUserSoft } from '@/lib/security/auth'
import { checkRateLimit, getClientIP, AI_RATE_LIMIT } from '@/lib/security/rate-limit'
import { sanitizeForPrompt } from '@/lib/security/sanitize'

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
      const raw = parts.map((p: any) => p.text || '').join('').trim()
      const text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() || null
      return { text, error: null }
    } catch (e: any) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      return { text: null, error: e?.message?.slice(0, 150) || 'Network error' }
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
1. "잘하고 있어요" 같은 식상한 말 금지. 데이터 기반으로 간결하게.
2. ${ageMonths}개월 기준에 비춰 상태를 판단.
3. 지금 시각 기준 "다음에 할 일" 1가지만.
4. 이상 징후 있으면 부드럽게 경고.
5. ★ 모든 필드는 반드시 1문장, 최대 30자. 짧을수록 좋음. ★

[JSON 출력]
{
  "status": "좋음/보통/주의 중 하나",
  "statusEmoji": "해당 이모지",
  "mainInsight": "핵심 한 줄 요약 (15~25자, 예: '수유 리듬 안정적, 수면 보충 필요')",
  "nextAction": "다음 행동 1가지 (20자 이내, 예: '30분 후 수유 시도')",
  "feedAnalysis": "수유 한 줄 (20자, 예: '권장 대비 70% 섭취')",
  "sleepAnalysis": "수면 한 줄 (20자, 예: '총 6시간, 2시간 부족')",
  "warning": "이상 징후 한 줄 또는 null (25자 이내)",
  "parentTip": "부모 팁 한 줄 (20자 이내)"
}
JSON만 출력. 긴 문장 절대 금지.`

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

      const stage = ageMonths < 6 ? '초기 (미음/퓨레)' : ageMonths < 8 ? '중기 (으깬 음식)' : ageMonths < 10 ? '후기 (잘게 다진)' : '완료기 (부드러운 밥)'

      const prompt = `${ageMonths}개월 아기 이유식 추천. 단계: ${stage}

JSON으로 출력:
{
  "dishTitle": "점심 대표 요리명만 짧게 (예: 소고기 미음, 닭죽)",
  "cuisine": "한식 또는 양식 또는 중식 중 하나만",
  "stage": "${stage}",
  "breakfast": {"menu": "요리명만 짧게 (예: 쌀미음)", "ingredients": "핵심 재료 2-3가지만"},
  "lunch": {"menu": "요리명만 짧게 (예: 소고기 야채죽)", "ingredients": "핵심 재료 2-3가지만"},
  "snack": {"menu": "요리명만 짧게 (예: 고구마 퓨레)", "ingredients": "핵심 재료 2-3가지만"},
  "newFood": "이번 주 도전할 새 식재료 1가지",
  "avoid": "이 월령에 피해야 할 것",
  "tip": "이유식 팁 1문장"
}
한국 가정 이유식 위주. JSON만 출력.`

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
