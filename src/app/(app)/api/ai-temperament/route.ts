import { NextResponse } from 'next/server'
import { getCachedResponse, setCachedResponse } from '@/lib/ai/cache'
import { getAuthUserSoft } from '@/lib/security/auth'
import { checkRateLimit, getClientIP, AI_RATE_LIMIT } from '@/lib/security/rate-limit'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

async function callGemini(prompt: string, maxTokens = 800, retries = 2): Promise<{ text: string | null; error: string | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? '' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
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

  const user = await getAuthUserSoft()
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`ai-temperament:${user?.id || ip}`, AI_RATE_LIMIT)
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 })

  const body = await request.json()
  const {
    childName, ageMonths, totalDays,
    avgFeedPerDay, avgSleepPerDay, avgActivityPerDay,
    feedTimeStdDev, sleepTimeStdDev,
    patternChangeAdaptDays,
  } = body

  // 같은 패턴 데이터면 캐시 반환 (24시간)
  const cacheKey = `temperament-${ageMonths}-${totalDays}-${avgFeedPerDay}-${avgSleepPerDay}-${avgActivityPerDay}-${feedTimeStdDev}-${sleepTimeStdDev}`
  const cached = getCachedResponse(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const prompt = `당신은 "도담" 앱의 아기 기질 분석 전문가입니다. 아기의 케어 이벤트 패턴 데이터를 보고 기질 유형을 분석해주세요.

[아이 정보]
- 이름: ${childName || '아이'}
- 월령: ${ageMonths}개월
- 분석 기간: ${totalDays}일

[패턴 데이터]
- 하루 평균 수유: ${avgFeedPerDay}회
- 하루 평균 수면: ${avgSleepPerDay}회
- 하루 평균 총 이벤트: ${avgActivityPerDay}회
- 수유 시간 표준편차: ${feedTimeStdDev}분 (낮을수록 규칙적)
- 수면 시간 표준편차: ${sleepTimeStdDev}분 (낮을수록 규칙적)
- 패턴 변화 적응 일수: ${patternChangeAdaptDays}일

[기질 유형 4가지 중 1가지 선택]
1. "해맑이" — 규칙적 패턴, 좋은 수면, 안정적
2. "자유로운 탐험가" — 불규칙하지만 활발, 호기심 많음
3. "섬세한 감성파" — 루틴 필요, 변화에 민감
4. "열정 에너자이저" — 높은 활동량, 짧은 수면, 잦은 수유

[점수 기준] 각 0~100
- 규칙성: 수유/수면 시간 표준편차가 낮을수록 높음
- 활동량: 일 평균 이벤트 수 기반
- 적응성: 패턴 변화 적응 일수가 짧을수록 높음
- 민감성: 규칙성 + 수면 패턴 변동성 기반

[JSON 출력]
{
  "type": "해맑이/자유로운 탐험가/섬세한 감성파/열정 에너자이저",
  "emoji": "유형에 맞는 이모지 1개",
  "title": "우리 ${childName || '아이'}는 ○○ 타입!",
  "description": "유형 설명 2~3문장",
  "scores": {
    "regularity": 0~100,
    "activity": 0~100,
    "adaptability": 0~100,
    "sensitivity": 0~100
  },
  "strengths": ["강점 3가지"],
  "parentingTips": ["육아 팁 3가지"],
  "funFact": "이 유형 아기에 대한 재미있는 한 줄"
}
JSON만 출력.`

    const { text, error } = await callGemini(prompt, 800)
    if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
      const result = JSON.parse(match[0])
      setCachedResponse(cacheKey, result, 24 * 60 * 60 * 1000) // 24시간
      return NextResponse.json(result)
    } catch {
      return NextResponse.json({ error: 'parse error' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
