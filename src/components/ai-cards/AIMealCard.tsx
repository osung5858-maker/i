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

interface MealItem { menu: string; ingredients?: string; reason?: string }
interface MealData {
  dishTitle?: string
  breakfast?: MealItem; lunch?: MealItem; dinner?: MealItem; snack?: MealItem
  newFood?: string; keyNutrient?: string; avoid?: string; tip?: string
}

const MEAL_EMOJI: Record<string, string> = { '아침': '🌅', '점심': '☀️', '저녁': '🌙', '간식': '🍪' }

function getLabel(mode: string, value: number, phase?: string) {
  if (mode === 'parenting') return value < 6 ? '초기 이유식' : value < 8 ? '중기 이유식' : value < 10 ? '후기 이유식' : '완료기 식단'
  if (mode === 'pregnant') return (value <= 13 ? '초기' : value <= 27 ? '중기' : '후기') + ' 임산부'
  const ko: Record<string, string> = { follicular: '난포기', fertile: '가임기', ovulation: '배란기', luteal: '황체기', tww: '착상대기', menstrual: '생리기' }
  return (ko[phase || ''] || '맞춤') + ' 식단'
}

function getApiConfig(mode: string, value: number, phase?: string) {
  if (mode === 'parenting') return { url: '/api/ai-parenting', body: { type: 'meal', ageMonths: value } }
  if (mode === 'pregnant') return { url: '/api/ai-pregnant', body: { type: 'meal', week: value } }
  return { url: '/api/ai-preparing', body: { type: 'meal', phase: phase || 'follicular' } }
}

function getCacheKey(mode: string, value: number, phase?: string) {
  const d = new Date().toISOString().split('T')[0]
  return mode === 'parenting' ? `dodam_meal_${value}_${d}` : mode === 'pregnant' ? `dodam_preg_meal_${value}_${d}` : `dodam_prep_meal_${phase}_${d}`
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

export default function AIMealCard({ mode, value, phase }: Props) {
  const [meal, setMeal] = useState<MealData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const label = getLabel(mode, value, phase)

  useEffect(() => {
    try { const c = localStorage.getItem(getCacheKey(mode, value, phase)); if (c) { const d = JSON.parse(c); if (d.breakfast) setMeal(d) } } catch { /* */ }
  }, [mode, value, phase])

  const fetchMeal = async () => {
    setLoading(true)
    const { url, body } = getApiConfig(mode, value, phase)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.breakfast) { setMeal(data); setExpanded(true); try { localStorage.setItem(getCacheKey(mode, value, phase), JSON.stringify(data)) } catch { /* */ } }
    } catch { /* */ }
    setLoading(false)
  }

  if (!meal && !loading) {
    return (
      <button onClick={fetchMeal} className="w-full bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] rounded-2xl border border-[#E8DFD5] p-4 text-left active:opacity-90">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
            <SparkleIcon className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-[#1A1918]">AI 오늘의 식단</p>
            <p className="text-[12px] text-[#9E9A95] mt-0.5">{label} · 맞춤 추천받기</p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold">추천</div>
        </div>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] rounded-2xl border border-[#E8DFD5] p-4">
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

  const meals = [
    { key: '아침', data: meal?.breakfast },
    { key: '점심', data: meal?.lunch },
    ...(meal?.dinner ? [{ key: '저녁', data: meal.dinner }] : []),
    { key: '간식', data: meal?.snack },
  ].filter(m => m.data)

  return (
    <div className="rounded-2xl border border-[#E8DFD5] overflow-hidden bg-white">
      {/* 헤더 */}
      <button onClick={() => setExpanded(v => !v)} className="w-full bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] p-3.5 flex items-center gap-3 text-left active:opacity-90">
        <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
          <SparkleIcon className="w-4 h-4 text-[var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold text-[#1A1918]">{meal?.dishTitle || 'AI 오늘의 식단'}</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold">AI</span>
          </div>
          <p className="text-[12px] text-[#6B6966] truncate mt-0.5">{meals.map(m => m.data?.menu?.split(',')[0]).join(' · ')}</p>
        </div>
        <span className="text-[11px] text-[#9E9A95] shrink-0">{expanded ? '접기' : '펼치기'}</span>
      </button>

      {expanded && (
        <div className="p-3.5 pt-0 space-y-2">
          {/* 끼니별 카드 */}
          {meals.map(m => (
            <div key={m.key} className="rounded-xl bg-[#FAFAFA] border border-[#F0EDE8] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <SparkleIcon className="w-3 h-3 text-[var(--color-primary)]" />
                  <p className="text-[11px] font-bold text-[var(--color-primary)] tracking-wider">{m.key}</p>
                </div>
                <Link href={`/map?q=${encodeURIComponent(getRestaurantQuery(m.data!.menu, mode))}`} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0F4FF] active:bg-[#D5DFEF]">
                  <MapPinIcon className="w-2.5 h-2.5 text-[#4A6FA5]" />
                  <span className="text-[10px] text-[#4A6FA5] font-medium">식당찾기</span>
                </Link>
              </div>
              <p className="text-[14px] font-semibold text-[#1A1918] leading-snug">{m.data!.menu}</p>
              <p className="text-[11px] text-[#6B6966] mt-1 leading-relaxed">{m.data!.ingredients || m.data!.reason}</p>
            </div>
          ))}

          {/* 영양 정보 */}
          {(meal?.keyNutrient || meal?.newFood || meal?.avoid) && (
            <div className="rounded-xl bg-[#F0F9F4] border border-[#D5E8DC] p-3 space-y-1">
              {meal?.keyNutrient && <p className="text-[11px] text-[#2D7A4A] font-medium">핵심 영양소 · {meal.keyNutrient}</p>}
              {meal?.newFood && <p className="text-[11px] text-[#2D7A4A]">이번 주 새 식재료 · {meal.newFood}</p>}
              {meal?.avoid && <p className="text-[11px] text-[#D08068]">주의 · {meal.avoid}</p>}
            </div>
          )}
          {meal?.tip && <p className="text-[11px] text-[#9E9A95] px-1">{meal.tip}</p>}

          {/* 액션 */}
          <div className="flex gap-1.5 pt-1">
            <button onClick={fetchMeal} className="flex-1 py-2 text-[11px] text-[#6B6966] font-medium bg-[#F5F3F0] rounded-lg active:bg-[#E8E4DF]">다른 식단</button>
            <button onClick={() => shareMealPlan(value, meal?.breakfast?.menu || '', meal?.lunch?.menu || '', meal?.snack?.menu || '')} className="flex-1 py-2 text-[11px] text-[var(--color-primary)] font-semibold bg-[#FFF0E6] rounded-lg active:bg-[#FFE0CC]">카톡 공유</button>
            {mode === 'parenting' && (
              <Link href="/babyfood" className="flex-1 py-2 text-[11px] text-[var(--color-primary)] font-medium bg-[#F0F4FF] rounded-lg text-center active:bg-[#D5DFEF]">가이드</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
