import { NextResponse } from 'next/server'
import { getCachedResponse, setCachedResponse } from '@/lib/ai/cache'
import { getAuthUserSoft } from '@/lib/security/auth'
import { checkRateLimit, getClientIP, AI_RATE_LIMIT } from '@/lib/security/rate-limit'
import { sanitizeForPrompt } from '@/lib/security/sanitize'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

async function callGemini(prompt: string, maxTokens = 300, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? '' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
        }),
      })
      if (res.status === 429 && attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      if (!res.ok) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue }
        return null
      }
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts || []
      const raw = parts.map((p: any) => p.text || '').join('').trim()
      return raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim() || null
    } catch {
      if (attempt < retries) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue }
      return null
    }
  }
  return null
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
  const { limited } = checkRateLimit(`ai-card:${user?.id || ip}`, AI_RATE_LIMIT)
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 })

  const body = await request.json()
  const { cardType } = body

  try {
    // === 감정 케어 카드 (고도화) ===
    if (cardType === 'emotion') {
      const { ageMonths, childName, feedCount, sleepCount, poopCount, feedTotal, sleepTotal, mood, hour, sleepActive } = body

      const cacheKey = `emotion-${ageMonths}-${feedCount}-${sleepCount}-${mood || 'none'}-${hour}`
      const cached = getCachedResponse(cacheKey)
      if (cached) return NextResponse.json(cached)

      const timeContext = hour < 6 ? '새벽' : hour < 12 ? '오전' : hour < 18 ? '오후' : '저녁'

      const prompt = `당신은 "도담" 앱의 AI 감정 케어 파트너입니다.
부모의 마음을 읽고 공감하면서, 데이터 기반으로 구체적 위로와 실용적 팁을 드리세요.
"도담하게"를 자연스럽게 사용하세요.

[상황]
- 아이: ${childName || '아이'} (${ageMonths || 0}개월)
- 시간대: ${timeContext} ${hour || 0}시
- 오늘 수유: ${feedCount || 0}회${feedTotal ? ` (${feedTotal}ml)` : ''}
- 오늘 수면: ${sleepCount || 0}회${sleepTotal ? ` (${sleepTotal}분)` : ''}${sleepActive ? ' ← 지금 자는 중' : ''}
- 배변: ${poopCount || 0}회
- 부모 기분: ${mood || '미기록'}

[규칙]
1. "잘하고 있어요" 같은 뻔한 말 금지. 구체적 데이터를 언급하며 공감.
2. 부모 기분이 있으면 그 감정에 먼저 공감. 피곤하면 피곤함 인정, 행복하면 함께 기뻐하기.
3. 시간대에 맞는 맥락 (새벽이면 수고했다는 따뜻함, 오후면 남은 하루 응원).
4. 수면 중이면 "지금 아이가 자는 동안 잠깐 쉬세요" 같은 실용 팁.
5. 마지막에 하나의 구체적 제안 (5분 스트레칭, 따뜻한 차 한 잔 등).

JSON 출력:
{
  "emoji": "상황에 맞는 이모지 1개",
  "title": "핵심 한 줄 (15자 이내, 예: '새벽 수유 수고했어요')",
  "body": "공감 + 데이터 인사이트 + 팁 (2-3문장, 총 80자 이내)",
  "colorTag": "warm/calm/energy/cozy 중 하나"
}
JSON만 출력.`

      const text = await callGemini(prompt, 300)
      if (!text) return NextResponse.json({ text: '오늘도 도담하게 잘하고 있어요.' })

      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ text: text.slice(0, 200) })
        const parsed = JSON.parse(match[0])
        setCachedResponse(cacheKey, parsed)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({ text: text.slice(0, 200) })
      }
    }

    // === 부모 심리 프로필 ===
    if (cardType === 'parent-profile') {
      const { moodHistory, recordPatterns, childAge, epdsHistory } = body

      const cacheKey = `parent-profile-${JSON.stringify(moodHistory || []).slice(0, 50)}`
      const cached = getCachedResponse(cacheKey)
      if (cached) return NextResponse.json(cached)

      const prompt = `당신은 육아 심리 전문 AI입니다. 부모의 기록 패턴과 감정 이력을 분석하여 양육 스타일을 도출하세요.
의료 진단은 절대 하지 마세요. 따뜻하고 긍정적인 톤으로.

[데이터]
- 아이 월령: ${childAge || 0}개월
- 최근 감정 이력 (최대 4주): ${JSON.stringify(moodHistory || [])}
- 기록 패턴: ${JSON.stringify(recordPatterns || {})}
- EPDS 이력: ${JSON.stringify(epdsHistory || [])}

[양육 스타일 유형]
1. 세심 관찰형: 꼼꼼한 기록, 작은 변화도 포착
2. 편안한 자연형: 큰 흐름 위주, 여유로운 양육
3. 학습 탐구형: 정보 검색 활발, 전문적 접근
4. 감성 교감형: 감정 교류 중시, 스킨십 많음
5. 효율 관리형: 체계적 스케줄, 루틴 중시

JSON 출력:
{
  "primaryStyle": "주 양육 스타일 (위 5가지 중 1개)",
  "primaryPct": 85,
  "secondaryStyle": "부 양육 스타일",
  "secondaryPct": 60,
  "strengths": ["강점 1 (15자 이내)", "강점 2"],
  "weeklyTip": "이번 주 팁 (30자 이내)",
  "emotionTrend": "상승/안정/주의 중 하나",
  "burnoutRisk": "low/medium/high",
  "burnoutMessage": "번아웃 관련 한 줄 (없으면 빈 문자열)",
  "encouragement": "격려 한 줄 (25자 이내)"
}
JSON만 출력.`

      const text = await callGemini(prompt, 500)
      if (!text) return NextResponse.json({ error: 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        const parsed = JSON.parse(match[0])
        setCachedResponse(cacheKey, parsed)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    // === 성장 스토리 ===
    if (cardType === 'growth-story') {
      const { childName, ageMonths, milestones, feedTrend, sleepTrend, growthRecords, specialMoments } = body

      const prompt = `당신은 "도담" 앱의 AI 성장 스토리 작가입니다.
아이의 기록 데이터를 바탕으로 따뜻하고 감성적인 성장 이야기를 작성하세요.
부모가 읽고 감동받을 수 있도록, 구체적 데이터를 자연스럽게 녹여서.

[아이 정보]
- 이름: ${childName || '우리 아이'}
- 현재 월령: ${ageMonths}개월
- 달성한 마일스톤: ${JSON.stringify(milestones || [])}
- 수유 트렌드: ${feedTrend || '정보 없음'}
- 수면 트렌드: ${sleepTrend || '정보 없음'}
- 성장 기록: ${JSON.stringify(growthRecords || [])}
- 특별한 순간: ${JSON.stringify(specialMoments || [])}

[규칙]
1. 3인칭 서술. "${childName || '아이'}는(은)..." 형식
2. 구체적 숫자를 자연스럽게 포함 (예: "3개월 만에 수유 간격이 2시간에서 3시간으로")
3. 마일스톤을 이야기 흐름에 녹이기
4. 마지막은 미래에 대한 기대감으로 마무리
5. 이모지 적절히 사용 (3~5개)

JSON 출력:
{
  "title": "성장 스토리 제목 (예: '도담이의 첫 100일 이야기')",
  "story": "성장 이야기 전문 (200~350자, 4~6문장)",
  "highlights": ["하이라이트 1", "하이라이트 2", "하이라이트 3"],
  "nextMilestone": "다음에 기대되는 성장 포인트 (1문장)"
}
JSON만 출력.`

      const text = await callGemini(prompt, 800)
      if (!text) return NextResponse.json({ error: 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(match[0]))
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    // === 형제자매 비교 인사이트 ===
    if (cardType === 'sibling-compare') {
      const { children } = body // [{ name, ageMonths, milestones, feedPattern, sleepPattern }]

      const prompt = `당신은 "도담" 앱의 AI 다자녀 육아 파트너입니다.
형제자매의 같은 월령 시기 데이터를 비교하여 따뜻한 인사이트를 드리세요.
비교하되 절대 우열을 가리지 마세요. 각 아이의 고유한 성장을 존중하세요.

[형제자매 데이터]
${JSON.stringify(children || [])}

[규칙]
1. "OO이(가) 더 빠르다/느리다" 같은 비교 금지
2. 각 아이의 고유한 특성을 긍정적으로 묘사
3. 같은 월령 기준 흥미로운 차이점을 사실적으로 제시
4. 첫째 경험이 둘째 양육에 도움되는 구체적 팁 제공
5. 의료 판단 절대 금지

JSON 출력:
{
  "insight": "형제자매 비교 인사이트 (3~4문장, 100자 이내)",
  "olderAtSameAge": "첫째가 이 월령이었을 때 특징 (1문장)",
  "uniqueTraits": ["아이1 고유 특성", "아이2 고유 특성"],
  "parentTip": "다자녀 양육 팁 (1문장, 30자 이내)",
  "funFact": "재미있는 공통점 또는 차이점 (1문장)"
}
JSON만 출력.`

      const text = await callGemini(prompt, 500)
      if (!text) return NextResponse.json({ error: 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(match[0]))
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    // === 동네 육아 AI 가이드 ===
    if (cardType === 'local-guide') {
      const { areaName, month } = body

      const season = month >= 3 && month <= 5 ? '봄' : month >= 6 && month <= 8 ? '여름' : month >= 9 && month <= 11 ? '가을' : '겨울'

      const prompt = `당신은 "도담" 앱의 동네 육아 가이드 AI입니다.
사용자의 현재 위치 지역에 맞는 실용적인 육아 정보를 제공하세요.

[정보]
- 지역: ${areaName}
- 현재 계절: ${season} (${month}월)

[규칙]
1. 해당 지역/계절에 맞는 구체적 조언
2. 날씨, 미세먼지, 계절별 건강 관리 포함
3. 동네에서 활용 가능한 실용 팁 위주
4. 의료 진단 절대 금지

JSON 출력:
{
  "areaName": "${areaName}",
  "summary": "이 동네 육아 한 줄 요약 (20자 이내)",
  "tips": [
    {"category": "health", "emoji": "🏥", "title": "건강 팁 제목", "description": "설명 1~2문장"},
    {"category": "play", "emoji": "🎪", "title": "놀이 팁 제목", "description": "설명 1~2문장"},
    {"category": "safety", "emoji": "🛡️", "title": "안전 팁 제목", "description": "설명 1~2문장"},
    {"category": "life", "emoji": "🏠", "title": "생활 팁 제목", "description": "설명 1~2문장"}
  ],
  "nearbyHighlight": "이 동네에서 꼭 활용할 것 1가지 (1문장)",
  "seasonalTip": "${season}철 육아 팁 (1~2문장)"
}
JSON만 출력.`

      const text = await callGemini(prompt, 600)
      if (!text) return NextResponse.json({ error: 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(match[0]))
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    // === 상황별 트러블슈팅 ===
    if (cardType === 'troubleshoot') {
      const { situation, ageMonths: age, details } = body

      const prompt = `당신은 "도담" 앱의 AI 육아 트러블슈팅 전문가입니다.
부모가 겪고 있는 상황에 대해 체계적인 체크리스트와 단계별 대응 가이드를 제공하세요.
의료 진단은 절대 하지 마세요. 심각한 상황이면 소아과/119를 안내하세요.

[상황]
- 문제: ${sanitizeForPrompt(situation, 500)}
- 아이 월령: ${age || '미상'}개월
- 상세 정보: ${sanitizeForPrompt(details, 500) || '없음'}

[규칙]
1. 체크리스트는 부모가 즉시 확인할 수 있는 항목
2. 대응 가이드는 쉬운 것 → 어려운 것 순서
3. 응급 상황 판별 기준 명확히
4. 따뜻하되 구체적으로

JSON 출력:
{
  "title": "상황 제목 (예: '아이가 30분 이상 울어요')",
  "urgency": "low/medium/high 중 하나",
  "checklist": [
    {"item": "확인할 것", "detail": "구체적 확인 방법"}
  ],
  "steps": [
    {"step": 1, "action": "행동 제목", "detail": "구체적 방법 1~2문장"}
  ],
  "emergencySign": "이런 증상이 함께 있으면 즉시 병원: (1문장)",
  "reassurance": "부모 안심 메시지 (1문장)",
  "relatedTip": "관련 추가 팁 (1문장)"
}
JSON만 출력.`

      const text = await callGemini(prompt, 800)
      if (!text) return NextResponse.json({ error: 'AI failed' }, { status: 500 })
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: 'parse error' }, { status: 500 })
        return NextResponse.json(JSON.parse(match[0]))
      } catch {
        return NextResponse.json({ error: 'parse error' }, { status: 500 })
      }
    }

    // === 레거시 호환 (기존 단순 감정 카드) ===
    const { ageMonths, context } = body
    const prompt = `당신은 "도담"이라는 육아 앱의 AI 케어 파트너입니다.
따뜻하고 부드러운 톤으로, 부모를 안심시키면서 구체적 행동을 제안하세요.
"도담하게"라는 표현을 자연스럽게 사용하세요.
의료 조언은 절대 하지 마세요.

아기 개월수: ${ageMonths}개월
카드 유형: ${cardType}
컨텍스트: ${context}

2~3문장으로 짧고 따뜻하게 작성해주세요. JSON이 아닌 순수 텍스트로만 응답하세요.`

    const text = await callGemini(prompt, 200)
    return NextResponse.json({ text: text?.trim() || '오늘도 도담하게 잘하고 있어요.' })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
