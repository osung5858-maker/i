import { NextResponse } from 'next/server'
import { getAuthUserSoft } from '@/lib/security/auth'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
  }

  // 인증 체크
  const user = await getAuthUserSoft()
  // soft auth — 인증 실패해도 진행 (rate limit은 IP 폴백)

  // Rate limit 체크 (이미지 분석은 더 제한)
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`analyze-checkup:${user?.id || ip}`, { limit: 5, windowMs: 60_000 })
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 })

  const { image } = await request.json()
  if (!image) {
    return NextResponse.json({ error: 'Image is required' }, { status: 400 })
  }

  try {
    // base64 데이터 추출 (data:image/xxx;base64,XXXXX)
    const base64Match = image.match(/^data:(.+?);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: '올바른 이미지 형식이 아니에요' }, { status: 400 })
    }

    const mimeType = base64Match[1]
    const base64Data = base64Match[2]

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? '' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `이 영유아 건강검진 결과표를 분석해주세요.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "extracted": {
    "height_cm": 숫자 또는 null,
    "weight_kg": 숫자 또는 null,
    "head_cm": 숫자 또는 null,
    "age_months": 숫자 또는 null
  },
  "summary": "전체 요약 (2-3문장, 한국어, 따뜻한 톤)",
  "details": ["상세 분석 1", "상세 분석 2"],
  "recommendations": ["권장사항 1", "권장사항 2"]
}

주의:
- 이미지에서 키, 몸무게, 머리둘레, 개월 수를 추출하세요
- 추출 불가 시 null
- 한국어로 부모가 이해하기 쉽게 작성
- "도담하게"라는 표현을 자연스럽게 사용
- 의료 진단이 아닌 참고용 정보`,
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini error:', err)
      return NextResponse.json({ error: `AI 분석 실패 (${response.status}). 이미지가 너무 크거나 형식이 맞지 않을 수 있어요.` }, { status: 500 })
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      return NextResponse.json({ error: '분석 결과가 없어요' }, { status: 500 })
    }

    // JSON 추출 강화
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: '분석 결과를 파싱할 수 없어요', raw: cleaned.slice(0, 200) }, { status: 500 })
    }
    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json(result)
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: '분석에 실패했어요. 다시 시도해주세요.' }, { status: 500 })
  }
}
