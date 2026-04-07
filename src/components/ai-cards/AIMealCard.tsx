'use client'

import { useState, useEffect, useCallback } from 'react'
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
const MEAL_EMOJI: Record<string, string> = { '아침': '🌅', '점심': '☀️', '저녁': '🌙', '간식': '🍪' }

function getLabel(mode: string, value: number, phase?: string) {
  if (mode === 'parenting') return value < 4 ? '수유기 식단' : value < 6 ? '초기 이유식' : value < 8 ? '중기 이유식' : value < 10 ? '후기 이유식' : '완료기 식단'
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
  [/요거트|요플레|치즈|우유|유제품/, '유제품', '#F5F0FF'],
  [/사과|바나나|딸기|포도|귤|수박|블루베리|망고|키위|과일/, '과일', '#FFF5F0'],
  [/고구마|감자|견과|아몬드|호두|땅콩|넛츠/, '간식류', '#FDF5E6'],
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

function RefreshIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  )
}

interface MealRowsProps {
  meal: MealData
  mode: string
  onRefreshMeal?: (mealKey: string) => void
  refreshingKey?: string | null
}

function MealRows({ meal, mode, onRefreshMeal, refreshingKey }: MealRowsProps) {
  const meals = [
    { key: '아침', field: 'breakfast' as const, data: meal.breakfast },
    { key: '점심', field: 'lunch' as const, data: meal.lunch },
    ...(meal.dinner ? [{ key: '저녁', field: 'dinner' as const, data: meal.dinner }] : []),
    { key: '간식', field: 'snack' as const, data: meal.snack },
  ].filter(m => m.data)

  return (
    <div className="space-y-0">
      {meals.map((m, i) => {
        const cuisine = detectCuisine(m.data!.menu)
        const sides = m.data!.sides || []
        const isRefreshing = refreshingKey === m.field
        return (
          <div key={m.key} className={`py-3 ${i < meals.length - 1 ? 'border-b border-[#F0EDE8]' : ''}`}>
            <div className="flex items-start gap-3">
              {/* 끼니 레이블 */}
              <div className="w-9 shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
                <span className="text-[15px] leading-none">{MEAL_EMOJI[m.key]}</span>
                <span className="text-label font-semibold" style={{ color: MEAL_COLOR[m.key] }}>{m.key}</span>
              </div>
              {/* 내용 */}
              <div className="flex-1 min-w-0">
                {/* 태그 + 칼로리 줄 */}
                <div className="flex items-center gap-1.5 mb-1">
                  {cuisine && (
                    <span className="text-label px-1.5 py-0.5 rounded font-medium text-secondary" style={{ backgroundColor: cuisine.bg }}>
                      {cuisine.label}
                    </span>
                  )}
                  {m.data!.calories && (
                    <span className="text-label text-tertiary font-medium">{m.data!.calories}kcal</span>
                  )}
                </div>
                {/* 메인 메뉴 (bold) */}
                <p className="text-caption font-semibold text-primary leading-snug">{m.data!.menu}</p>
                {/* 사이드 (secondary, 분리) */}
                {sides.length > 0 && (
                  <p className="text-label text-tertiary leading-snug mt-0.5">{sides.join(' · ')}</p>
                )}
              </div>
              {/* 액션 영역 */}
              <div className="shrink-0 flex items-center gap-1 mt-0.5">
                {onRefreshMeal && (
                  <button
                    onClick={() => onRefreshMeal(m.field)}
                    disabled={isRefreshing}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F5F3F0] active:bg-[#E8E4DF] transition-colors disabled:opacity-50"
                    title="다른 메뉴로 변경"
                  >
                    <RefreshIcon className={`w-3 h-3 text-tertiary ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <Link href={`/map?q=${encodeURIComponent(getRestaurantQuery(m.data!.menu, mode))}`} className="shrink-0 h-7 flex items-center gap-0.5 px-2 rounded-full bg-[#F0F4FF] active:bg-[#D5DFEF] transition-colors">
                  <MapPinIcon className="w-3 h-3 text-[#4A6FA5]" />
                  <span className="text-[10px] font-medium text-[#4A6FA5]">주변</span>
                </Link>
              </div>
            </div>
          </div>
        )
      })}

      {/* 영양소 & 주의사항 — 맥락화된 텍스트 */}
      {(meal.keyNutrient || meal.avoid) && (
        <div className="pt-3 mt-1 border-t border-[#F0EDE8] space-y-1.5">
          {meal.keyNutrient && (
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-[11px] leading-none mt-0.5">💊</span>
              <p className="text-label text-[#2D7A4A] leading-snug">
                <span className="font-semibold">이 식단의 핵심 영양소</span>
                <span className="mx-1 text-[#2D7A4A]/40">|</span>
                {meal.keyNutrient}
              </p>
            </div>
          )}
          {meal.avoid && (
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-[11px] leading-none mt-0.5">⚠️</span>
              <p className="text-label text-[#D08068] leading-snug">
                <span className="font-semibold">오늘 피하면 좋은 음식</span>
                <span className="mx-1 text-[#D08068]/40">|</span>
                {meal.avoid}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AIMealCard({ mode, value, phase }: Props) {
  const isParenting = mode === 'parenting'
  // 수유기(5개월 미만)에는 아이 식단 불필요 — 양육자 식단만 표시
  const showChildTab = !isParenting || value >= 5
  const showTabs = isParenting && showChildTab

  const [childMeal, setChildMeal] = useState<MealData | null>(null)
  const [childLoading, setChildLoading] = useState(false)

  const [caregiverMeal, setCaregiverMeal] = useState<MealData | null>(null)
  const [caregiverLoading, setCaregiverLoading] = useState(false)

  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'child' | 'caregiver'>(showChildTab ? 'child' : 'caregiver')
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null)

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

  const handleRefreshMeal = useCallback(async (mealKey: string) => {
    setRefreshingKey(mealKey)
    const tab = isParenting ? activeTab : undefined
    const { url, body } = getApiConfig(mode, value, phase, tab === 'caregiver' ? 'caregiver' : undefined)
    try {
      // _refresh 파라미터로 서버 캐시 우회 + 해당 끼니만 교체
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, _refresh: `${mealKey}_${Date.now()}` }),
      })
      const data = await res.json()
      if (data[mealKey]) {
        const setter = (isParenting && activeTab === 'caregiver') ? setCaregiverMeal : setChildMeal
        setter(prev => {
          if (!prev) return prev
          const updated = { ...prev, [mealKey]: data[mealKey] }
          const cacheTab = (isParenting && activeTab === 'caregiver') ? 'caregiver' : undefined
          try { localStorage.setItem(getCacheKey(mode, value, phase, cacheTab), JSON.stringify(updated)) } catch { /* */ }
          return updated
        })
      }
    } catch { /* */ }
    setRefreshingKey(null)
  }, [mode, value, phase, isParenting, activeTab])

  const activeMeal = isParenting ? (activeTab === 'child' ? childMeal : caregiverMeal) : childMeal
  const activeLoading = isParenting ? (activeTab === 'child' ? childLoading : caregiverLoading) : childLoading
  const fetchActive = isParenting ? (activeTab === 'child' ? fetchChildMeal : fetchCaregiverMeal) : fetchChildMeal

  // 수유기: 양육자 식단을 기본으로 fetch
  const fetchInitial = showChildTab ? fetchChildMeal : fetchCaregiverMeal
  const initialMeal = showChildTab ? childMeal : caregiverMeal
  const initialLoading = showChildTab ? childLoading : caregiverLoading

  // 미요청 상태
  if (!initialMeal && !initialLoading) {
    return (
      <button onClick={fetchInitial} className="w-full bg-[var(--color-primary-bg)] rounded-2xl border border-[var(--color-primary)]/20 shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-5 text-left active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-white/90 flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(45,122,74,0.15)]">
            <SparkleIcon className="w-7 h-7 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-subtitle text-primary">AI 오늘의 식단</p>
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-label font-bold">AI 맞춤</span>
            </div>
            <p className="text-body text-secondary">{showTabs ? '아이 + 양육자 맞춤 구성' : isParenting ? '양육자 맞춤 식단' : label} · 탭해서 확인</p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[var(--color-primary)] font-bold shadow-[0_2px_8px_rgba(45,122,74,0.25)]" style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 700 }}>추천</div>
        </div>
      </button>
    )
  }

  if (initialLoading && !initialMeal) {
    return (
      <div className="bg-[var(--color-primary-bg)] rounded-2xl border border-[var(--color-primary)]/20 shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <div>
            <p className="text-body-emphasis font-bold text-primary">AI가 식단을 구성하고 있어요</p>
            <p className="text-caption text-secondary mt-0.5">{label} 맞춤 분석 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--color-primary)]/20 overflow-hidden bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      {/* 헤더 */}
      <button onClick={() => setExpanded(v => !v)} className="w-full bg-[var(--color-primary-bg)] p-4 flex items-center gap-3.5 text-left active:opacity-90 transition-opacity">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(45,122,74,0.15)]">
          <SparkleIcon className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-body-emphasis font-bold text-primary">AI 식단 제안</p>
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-label font-bold">AI 맞춤</span>
          </div>
          <p className="text-caption text-secondary">
            {showTabs ? '아이 · 양육자 맞춤 구성' : isParenting ? '양육자 맞춤 식단' : `${[childMeal?.breakfast, childMeal?.lunch, childMeal?.dinner, childMeal?.snack].filter(Boolean).length}끼 맞춤 구성`} · 탭해서 {expanded ? '접기' : '확인'}
          </p>
        </div>
        <div className={`w-6 h-6 rounded-full bg-white/60 flex items-center justify-center shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-3 h-3 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2 space-y-0">
          {/* 탭 (parenting + 이유식 시작 이후만) */}
          {showTabs && (
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={() => setActiveTab('child')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'child'
                    ? 'bg-[var(--color-primary)] font-bold'
                    : 'bg-[#F5F3F0] text-secondary'
                }`}
                style={activeTab === 'child' ? { fontSize: 13, color: '#FFFFFF', fontWeight: 700 } : { fontSize: 13 }}
              >
                🍼 아이 식단
              </button>
              <button
                onClick={() => {
                  setActiveTab('caregiver')
                  if (!caregiverMeal && !caregiverLoading) fetchCaregiverMeal()
                }}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'caregiver'
                    ? 'bg-[var(--color-primary)] font-bold'
                    : 'bg-[#F5F3F0] text-secondary'
                }`}
                style={activeTab === 'caregiver' ? { fontSize: 13, color: '#FFFFFF', fontWeight: 700 } : { fontSize: 13 }}
              >
                🧑 양육자 식단
              </button>
            </div>
          )}

          {/* 끼니 목록 */}
          {activeLoading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
              <p className="text-caption text-tertiary">AI가 식단을 구성하고 있어요...</p>
            </div>
          ) : activeMeal ? (
            <MealRows meal={activeMeal} mode={mode} onRefreshMeal={handleRefreshMeal} refreshingKey={refreshingKey} />
          ) : null}

          {/* 액션 */}
          <div className="flex gap-1.5 pt-3">
            <button onClick={fetchActive} className="flex-1 py-2 text-label text-secondary font-medium bg-[var(--color-surface-alt)] rounded-lg active:bg-[var(--color-border)] flex items-center justify-center gap-1">
              <RefreshIcon className="w-3 h-3" />
              전체 새로고침
            </button>
            <button
              onClick={() => shareMealPlan(value, activeMeal?.breakfast?.menu || '', activeMeal?.lunch?.menu || '', activeMeal?.snack?.menu || '')}
              className="flex-1 py-2 text-label text-[var(--color-primary)] font-semibold bg-[var(--color-primary-bg)] rounded-lg active:opacity-80"
            >카톡 공유</button>
            {isParenting && activeTab === 'child' && (
              <Link href="/babyfood" className="flex-1 py-2 text-label text-blue-600 font-medium bg-blue-50 rounded-lg text-center active:bg-blue-100">가이드</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
