'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SparkleIcon, MapPinIcon } from '@/components/ui/Icons'
import { shareMealPlan } from '@/lib/kakao/share-parenting'

interface Props {
  mode: string
  value: number
  phase?: string
}

interface MealItem { menu: string; sides?: string[]; calories?: number; ingredients?: string; reason?: string }
interface MealData {
  dishTitle?: string
  cuisine?: string
  breakfast?: MealItem; lunch?: MealItem; dinner?: MealItem; snack?: MealItem
  newFood?: string; keyNutrient?: string; avoid?: string; tip?: string
}

const MEAL_COLOR: Record<string, string> = { '아침': '#F5A96A', '점심': '#6AB0E8', '저녁': '#8B7EC8', '간식': '#7DC49A' }

function getLabel(mode: string, value: number, phase?: string) {
  if (mode === 'parenting') return value < 6 ? '초기 이유식' : value < 8 ? '중기 이유식' : value < 10 ? '후기 이유식' : '완료기 식단'
  if (mode === 'pregnant') return (value <= 13 ? '초기' : value <= 27 ? '중기' : '후기') + ' 임산부'
  const ko: Record<string, string> = { follicular: '난포기', fertile: '가임기', ovulation: '배란기', luteal: '황체기', tww: '착상대기', menstrual: '생리기' }
  return (ko[phase || ''] || '맞춤') + ' 식단'
}

function getApiConfig(mode: string, value: number, phase?: string, tab?: string) {
  if (mode === 'parenting') {
    if (tab === 'caregiver') return { url: '/api/ai-parenting', body: { type: 'caregiver_meal', ageMonths: value } }
    return { url: '/api/ai-parenting', body: { type: 'meal', ageMonths: value } }
  }
  if (mode === 'pregnant') return { url: '/api/ai-pregnant', body: { type: 'meal', week: value } }
  return { url: '/api/ai-preparing', body: { type: 'meal', phase: phase || 'follicular' } }
}

function getCacheKey(mode: string, value: number, phase?: string, tab?: string) {
  const d = new Date().toISOString().split('T')[0]
  if (mode === 'parenting') return tab === 'caregiver' ? `dodam_caregiver_meal_v1_${d}` : `dodam_meal_v2_${value}_${d}`
  if (mode === 'pregnant') return `dodam_preg_meal_v3_${value}_${d}`
  return `dodam_prep_meal_v3_${phase}_${d}`
}

const CUISINE_MAP: [RegExp, string, string][] = [
  [/중화|짜장|짬뽕|마파|탕수|팔보채|고추잡채|중식|깐풍|라조|유산슬/, '중식', '#FFF0E0'],
  [/파스타|리조또|피자|스테이크|라자냐|뇨끼|크림|알프레도|오믈렛|양식|오일파스타|그라탱/, '양식', '#F0F0FF'],
  [/스시|초밥|우동|라멘|소바|돈카츠|돈까스|오야코|규동|일식|미소|데리야키|텐동|가라아게/, '일식', '#F5F0FF'],
  [/쌀국수|반미|팟타이|그린커리|똠얌|동남아|태국|베트남/, '동남아', '#F0FFF4'],
  [/떡볶이|순대|어묵|튀김|분식|라볶이|김밥/, '분식', '#FFF5F0'],
  [/토스트|샌드위치|베이글|크루아상|빵|베이커리/, '베이커리', '#FDFAF0'],
  [/죽|미음|호박죽|전복죽|쇠고기죽|흰죽/, '죽', '#F0FFF9'],
  [/샐러드|그릭|시저|퀴노아/, '샐러드', '#F0FFF4'],
  [/카레/, '카레', '#FFFAF0'],
]

function detectCuisine(menuText: string): { label: string; bg: string } | null {
  const t = menuText
  for (const [pattern, label, bg] of CUISINE_MAP) {
    if (pattern.test(t)) return { label, bg }
  }
  if (/국|탕|찌개|구이|볶음|나물|비빔|갈비|삼겹|된장|간장|쌈|밥|김치|제육|불고기|잡채|해장|순두부|곰탕|설렁탕|도가니|추어|육개장|해물|낙지|오징어|조개|조림|찜/.test(t)) return { label: '한식', bg: '#FFF0F5' }
  return null
}

function getRestaurantQuery(menuText: string, mode: string): string {
  const l = menuText.toLowerCase()
  const map: [RegExp, string][] = [
    [/죽|미음/, '죽집'], [/국수|칼국수/, '국수'], [/비빔밥|돌솥/, '비빔밥'],
    [/찌개|된장|김치찌개|순두부/, '찌개'], [/불고기|갈비|소고기/, '한식 고기'],
    [/생선|고등어|연어|삼치|구이/, '생선구이'], [/카레/, '카레'], [/파스타|리조또/, '파스타'],
    [/샐러드/, '샐러드'], [/우동|라멘/, '일식'], [/떡볶이/, '분식'],
    [/닭|삼계탕/, '닭요리'], [/돈까스/, '돈까스'], [/빵|토스트|샌드위치/, '베이커리'],
    [/두부/, '두부 요리'], [/나물|반찬|한식|밥/, '한식'],
  ]
  for (const [p, k] of map) { if (p.test(l)) return k }
  return mode === 'parenting' ? '아이 동반 식당' : mode === 'pregnant' ? '임산부 맛집' : '건강식'
}

function MealRows({ meal, mode }: { meal: MealData; mode: string }) {
  const meals = [
    { key: '아침', data: meal.breakfast },
    { key: '점심', data: meal.lunch },
    ...(meal.dinner ? [{ key: '저녁', data: meal.dinner }] : []),
    { key: '간식', data: meal.snack },
  ].filter(m => m.data)

  return (
    <>
      {meals.map((m, i) => {
        const cuisine = detectCuisine(m.data!.menu)
        const sides = m.data!.sides || []
        return (
          <div key={m.key} className={`flex items-start gap-3 py-3 ${i < meals.length - 1 ? 'border-b border-[#F0EDE8]' : ''}`}>
            {/* 끼니 레이블 */}
            <div className="w-8 shrink-0 flex flex-col items-center gap-1 pt-0.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MEAL_COLOR[m.key] }} />
              <span className="text-[10px] font-medium text-[#9E9A95]">{m.key}</span>
            </div>
            {/* 내용 */}
            <div className="flex-1 min-w-0">
              {/* 태그 줄 */}
              <div className="flex items-center gap-1 mb-1">
                {cuisine && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-[#6B6966]" style={{ backgroundColor: cuisine.bg }}>
                    {cuisine.label}
                  </span>
                )}
                {m.data!.calories && (
                  <span className="text-[10px] text-[#9E9A95]">{m.data!.calories}kcal</span>
                )}
              </div>
              {/* 메뉴 전체 */}
              <p className="text-[12px] text-[#1A1918] leading-snug">
                {[m.data!.menu, ...sides].join(' · ')}
              </p>
            </div>
            {/* 지도 */}
            <Link href={`/map?q=${encodeURIComponent(getRestaurantQuery(m.data!.menu, mode))}`} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#F0F4FF] active:bg-[#D5DFEF] mt-0.5">
              <MapPinIcon className="w-3.5 h-3.5 text-[#4A6FA5]" />
            </Link>
          </div>
        )
      })}
      {(meal.keyNutrient || meal.avoid) && (
        <div className="flex gap-2 pt-2 flex-wrap">
          {meal.keyNutrient && <span className="text-[10px] text-[#2D7A4A] bg-[#F0F9F4] px-2 py-1 rounded-full">{meal.keyNutrient}</span>}
          {meal.avoid && <span className="text-[10px] text-[#D08068] bg-[#FDF2F2] px-2 py-1 rounded-full">⚠ {meal.avoid}</span>}
        </div>
      )}
    </>
  )
}

export default function AIMealCard({ mode, value, phase }: Props) {
  const isParenting = mode === 'parenting'

  // 아이 식단
  const [childMeal, setChildMeal] = useState<MealData | null>(null)
  const [childLoading, setChildLoading] = useState(false)

  // 양육자 식단 (parenting 전용)
  const [caregiverMeal, setCaregiverMeal] = useState<MealData | null>(null)
  const [caregiverLoading, setCaregiverLoading] = useState(false)

  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'child' | 'caregiver'>('child')

  const label = getLabel(mode, value, phase)

  useEffect(() => {
    try {
      const c = localStorage.getItem(getCacheKey(mode, value, phase))
      if (c) { const d = JSON.parse(c); if (d.breakfast) setChildMeal(d) }
    } catch { /* */ }
    if (isParenting) {
      try {
        const c = localStorage.getItem(getCacheKey(mode, value, phase, 'caregiver'))
        if (c) { const d = JSON.parse(c); if (d.breakfast) setCaregiverMeal(d) }
      } catch { /* */ }
    }
  }, [mode, value, phase, isParenting])

  const fetchChildMeal = async () => {
    setChildLoading(true)
    const { url, body } = getApiConfig(mode, value, phase)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.breakfast) {
        setChildMeal(data); setExpanded(true)
        try { localStorage.setItem(getCacheKey(mode, value, phase), JSON.stringify(data)) } catch { /* */ }
      }
    } catch { /* */ }
    setChildLoading(false)
  }

  const fetchCaregiverMeal = async () => {
    setCaregiverLoading(true)
    const { url, body } = getApiConfig(mode, value, phase, 'caregiver')
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.breakfast) {
        setCaregiverMeal(data)
        try { localStorage.setItem(getCacheKey(mode, value, phase, 'caregiver'), JSON.stringify(data)) } catch { /* */ }
      }
    } catch { /* */ }
    setCaregiverLoading(false)
  }

  const activeMeal = isParenting ? (activeTab === 'child' ? childMeal : caregiverMeal) : childMeal
  const activeLoading = isParenting ? (activeTab === 'child' ? childLoading : caregiverLoading) : childLoading
  const fetchActive = isParenting ? (activeTab === 'child' ? fetchChildMeal : fetchCaregiverMeal) : fetchChildMeal

  // 미요청 상태 (아이 식단 기준)
  if (!childMeal && !childLoading) {
    return (
      <button onClick={fetchChildMeal} className="w-full bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] rounded-2xl border border-[#E8E4DF] p-4 text-left active:opacity-90">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
            <SparkleIcon className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-[#1A1918]">AI 오늘의 식단</p>
            <p className="text-[12px] text-[#9E9A95] mt-0.5">{isParenting ? '아이 + 양육자' : label} · 맞춤 추천받기</p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold">추천</div>
        </div>
      </button>
    )
  }

  if (childLoading && !childMeal) {
    return (
      <div className="bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] rounded-2xl border border-[#E8E4DF] p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <div>
            <p className="text-[13px] font-semibold text-[#1A1918]">AI가 식단을 구성하고 있어요</p>
            <p className="text-[11px] text-[#9E9A95]">{label} 맞춤 분석 중...</p>
          </div>
        </div>
      </div>
    )
  }

  const mealForHeader = activeMeal || childMeal

  return (
    <div className="rounded-2xl border border-[#E8E4DF] overflow-hidden bg-white">
      {/* 헤더 */}
      <button onClick={() => setExpanded(v => !v)} className="w-full bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] p-3.5 flex items-center gap-3 text-left active:opacity-90">
        <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
          <SparkleIcon className="w-4 h-4 text-[var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[13px] font-bold text-[#1A1918]">AI 식단 제안</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold">AI</span>
          </div>
          <p className="text-[12px] text-[#6B6966] mt-0.5">
            {isParenting ? '아이 · 양육자 맞춤 구성' : `${[childMeal?.breakfast, childMeal?.lunch, childMeal?.dinner, childMeal?.snack].filter(Boolean).length}끼 맞춤 구성`} · 탭해서 확인
          </p>
        </div>
        <span className="text-[11px] text-[#9E9A95] shrink-0">{expanded ? '접기' : '펼치기'}</span>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2 space-y-0">
          {/* 탭 (parenting만) */}
          {isParenting && (
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={() => setActiveTab('child')}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  activeTab === 'child'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[#F5F3F0] text-[#6B6966]'
                }`}
              >
                🍼 아이 식단
              </button>
              <button
                onClick={() => {
                  setActiveTab('caregiver')
                  if (!caregiverMeal && !caregiverLoading) fetchCaregiverMeal()
                }}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  activeTab === 'caregiver'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[#F5F3F0] text-[#6B6966]'
                }`}
              >
                🧑 양육자 식단
              </button>
            </div>
          )}

          {/* 끼니 목록 */}
          {activeLoading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
              <p className="text-[12px] text-[#9E9A95]">AI가 식단을 구성하고 있어요...</p>
            </div>
          ) : activeMeal ? (
            <MealRows meal={activeMeal} mode={mode} />
          ) : null}

          {/* 액션 */}
          <div className="flex gap-1.5 pt-3">
            <button onClick={fetchActive} className="flex-1 py-2 text-[11px] text-[#6B6966] font-medium bg-[#F5F3F0] rounded-lg active:bg-[#E8E4DF]">다른 식단</button>
            <button
              onClick={() => shareMealPlan(value, activeMeal?.breakfast?.menu || '', activeMeal?.lunch?.menu || '', activeMeal?.snack?.menu || '')}
              className="flex-1 py-2 text-[11px] text-[var(--color-primary)] font-semibold bg-[#FFF0E6] rounded-lg active:bg-[#FFE0CC]"
            >카톡 공유</button>
            {isParenting && activeTab === 'child' && (
              <Link href="/babyfood" className="flex-1 py-2 text-[11px] text-[var(--color-primary)] font-medium bg-[#F0F4FF] rounded-lg text-center active:bg-[#D5DFEF]">가이드</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
