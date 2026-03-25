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
        const fi = text.indexOf('{'), li = text.lastIndexOf('}')
        if (fi === -1 || li <= fi) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(text.slice(fi, li + 1)))
      } catch (e: any) {
        return NextResponse.json({ error: `parse error: ${e?.message?.slice(0, 100)}` }, { status: 500 })
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

JSON으로 5개 추천. 각 이름에 한자 후보를 2-3개씩 제공하고 각각의 뜻을 설명하세요:
{
  "names": [
    {
      "name": "이름 (한글)",
      "hanjaOptions": [
        {"hanja": "한자 조합1", "meaning": "각 글자 뜻 풀이"},
        {"hanja": "한자 조합2", "meaning": "각 글자 뜻 풀이"}
      ],
      "meaning": "종합 뜻풀이 (1-2문장)",
      "fiveElements": "음양오행 (목/화/토/금/수)",
      "score": 1~100,
      "scoreDetail": "점수 근거",
      "pronunciation": "좋음/보통",
      "uniqueness": "흔함/보통/독특함",
      "popularity": "2025년 인기 순위 추정 (예: 상위 5%, 상위 20%, 희귀)"
    }
  ]
}
JSON만 출력.`

      const { text, error } = await callGemini(prompt, 800)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
      try {
        const fi = text.indexOf('{'), li = text.lastIndexOf('}')
        if (fi === -1 || li <= fi) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(text.slice(fi, li + 1)))
      } catch (e: any) {
        return NextResponse.json({ error: `parse error: ${e?.message?.slice(0, 100)}` }, { status: 500 })
      }
    }

    // === 이름 분석 ===
    if (type === 'analyze') {
      const { fullName, birthYear, hanja } = body

      const prompt = `당신은 전통 한국 성명학(작명학) 전문가입니다. 아래 이름을 5대 핵심 지표로 정밀 분석해주세요.

[이름 정보]
- 한글: ${fullName}
- 한자: ${hanja || '가장 대표적인 한자로 추정해서 분석'}
- 출생 연도: ${birthYear || '미정'}

[분석 기준 — 전통 성명학 5대 지표]
1. 발음오행 (소리오행): 초성의 오행 배열. ㄱㅋ=목, ㄴㄷㄹㅌ=화, ㅇㅎ=토, ㅅㅈㅊ=금, ㅁㅂㅍ=수. 상생(목→화→토→금→수) 순이면 최고.
2. 수리오행 (4격/81수리): 원격(성), 형격(성+이름첫), 이격(이름), 정격(전체) 계산. 길수/흉수 판별.
3. 음양조화: 한자 획수의 홀짝(양음) 배열. 양양양, 음음음 같은 편중은 감점.
4. 자원오행: 한자 본래의 오행 속성. 부수/의미 기반.
5. 발음/부르기: 실제 발음의 자연스러움, 어감, 부르기 편한 정도.

JSON으로 출력 (반드시 이 구조를 따를 것):
{
  "name": "${fullName}",
  "hanja": "분석에 사용한 한자",
  "totalScore": 종합점수(1~100),
  "scoreBreakdown": {
    "pronunciationOheng": { "score": 0~25, "max": 25, "detail": "초성 오행 배열 분석 2문장" },
    "suriOheng": { "score": 0~25, "max": 25, "detail": "원격/형격/이격/정격 수리와 길흉 분석 2문장" },
    "yinYangHarmony": { "score": 0~20, "max": 20, "detail": "획수 음양 배열 분석 1문장" },
    "sourceOheng": { "score": 0~20, "max": 20, "detail": "한자 자원오행 분석과 사주 적합성 1문장" },
    "pronunciation": { "score": 0~10, "max": 10, "detail": "발음/어감/부르기 편한 정도 1문장" }
  },
  "fiveElements": {
    "wood": 0~100, "fire": 0~100, "earth": 0~100, "metal": 0~100, "water": 0~100,
    "balance": "오행 균형 평가 1문장"
  },
  "meaning": "이름 뜻풀이 (한자 뜻 + 이름 전체 의미 2문장)",
  "strengths": "이 이름의 강점 2문장",
  "caution": "주의할 점 또는 감점 사유 1문장 (없으면 '특별한 주의사항 없음')",
  "overall": "종합 평가 3문장 (성명학 관점의 전문적 총평)",
  "luckyColor": "행운의 색",
  "luckyNumber": "행운의 숫자"
}
중요: 점수는 관대하게 주지 말고 전통 성명학 기준에 맞게 엄격하게 채점.
JSON만 출력. 설명 없이 JSON 객체만.`

      const { text, error } = await callGemini(prompt, 2000)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
      try {
        const fi = text.indexOf('{'), li = text.lastIndexOf('}')
        if (fi === -1 || li <= fi) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(text.slice(fi, li + 1)))
      } catch (e: any) {
        return NextResponse.json({ error: `parse error: ${e?.message?.slice(0, 100)}` }, { status: 500 })
      }
    }

    // === 한자 후보 조회 ===
    if (type === 'hanja') {
      const { fullName } = body
      const chars: string[] = fullName.slice(1).split('')

      const prompt = `한국 이름 "${fullName}"의 각 글자별로 한자 후보를 알려주세요.
성(${fullName[0]})은 제외하고, 이름 글자만 분석하세요.

각 글자별로 10개 한자 후보를 뜻/음/획수와 함께 JSON으로 출력:
{
  "surname": "${fullName[0]}",
  "surnameHanja": "성의 대표 한자",
  "characters": [
    ${chars.map((c: string) => `{
      "char": "${c}",
      "options": [
        {"hanja": "한자", "meaning": "뜻", "reading": "${c}", "strokes": 획수, "element": "목/화/토/금/수 중 하나", "popular": true/false}
      ]
    }`).join(',\n    ')}
  ]
}
중요 규칙:
- 반드시 12개 이상의 한자를 출력
- 인명용으로 자주 쓰이는 한자 5개 (popular: true)
- 인명용은 아니지만 해당 음을 가진 실존 한자 7개 이상 (popular: false)
- 인명용 여부와 관계없이 해당 음의 한자를 최대한 다양하게 포함할 것
- 반드시 포함해야 할 한자 예시:
  도: 道/度/都/島/導/徒/圖/到/桃/陶/跳/塗
  하: 夏/河/荷/賀/霞/下/何/蝦/遐/瑕/鰕/廈
  은: 恩/銀/隱/殷/慇/垠/漦/嶾
  준: 俊/準/峻/隼/焌/竣/遵/純
- popular: 아기 이름에 상위 100위 이내로 쓰이면 true, 그 외 false
- JSON만 출력. 설명 없이 JSON 객체만.`

      const { text, error } = await callGemini(prompt, 2500)
      if (!text) return NextResponse.json({ error: error || 'AI failed' }, { status: 500 })
      try {
        const first = text.indexOf('{')
        const last = text.lastIndexOf('}')
        if (first === -1 || last === -1 || last <= first) {
          return NextResponse.json({ error: 'parse error: no JSON found' }, { status: 500 })
        }
        let jsonStr = text.slice(first, last + 1)
        // 잘린 JSON 자동 복구: 닫히지 않은 배열/객체 닫기
        const opens = (jsonStr.match(/\[/g) || []).length
        const closes = (jsonStr.match(/\]/g) || []).length
        const openBraces = (jsonStr.match(/\{/g) || []).length
        const closeBraces = (jsonStr.match(/\}/g) || []).length
        // 마지막 불완전한 객체 제거 후 닫기
        if (opens > closes || openBraces > closeBraces) {
          // 마지막 완전한 } 이후 자르기
          const lastComplete = jsonStr.lastIndexOf('}')
          jsonStr = jsonStr.slice(0, lastComplete + 1)
          // 남은 열린 괄호 닫기
          for (let i = 0; i < opens - (jsonStr.match(/\]/g) || []).length; i++) jsonStr += ']'
          for (let i = 0; i < openBraces - (jsonStr.match(/\}/g) || []).length; i++) jsonStr += '}'
        }
        return NextResponse.json(JSON.parse(jsonStr))
      } catch (e: any) {
        return NextResponse.json({ error: `parse error: ${e?.message?.slice(0, 100)}` }, { status: 500 })
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
        const fi = text.indexOf('{'), li = text.lastIndexOf('}')
        if (fi === -1 || li <= fi) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(text.slice(fi, li + 1)))
      } catch (e: any) {
        return NextResponse.json({ error: `parse error: ${e?.message?.slice(0, 100)}` }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
