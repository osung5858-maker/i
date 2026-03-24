'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

interface Props {
  ageMonths: number
}

interface Milestone {
  id: string
  label: string
  category: 'gross_motor' | 'fine_motor' | 'language' | 'social' | 'cognitive'
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  gross_motor: { label: '대근육', emoji: '🏃' },
  fine_motor: { label: '소근육', emoji: '✋' },
  language: { label: '언어', emoji: '🗣️' },
  social: { label: '사회성', emoji: '💕' },
  cognitive: { label: '인지', emoji: '🧠' },
}

const MILESTONES_BY_MONTH: Record<number, Milestone[]> = {
  1: [
    { id: 'm1-1', label: '엎드리면 머리를 잠깐 들어요', category: 'gross_motor' },
    { id: 'm1-2', label: '손을 꽉 쥐어요', category: 'fine_motor' },
    { id: 'm1-3', label: '큰 소리에 반응해요', category: 'language' },
    { id: 'm1-4', label: '얼굴을 가까이 하면 쳐다봐요', category: 'social' },
    { id: 'm1-5', label: '움직이는 물체를 눈으로 따라가요', category: 'cognitive' },
  ],
  2: [
    { id: 'm2-1', label: '엎드리면 머리를 45도 들어요', category: 'gross_motor' },
    { id: 'm2-2', label: '손을 펴기 시작해요', category: 'fine_motor' },
    { id: 'm2-3', label: '"아~", "우~" 소리를 내요', category: 'language' },
    { id: 'm2-4', label: '사회적 미소를 지어요', category: 'social' },
    { id: 'm2-5', label: '소리 나는 쪽으로 고개를 돌려요', category: 'cognitive' },
  ],
  3: [
    { id: 'm3-1', label: '엎드리면 머리를 90도 들어요', category: 'gross_motor' },
    { id: 'm3-2', label: '장난감을 손에 쥐어요', category: 'fine_motor' },
    { id: 'm3-3', label: '옹알이를 해요', category: 'language' },
    { id: 'm3-4', label: '소리 내어 웃어요', category: 'social' },
    { id: 'm3-5', label: '자기 손을 바라봐요', category: 'cognitive' },
  ],
  4: [
    { id: 'm4-1', label: '뒤집기를 시도해요', category: 'gross_motor' },
    { id: 'm4-2', label: '양손을 모아요', category: 'fine_motor' },
    { id: 'm4-3', label: '다양한 소리를 내요', category: 'language' },
    { id: 'm4-4', label: '거울 속 자기를 보고 웃어요', category: 'social' },
    { id: 'm4-5', label: '물건이 떨어지면 찾아봐요', category: 'cognitive' },
  ],
  5: [
    { id: 'm5-1', label: '뒤집기를 할 수 있어요', category: 'gross_motor' },
    { id: 'm5-2', label: '물건을 한 손에서 다른 손으로 옮겨요', category: 'fine_motor' },
    { id: 'm5-3', label: '이름을 부르면 반응해요', category: 'language' },
    { id: 'm5-4', label: '낯선 사람을 구별해요', category: 'social' },
    { id: 'm5-5', label: '부분적으로 숨긴 물건을 찾아요', category: 'cognitive' },
  ],
  6: [
    { id: 'm6-1', label: '도움 없이 앉을 수 있어요', category: 'gross_motor' },
    { id: 'm6-2', label: '물건을 집어서 입에 가져가요', category: 'fine_motor' },
    { id: 'm6-3', label: '"마마", "바바" 소리를 내요', category: 'language' },
    { id: 'm6-4', label: '까꿍 놀이에 반응해요', category: 'social' },
    { id: 'm6-5', label: '원인과 결과를 이해하기 시작해요', category: 'cognitive' },
  ],
  7: [
    { id: 'm7-1', label: '배밀이를 해요', category: 'gross_motor' },
    { id: 'm7-2', label: '엄지와 검지로 집기를 시도해요', category: 'fine_motor' },
    { id: 'm7-3', label: '간단한 단어의 의미를 이해해요', category: 'language' },
    { id: 'm7-4', label: '낯가림이 나타나요', category: 'social' },
    { id: 'm7-5', label: '숨긴 물건을 찾을 수 있어요', category: 'cognitive' },
  ],
  8: [
    { id: 'm8-1', label: '기어다니기 시작해요', category: 'gross_motor' },
    { id: 'm8-2', label: '손가락으로 음식을 집어요', category: 'fine_motor' },
    { id: 'm8-3', label: '"안돼"를 이해해요', category: 'language' },
    { id: 'm8-4', label: '분리 불안이 나타나요', category: 'social' },
    { id: 'm8-5', label: '상자 안에 물건을 넣고 빼요', category: 'cognitive' },
  ],
  9: [
    { id: 'm9-1', label: '잡고 일어서요', category: 'gross_motor' },
    { id: 'm9-2', label: '집게 손가락으로 작은 물건을 집어요', category: 'fine_motor' },
    { id: 'm9-3', label: '손가락으로 가리켜요', category: 'language' },
    { id: 'm9-4', label: '박수를 따라 쳐요', category: 'social' },
    { id: 'm9-5', label: '물건의 용도를 알아가요', category: 'cognitive' },
  ],
  10: [
    { id: 'm10-1', label: '가구를 잡고 걸어요', category: 'gross_motor' },
    { id: 'm10-2', label: '컵으로 마시기를 시도해요', category: 'fine_motor' },
    { id: 'm10-3', label: '"엄마", "아빠"를 의미 있게 말해요', category: 'language' },
    { id: 'm10-4', label: '간단한 지시를 따라요', category: 'social' },
    { id: 'm10-5', label: '물건을 비교할 수 있어요', category: 'cognitive' },
  ],
  11: [
    { id: 'm11-1', label: '혼자 잠깐 서 있어요', category: 'gross_motor' },
    { id: 'm11-2', label: '숟가락을 잡으려고 해요', category: 'fine_motor' },
    { id: 'm11-3', label: '2~3개 단어를 말해요', category: 'language' },
    { id: 'm11-4', label: '다른 아이에게 관심을 보여요', category: 'social' },
    { id: 'm11-5', label: '간단한 문제를 해결해요', category: 'cognitive' },
  ],
  12: [
    { id: 'm12-1', label: '첫 걸음을 떼요', category: 'gross_motor' },
    { id: 'm12-2', label: '크레용으로 끼적여요', category: 'fine_motor' },
    { id: 'm12-3', label: '3~5개 단어를 사용해요', category: 'language' },
    { id: 'm12-4', label: '간단한 역할놀이를 해요', category: 'social' },
    { id: 'm12-5', label: '동물 소리를 흉내내요', category: 'cognitive' },
  ],
}

const PLAY_ACTIVITIES: Record<number, string[]> = {
  1: ['흑백 모빌 보여주기', '부드러운 음악 들려주기', '스킨십 마사지'],
  2: ['컬러 모빌로 교체', '딸랑이 흔들어주기', '다양한 표정 지어주기'],
  3: ['터미타임 놀이', '손에 장난감 쥐어주기', '거울 놀이'],
  4: ['뒤집기 도와주기', '소리나는 장난감 탐색', '까꿍 놀이'],
  5: ['앉기 연습 도와주기', '다양한 질감 탐색', '이름 불러주기 놀이'],
  6: ['앉아서 놀이하기', '컵 놀이', '손가락 인형극'],
  7: ['배밀이 격려하기', '쌓기 놀이', '그림책 읽어주기'],
  8: ['터널 기어가기', '핑거푸드 탐색', '음악에 맞춰 움직이기'],
  9: ['잡고 일어서기 놀이', '컵 속 물건 찾기', '박수 놀이'],
  10: ['가구 잡고 걷기 격려', '블록 쌓기', '간단한 지시 놀이'],
  11: ['균형 잡기 놀이', '숟가락 놀이', '동물 소리 놀이'],
  12: ['걷기 놀이', '크레용 끼적이기', '역할놀이 시작'],
}

function getStorageKey(ageMonths: number): string {
  return `dodam_dev_check_${ageMonths}`
}

function getMilestones(ageMonths: number): Milestone[] {
  const clamped = Math.max(1, Math.min(12, ageMonths))
  return MILESTONES_BY_MONTH[clamped] || MILESTONES_BY_MONTH[1]
}

function getActivities(ageMonths: number): string[] {
  const clamped = Math.max(1, Math.min(12, ageMonths))
  return PLAY_ACTIVITIES[clamped] || PLAY_ACTIVITIES[1]
}

function generateAIInsight(milestones: Milestone[], checked: Set<string>, ageMonths: number): string {
  const total = milestones.length
  const done = milestones.filter((m) => checked.has(m.id)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  if (pct === 100) {
    return `${ageMonths}개월 발달 항목을 모두 달성했어요! 아이가 정말 잘 성장하고 있어요. 다음 달 체크리스트도 기대해주세요.`
  }

  const uncheckedCategories = new Set(
    milestones.filter((m) => !checked.has(m.id)).map((m) => m.category)
  )

  const tips: string[] = []
  if (uncheckedCategories.has('gross_motor')) tips.push('신체 놀이 시간을 조금 더 늘려보세요')
  if (uncheckedCategories.has('fine_motor')) tips.push('손으로 탐색할 수 있는 장난감을 제공해보세요')
  if (uncheckedCategories.has('language')) tips.push('아이에게 자주 말을 걸어주세요')
  if (uncheckedCategories.has('social')) tips.push('다양한 표정과 반응으로 소통해보세요')
  if (uncheckedCategories.has('cognitive')) tips.push('새로운 자극을 경험할 수 있는 놀이를 해보세요')

  if (pct >= 60) {
    return `${ageMonths}개월 발달 항목의 ${pct}%를 달성했어요! 순조롭게 성장하고 있어요. ${tips[0] || ''}`
  }

  return `아이마다 발달 속도가 달라요. 천천히 하나씩 경험해가면 돼요. ${tips.slice(0, 2).join('. ')}`
}

function generateCheckupQuestions(milestones: Milestone[], checked: Set<string>, ageMonths: number): string[] {
  const unchecked = milestones.filter((m) => !checked.has(m.id))
  const questions: string[] = []

  questions.push(`${ageMonths}개월 아이의 전반적인 발달 상태가 궁금해요.`)

  unchecked.forEach((m) => {
    const cat = CATEGORY_LABELS[m.category]
    questions.push(`${cat.label} 영역: "${m.label}" 부분을 어떻게 도와줄 수 있을까요?`)
  })

  if (unchecked.length === 0) {
    questions.push('다음 달에 기대할 수 있는 발달 변화가 있을까요?')
  }

  return questions.slice(0, 3)
}

export default function DevelopmentCheck({ ageMonths }: Props) {
  const milestones = useMemo(() => getMilestones(ageMonths), [ageMonths])
  const activities = useMemo(() => getActivities(ageMonths), [ageMonths])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [showQuestions, setShowQuestions] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(ageMonths))
      if (stored) setChecked(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [ageMonths])

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(getStorageKey(ageMonths), JSON.stringify([...next]))
      } catch { /* ignore */ }
      return next
    })
  }, [ageMonths])

  const total = milestones.length
  const done = milestones.filter((m) => checked.has(m.id)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const insight = useMemo(() => generateAIInsight(milestones, checked, ageMonths), [milestones, checked, ageMonths])
  const checkupQuestions = useMemo(() => generateCheckupQuestions(milestones, checked, ageMonths), [milestones, checked, ageMonths])

  // Progress ring
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, Milestone[]> = {}
    milestones.forEach((m) => {
      if (!map[m.category]) map[m.category] = []
      map[m.category].push(m)
    })
    return map
  }, [milestones])

  return (
    <div className="space-y-4 px-5 pb-8 pt-4">
      {/* Progress Ring */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#E8E6E1" strokeWidth="8" />
            <circle
              cx="48" cy="48" r={radius} fill="none"
              stroke="#3D8A5A" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 48 48)"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-[#212124]">{pct}%</span>
          </div>
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-[#212124]">{ageMonths}개월 발달 체크</h3>
          <p className="text-[12px] text-[#6B6966] mt-1">{done}/{total} 항목 달성</p>
          <p className="text-[11px] text-[#9E9A95] mt-0.5">아이마다 속도가 달라요</p>
        </div>
      </div>

      {/* Milestones by category */}
      {Object.entries(grouped).map(([cat, items]) => {
        const info = CATEGORY_LABELS[cat]
        return (
          <div key={cat} className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-sm">{info.emoji}</span>
              <h4 className="text-[13px] font-bold text-[#212124]">{info.label}</h4>
            </div>
            <div className="space-y-2">
              {items.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 py-1.5 cursor-pointer active:opacity-70"
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked.has(m.id)
                        ? 'bg-[#3D8A5A] border-[#3D8A5A]'
                        : 'border-[#D1D5DB] bg-white'
                    }`}
                    onClick={() => toggle(m.id)}
                  >
                    {checked.has(m.id) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[13px] leading-snug ${
                      checked.has(m.id)
                        ? 'text-[#9E9A95] line-through'
                        : 'text-[#212124]'
                    }`}
                    onClick={() => toggle(m.id)}
                  >
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}

      {/* AI Insight */}
      <div className="bg-white rounded-2xl border-l-4 border-l-[#3D8A5A] border border-[#E8E4DF] p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">🤖</span>
          <h3 className="text-[13px] font-bold text-[#3D8A5A]">AI 발달 인사이트</h3>
        </div>
        <p className="text-[13px] text-[#212124] leading-relaxed">{insight}</p>
        <p className="text-[10px] text-[#9E9A95] mt-3">아이마다 발달 시기가 달라요. 참고용이며, 걱정되시면 소아과 상담을 추천드려요.</p>
      </div>

      {/* Recommended Activities */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm">🎮</span>
          <h3 className="text-[13px] font-bold text-[#212124]">추천 놀이</h3>
        </div>
        <div className="space-y-2">
          {activities.map((act, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#FEF0E8] flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#FF6F0F]">{i + 1}</span>
              </div>
              <span className="text-[13px] text-[#212124]">{act}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Checkup Questions */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
        <button
          onClick={() => setShowQuestions((v) => !v)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🏥</span>
            <h3 className="text-[13px] font-bold text-[#212124]">검진 시 질문 추천</h3>
          </div>
          <span className="text-[12px] text-[#9E9A95]">{showQuestions ? '접기' : '펼치기'}</span>
        </button>
        {showQuestions && (
          <div className="mt-3 space-y-2">
            {checkupQuestions.map((q, i) => (
              <p key={i} className="text-[13px] text-[#5A5854] leading-relaxed pl-2 border-l-2 border-[#E8E6E1]">
                {q}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
