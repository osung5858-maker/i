import { NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

async function callGemini(prompt: string, maxTokens = 800): Promise<{ text: string | null; error: string | null }> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    return { text: null, error: `Gemini ${res.status}: ${err.slice(0, 150)}` }
  }
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const raw = parts.map((p: any) => p.text || '').join('').trim()
  // 코드블록 마커 제거
  const text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() || null
  return { text, error: null }
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  const body = await request.json()
  const { type } = body

  try {
    // === 태명 추천 ===
    if (type === 'nickname') {
      const { theme, gender } = body

      const prompt = `한국 전통 태명을 추천해주세요.

[조건]
- 희망 테마: ${theme || '건강하게 자라길'}
- 성별: ${gender || '모름'}
- 태명은 임신 중 아이를 부르는 별명입니다

JSON으로 5개 추천:
{
  "names": [
    {
      "name": "태명",
      "meaning": "의미 설명 (1문장)",
      "origin": "유래 (전통/현대/자연 등)",
      "vibe": "느낌 (따뜻한/활발한/고요한 등)"
    }
  ],
  "tip": "좋은 태명 짓는 팁 1문장"
}
JSON만 출력.`

      const { text, error } = await callGemini(prompt, 600)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(match[0]))
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    // === 이름 추천 ===
    if (type === 'suggest') {
      const { lastName, gender, theme, syllables } = body

      const prompt = `한국 아기 이름을 추천해주세요.

[조건]
- 성: ${lastName || '미정'}
- 성별: ${gender || '모름'}
- 희망 테마/뜻: ${theme || '건강하고 지혜로운'}
- 음절 수: ${syllables || 2}글자

JSON으로 5개 추천:
{
  "names": [
    {
      "name": "이름 (한글)",
      "hanja": "한자 (있으면)",
      "meaning": "뜻풀이 (1-2문장)",
      "fiveElements": "음양오행 분석 (목/화/토/금/수 중 해당 요소)",
      "score": 1~100 (작명 점수),
      "scoreDetail": "점수 근거 1문장",
      "pronunciation": "발음 평가 (좋음/보통)",
      "uniqueness": "흔함/보통/독특함"
    }
  ]
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
    }

    // === 이름 분석 ===
    if (type === 'analyze') {
      const { fullName, birthYear } = body

      const prompt = `한국 이름을 음양오행 기반으로 분석해주세요.

[이름]
- 이름: ${fullName}
- 출생 연도: ${birthYear || '미정'}

JSON으로 출력:
{
  "name": "${fullName}",
  "totalScore": 1~100,
  "hanja": "추정 한자 (대표적인 것)",
  "meaning": "이름 뜻풀이 (2문장)",
  "fiveElements": {
    "wood": 0~100,
    "fire": 0~100,
    "earth": 0~100,
    "metal": 0~100,
    "water": 0~100,
    "balance": "균형 평가 1문장"
  },
  "yinYang": "음양 조화 평가 1문장",
  "pronunciation": "발음 평가 1문장",
  "strokes": "획수 분석 1문장",
  "overall": "종합 평가 2문장",
  "luckyColor": "행운의 색",
  "luckyNumber": "행운의 숫자"
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
    }

    // === 이름 비교 분석 ===
    if (type === 'compare') {
      const { names, birthYear } = body

      const prompt = `한국 아기 이름 후보들을 음양오행 기반으로 비교 분석해주세요.

[후보 이름]
${(names as string[]).map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}
- 출생 연도: ${birthYear || '미정'}

각 이름을 분석하고 순위를 매겨주세요.

JSON으로 출력:
{
  "results": [
    {
      "rank": 1,
      "name": "이름",
      "hanja": "추정 한자",
      "score": 1~100,
      "meaning": "뜻풀이 (1문장)",
      "fiveElements": "주요 오행 요소",
      "yinYang": "음양 조화 한줄",
      "pronunciation": "좋음/보통/아쉬움",
      "strokes": "획수 길흉",
      "highlight": "이 이름의 가장 큰 장점 1문장"
    }
  ],
  "recommendation": "종합 추천 의견 (어떤 이름이 가장 좋은지, 왜인지 2문장)",
  "tip": "이름 선택 시 참고 사항 1문장"
}
점수 순으로 정렬. JSON만 출력.`

      const { text, error } = await callGemini(prompt, 1000)
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
