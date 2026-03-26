import { NextResponse } from 'next/server'
import { getAuthUserSoft } from '@/lib/security/auth'
import { checkRateLimit, getClientIP, AI_RATE_LIMIT } from '@/lib/security/rate-limit'
import { sanitizeForPrompt } from '@/lib/security/sanitize'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
// 이름 분석은 정확도가 중요 → Pro 모델 사용
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent`

async function callGemini(prompt: string, maxTokens = 800, retries = 2): Promise<{ text: string | null; error: string | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
        }),
      })
      if (res.status === 429 && attempt < retries) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
        continue
      }
      if (!res.ok) {
        const err = await res.text().catch(() => '')
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
        return { text: null, error: `AI 서버가 바빠요. 잠시 후 다시 시도해주세요.` }
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
      return { text: null, error: '네트워크 오류가 발생했어요. 다시 시도해주세요.' }
    }
  }
  return { text: null, error: 'AI 서버가 바빠요. 잠시 후 다시 시도해주세요.' }
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  // 인증 체크
  const user = await getAuthUserSoft()
  // soft auth — 인증 실패해도 진행 (rate limit은 IP 폴백)

  // Rate limit 체크
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`ai-name:${user?.id || ip}`, AI_RATE_LIMIT)
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 })

  const body = await request.json()
  const { type } = body

  try {
    // === 태명 추천 ===
    if (type === 'nickname') {
      const { theme, gender } = body

      const prompt = `한국 전통 태명을 추천해주세요.

[조건]
- 희망 테마: ${sanitizeForPrompt(theme, 200) || '건강하게 자라길'}
- 성별: ${sanitizeForPrompt(gender, 20) || '모름'}
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

      const prompt = `당신은 전통 한국 성명학 전문가입니다. 아기 이름을 추천하되, **삼원오행 상생과 정확한 획수 계산**을 반영하세요.

[조건]
- 성: ${sanitizeForPrompt(lastName, 20) || '미정'}
- 성별: ${sanitizeForPrompt(gender, 20) || '모름'}
- 희망 테마/뜻: ${sanitizeForPrompt(theme, 200) || '건강하고 지혜로운'}
- 음절 수: ${syllables || 2}글자

[★ 핵심 규칙]
1. 획수는 반드시 **강희자전 정자체(원획)** 기준 (氵=4획, 扌=4획, 艹=6획 등)
2. 삼원(원격·형격·이격) 오행이 상생하는 이름 우선 추천
3. 음양 조화(홀짝 교차)가 좋은 이름 우선
4. 각 한자 조합별로 실제 획수와 삼원오행 결과를 명시

JSON으로 5개 추천:
{
  "names": [
    {
      "name": "이름 (한글)",
      "hanjaOptions": [
        {"hanja": "한자조합", "meaning": "각 글자 뜻", "strokes": [성획수, 이름첫획수, 이름둘째획수], "samwon": "원격오행→형격오행→이격오행", "samwonOk": true/false}
      ],
      "meaning": "종합 뜻풀이 (1-2문장)",
      "fiveElements": "주요 음양오행",
      "score": 1~100,
      "scoreDetail": "삼원오행 상생 여부 + 음양조화 근거",
      "pronunciation": "좋음/보통",
      "uniqueness": "흔함/보통/독특함",
      "popularity": "인기 순위 추정 (상위 5%/20%/희귀)"
    }
  ]
}
삼원오행 상생 이름을 높은 점수로.
★ 채점: 삼원 상생 + 길수 + 음양조화가 모두 좋으면 90~98점. 보통은 65~80점. 계산 결과가 좋으면 높은 점수가 정확한 분석. 일부러 깎지 마세요.
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
      const { fullName: rawFullName, birthYear, hanja: rawHanja } = body
      const fullName = sanitizeForPrompt(rawFullName, 50)
      const hanja = sanitizeForPrompt(rawHanja, 50)

      const prompt = `당신은 전통 한국 성명학(작명학) 최고 전문가입니다. 아래 이름을 정밀 분석하되, **획수 계산과 오행 배치를 정확하게** 수행하세요.

[이름 정보]
- 한글: ${fullName}
- 한자: ${hanja || '가장 대표적인 한자로 추정하여 분석 (반드시 실제 한자와 정확한 획수를 사용)'}
- 출생 연도: ${birthYear || '미정'}

[★ 핵심 규칙 — 반드시 준수]

1. **정자체(원획) 획수 사용**: 성명학에서는 강희자전 원획수(정자체)를 사용합니다.
   - 예: 氵(삼수변) = 水 4획, 扌(재방변) = 手 4획, 艹(초두머리) = 艸 6획
   - 예: 廈 = 13획(정자체), 夏 = 10획, 河 = 9획(정자체)
   - **잘못된 필기체/약자 획수를 절대 사용하지 마세요**

2. **삼원(三元) 계산법** — 원격·형격·이격:
   - 원격(천격) = 성의 획수 + 1 (외자 성)
   - 형격(인격) = 성 획수 + 이름 첫 글자 획수
   - 이격(지격) = 이름 글자들의 획수 합 (이름이 1글자면 + 1)
   - 정격(외격/총격) = 전체 획수 합
   - 각 격의 끝자리 수로 오행 판별: 1,2=목, 3,4=화, 5,6=토, 7,8=금, 9,0=수

3. **삼원오행 상생 판별**: 원격→형격→이격 순서로 오행이 상생해야 합니다.
   - 상생: 목→화→토→금→수→목 (순환)
   - 예: 화-목-화(火-木-火)는 목생화(木生火)로 상생 구조
   - 상극이 있으면 감점

4. **음양조화**: 각 글자의 획수가 홀수=양, 짝수=음
   - 예: 22획(음)-10획(음)-13획(양) → 음-음-양
   - 양양양, 음음음 같은 편중은 감점, 교차 배열이 좋음

5. **발음오행**: 초성의 오행 — ㄱㅋ=목, ㄴㄷㄹㅌ=화, ㅇㅎ=토, ㅅㅈㅊ=금, ㅁㅂㅍ=수

JSON 출력 (반드시 이 구조):
{
  "name": "${fullName}",
  "hanja": "분석에 사용한 한자 (정확한 한자)",
  "hanjaDetail": [
    {"char": "한자1", "reading": "음", "strokes": 정확한획수, "element": "오행", "note": "획수 근거 (예: 강희자전 원획)"}
  ],
  "totalScore": 종합점수(1~100),
  "strokeCalc": {
    "values": [성획수, 이름첫획수, 이름둘째획수],
    "wongyeok": {"value": 숫자, "element": "오행", "gilhyung": "길/흉/반길"},
    "hyunggyeok": {"value": 숫자, "element": "오행", "gilhyung": "길/흉/반길"},
    "igyeok": {"value": 숫자, "element": "오행", "gilhyung": "길/흉/반길"},
    "jeonggyeok": {"value": 숫자, "element": "오행", "gilhyung": "길/흉/반길"},
    "samwonFlow": "원격오행→형격오행→이격오행 (예: 火→木→火)",
    "samwonResult": "상생/상극/혼합 여부 설명 1문장"
  },
  "yinYang": {
    "pattern": "각 글자별 음양 (예: 음(22)-음(10)-양(13))",
    "evaluation": "조화 평가 1문장"
  },
  "scoreBreakdown": {
    "pronunciationOheng": { "score": 0~25, "max": 25, "detail": "초성 오행 배열과 상생 분석 2문장" },
    "suriOheng": { "score": 0~25, "max": 25, "detail": "삼원 수리 계산 결과와 길흉 + 삼원오행 상생 분석 2문장" },
    "yinYangHarmony": { "score": 0~20, "max": 20, "detail": "획수 음양 배열과 조화도 분석 1문장" },
    "sourceOheng": { "score": 0~20, "max": 20, "detail": "한자 자원오행 분석과 사주 적합성 1문장" },
    "pronunciation": { "score": 0~10, "max": 10, "detail": "발음/어감/부르기 편한 정도 1문장" }
  },
  "fiveElements": {
    "wood": 0~100, "fire": 0~100, "earth": 0~100, "metal": 0~100, "water": 0~100,
    "balance": "오행 균형 평가 1문장"
  },
  "meaning": "이름 뜻풀이 (한자별 뜻 + 이름 전체 의미 2문장)",
  "strengths": "이 이름의 강점 2문장",
  "caution": "주의할 점 또는 감점 사유 1문장 (없으면 '특별한 주의사항 없음')",
  "overall": "종합 평가 3문장 (획수 계산 근거 + 삼원오행 상생 결과 + 성명학 관점 총평)",
  "luckyColor": "행운의 색",
  "luckyNumber": "행운의 숫자"
}

★ 채점 기준 (정확하게 반영할 것):
- 획수는 반드시 강희자전 정자체(원획) 기준. 약자/속자 획수 사용 금지.
- 삼원 계산 과정(원격·형격·이격)을 strokeCalc에 반드시 보여줄 것.

★ 점수 산출 규칙 (이것을 따르지 않으면 분석이 틀린 것임):
- 삼원오행이 모두 상생하면 suriOheng은 22~25점. 하나라도 상극이면 10점 이하.
- 4격(원격·형격·이격·정격)이 모두 길수이면 suriOheng 만점(25).
- 음양이 양-음-양 또는 음-양-음처럼 교차하면 yinYangHarmony 18~20점. 같은 음양이 3개 연속이면 8점 이하.
- 음-음-양 또는 양-양-음처럼 2:1 비율이면 yinYangHarmony 13~16점.
- 발음오행이 상생 구조면 pronunciationOheng 20~25점.
- 성명학 전문가 감명 수준의 이름(삼원 상생 + 길수 + 음양조화 + 좋은 뜻)은 종합 90~98점이 정상.
- 보통 이름은 65~80점, 나쁜 이름은 40~60점.
- **계산 결과가 좋으면 높은 점수를 주는 것이 정확한 분석임. 일부러 깎지 마세요.**

JSON만 출력. 설명 없이 JSON 객체만.`

      const { text, error } = await callGemini(prompt, 2500)
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

      const prompt = `당신은 전통 한국 성명학(작명학) 최고 전문가입니다. 아래 이름 후보들을 **정확한 획수 계산과 삼원오행 상생** 기준으로 비교 분석해주세요.

[후보 이름]
${(names as string[]).map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}
- 출생 연도: ${birthYear || '미정'}

[★ 핵심 규칙]
1. 획수는 반드시 **강희자전 정자체(원획)** 기준. 약자/속자 획수 사용 금지.
   - 氵=4획(水), 扌=4획(手), 艹=6획(艸), 廈=13획 등
2. 삼원 계산: 원격(성+1), 형격(성+이름첫), 이격(이름합), 정격(총합)
3. 삼원오행 판별: 각 격의 끝자리 수로 오행 (1,2=목, 3,4=화, 5,6=토, 7,8=금, 9,0=수)
4. 상생(목→화→토→금→수→목) 순서면 높은 점수

JSON으로 출력:
{
  "results": [
    {
      "rank": 1,
      "name": "이름",
      "hanja": "정확한 한자",
      "strokes": [성획수, 이름첫획수, 이름둘째획수],
      "samwon": "원격오행→형격오행→이격오행 (예: 火→木→火)",
      "samwonResult": "상생/상극 여부",
      "yinYang": "음양 배열 (예: 음-음-양)",
      "score": 1~100,
      "meaning": "뜻풀이 (1문장)",
      "fiveElements": "주요 오행 요소",
      "pronunciation": "좋음/보통/아쉬움",
      "highlight": "이 이름의 가장 큰 장점 1문장"
    }
  ],
  "recommendation": "종합 추천 (어떤 이름이 가장 좋은지, 삼원오행/음양 근거로 2문장)",
  "tip": "이름 선택 시 참고 사항 1문장"
}
점수 순으로 정렬.
★ 채점: 삼원오행 상생 + 길수 + 음양조화 + 좋은 뜻이면 90~98점. 보통 이름은 65~80점. 계산 결과가 좋으면 높은 점수가 정상. 일부러 깎지 마세요.
JSON만 출력.`

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
