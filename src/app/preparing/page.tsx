'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { shareAIAdvice, shareProgress, sharePartnerNudge } from '@/lib/kakao/share'
import { SparkleIcon, PenIcon } from '@/components/ui/Icons'
import AIMealCard from '@/components/ai-cards/AIMealCard'
import PushPrompt from '@/components/push/PushPrompt'
import SpotlightGuide from '@/components/onboarding/SpotlightGuide'

function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d
}

function getCycleInfo(lastPeriodStart: string, cycleLength: number) {
  const start = new Date(lastPeriodStart)
  const ovulationDay = addDays(start, cycleLength - 14)
  const fertileStart = addDays(ovulationDay, -5)
  const fertileEnd = addDays(ovulationDay, 1)
  const nextPeriod = addDays(start, cycleLength)
  const cycleDay = Math.floor((Date.now() - start.getTime()) / 86400000) + 1
  return { ovulationDay, fertileStart, fertileEnd, nextPeriod, cycleDay }
}

// ===== AI 브리핑 타입 =====
interface AIBriefing {
  summary?: string; greeting?: string; mainAdvice: string; cycleInsight: string
  nutritionTip: string; emotionalCare: string; partnerTip: string; todayScore: number
}

// ===== 더보기 섹션 데이터 =====
const GOOD_FOODS = [
  { icon: '', name: '엽산 식품', items: '시금치 · 브로콜리 · 아보카도' },
  { icon: '', name: '오메가3', items: '연어 · 고등어 · 호두' },
  { icon: '', name: '철분', items: '소고기 · 두부 · 렌틸콩' },
  { icon: '', name: '항산화', items: '블루베리 · 토마토 · 석류' },
]
const BAD_FOODS = [
  { icon: '', name: '카페인', desc: '하루 1잔 이하' },
  { icon: '', name: '알코올', desc: '완전 금주' },
  { icon: '', name: '고수은 생선', desc: '참치(큰것) · 황새치' },
]

const APPOINTMENTS = [
  { id: 'basic', title: '기본 혈액검사', priority: 'high', desc: '빈혈 · 갑상선 · 간기능 · 혈당 · 혈액형', where: '산부인과 또는 보건소 (무료)', why: '임신 전 몸 상태 확인. 빈혈이 있으면 임신이 어려울 수 있어요' },
  { id: 'rubella', title: '풍진 항체검사', priority: 'high', desc: '풍진 면역 여부 확인', where: '산부인과 또는 보건소 (무료)', why: '임신 중 풍진 감염 시 태아 기형 위험. 항체 없으면 접종 후 1개월 피임 필요' },
  { id: 'amh', title: 'AMH 검사', priority: 'high', desc: '난소 기능 · 잔여 난자 수 예측', where: '산부인과 (유료 5~10만원)', why: '35세 이상 필수. 난소 나이를 확인해 임신 계획에 도움' },
  { id: 'dental', title: '치과 검진', priority: 'medium', desc: '충치 · 잇몸 치료', where: '치과', why: '임신 중 치과 치료 제한됨. 미리 치료해야 해요' },
  { id: 'pap', title: '자궁경부암 검사', priority: 'medium', desc: '자궁경부 세포 검사', where: '산부인과 또는 보건소 (만 20세+ 무료)', why: '2년 이내 미실시 시 필수' },
  { id: 'std', title: '성병 검사', priority: 'medium', desc: '클라미디아 · 매독 · HIV', where: '산부인과 또는 보건소', why: '무증상 감염도 있어 임신 전 확인 필요' },
  { id: 'genetic', title: '유전 상담', priority: 'low', desc: '유전 질환 가족력 확인', where: '대학병원 유전 상담 센터', why: '가족 중 유전 질환이 있을 경우 상담 권장' },
  { id: 'sperm', title: '정액 검사', priority: 'low', desc: '정자 수 · 운동성 · 형태', where: '비뇨기과 또는 난임 클리닉', why: '6개월 이상 임신 안 될 때. 남성 요인이 40%' },
]

const STRESS_TIPS = [
  { icon: '', title: '4-7-8 호흡법', desc: '4초 들숨 → 7초 멈춤 → 8초 날숨' },
  { icon: '', title: '산책 명상', desc: '15분 걷기 + 자연 소리' },
  { icon: '', title: '감사 일기', desc: '매일 3가지 감사한 것' },
  { icon: '', title: '음악 테라피', desc: '편안한 음악 20분' },
]

// ===== 생년월일 선택 (년/월/일) =====
function BirthDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value ? value.split('-') : ['', '', '']
  const [year, setYear] = useState(parts[0])
  const [month, setMonth] = useState(parts[1])
  const [day, setDay] = useState(parts[2])

  const update = (y: string, m: string, d: string) => {
    setYear(y); setMonth(m); setDay(d)
    if (y && m && d) onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
  }

  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31

  return (
    <div className="flex gap-2">
      <select value={year} onChange={e => update(e.target.value, month, day)} className="flex-[2] h-11 rounded-xl border border-[#E8E4DF] px-2 text-[13px] bg-white">
        <option value="">년</option>
        {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - 20 - i).map(y => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
      <select value={month} onChange={e => update(year, e.target.value, day)} className="flex-1 h-11 rounded-xl border border-[#E8E4DF] px-2 text-[13px] bg-white">
        <option value="">월</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
          <option key={m} value={String(m)}>{m}월</option>
        ))}
      </select>
      <select value={day} onChange={e => update(year, month, e.target.value)} className="flex-1 h-11 rounded-xl border border-[#E8E4DF] px-2 text-[13px] bg-white">
        <option value="">일</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
          <option key={d} value={String(d)}>{d}일</option>
        ))}
      </select>
    </div>
  )
}

// ===== AI 디스플레이 — 요약 기본 + 펼쳐서 전체 =====
function AITypingDisplay({ briefing, onRefresh, onShare }: { briefing: any; onRefresh: () => void; onShare: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[13px] text-white font-bold">AI</span>
        </div>
        <div className="flex-1">
          {/* 요약: 첫 문장 볼드 + 나머지 일반 */}
          {(() => {
            const text = briefing.summary || briefing.greeting || ''
            const firstDot = text.search(/[.!?]\s|[.!?]$/)
            const headline = firstDot > 0 ? text.slice(0, firstDot + 1) : text.slice(0, 50)
            const rest = firstDot > 0 ? text.slice(firstDot + 1).trim() : text.slice(50).trim()
            return (
              <div className="whitespace-pre-line">
                <span className="text-[15px] font-bold text-[#1A1918] leading-snug">{headline}</span>
                {rest && <span className="text-[14px] text-[#4A4744] leading-relaxed"> {rest}</span>}
              </div>
            )
          })()}

          {/* 상세 (펼치기) */}
          {expanded && (
            <div className="mt-2 space-y-2 bg-white/60 rounded-lg p-2.5">
              <p className="text-[13px] text-[#4A4744] leading-relaxed">{briefing.mainAdvice}</p>
              {briefing.cycleInsight && <p className="text-[13px] text-[#4A4744] leading-relaxed">{briefing.cycleInsight}</p>}
              {briefing.emotionalCare && <p className="text-[13px] text-[#4A4744] leading-relaxed">{briefing.emotionalCare}</p>}
              {briefing.nutritionTip && <p className="text-[13px] text-[#4A4744] leading-relaxed">{briefing.nutritionTip}</p>}
              {briefing.partnerTip && <p className="text-[13px] text-[#4A4744] leading-relaxed">{briefing.partnerTip}</p>}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setExpanded(!expanded)} className="text-[13px] text-[var(--color-primary)] font-medium">
              {expanded ? '접기 ▲' : '자세히 보기 ▼'}
            </button>
            <button onClick={onRefresh} className="text-[13px] text-[#9E9A95]">다시 받기</button>
            <button onClick={onShare} className="text-[13px] text-[var(--color-primary)]">공유</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function haptic() { if (navigator.vibrate) navigator.vibrate(20) }

// ===== 임신 준비 식단 추천 카드 =====
function PreparingMealCard({ phase }: { phase: string }) {
  const [meal, setMeal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const phaseKo: Record<string, string> = { follicular: '난포기', fertile: '가임기', ovulation: '배란기', luteal: '황체기', tww: '착상대기', menstrual: '생리기' }

  useEffect(() => {
    const cacheKey = `dodam_prep_meal_${phase}_${new Date().toISOString().split('T')[0]}`
    try { const c = localStorage.getItem(cacheKey); if (c) { const d = JSON.parse(c); if (d.breakfast) setMeal(d) } } catch { /* */ }
  }, [phase])

  const fetchMeal = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-preparing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'meal', phase }) })
      const data = await res.json()
      if (data.breakfast) {
        setMeal(data); setExpanded(true)
        try { localStorage.setItem(`dodam_prep_meal_${phase}_${new Date().toISOString().split('T')[0]}`, JSON.stringify(data)) } catch { /* */ }
      }
    } catch { /* */ }
    setLoading(false)
  }

  if (!meal && !loading) {
    return (
      <button onClick={fetchMeal} className="w-full bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-2.5 active:bg-[#F5F1EC] text-left">
        <div className="w-9 h-9 rounded-full bg-[#F0F4FF] flex items-center justify-center shrink-0">
          <SparkleIcon className="w-4.5 h-4.5 text-[#4A6FA5]" />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-[#1A1918]">{phaseKo[phase] || phase} 맞춤 식단</p>
          <p className="text-[13px] text-[#9E9A95]">AI 오늘의 식단 추천받기</p>
        </div>
      </button>
    )
  }
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-2.5">
        <div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
        <p className="text-[13px] text-[#6B6966]">AI가 {phaseKo[phase] || ''} 맞춤 식단을 추천 중...</p>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full p-3 flex items-center gap-2.5 text-left active:bg-[#F5F1EC]">
        <div className="w-9 h-9 rounded-full bg-[#F0F4FF] flex items-center justify-center shrink-0">
          <SparkleIcon className="w-4.5 h-4.5 text-[#4A6FA5]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#1A1918]">{phaseKo[phase] || phase} · 오늘의 식단</p>
          <p className="text-[13px] text-[#6B6966] truncate">{meal.breakfast?.menu} · {meal.lunch?.menu}</p>
        </div>
        <span className="text-[12px] text-[#9E9A95]">{expanded ? '접기' : '펼치기'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {[{ label: '아침', data: meal.breakfast }, { label: '점심', data: meal.lunch }, { label: '저녁', data: meal.dinner }, { label: '간식', data: meal.snack }].map(m => m.data && (
            <div key={m.label} className="p-2.5 rounded-lg bg-[var(--color-page-bg)]">
              <p className="text-[12px] font-semibold text-[#6B6966]">{m.label}</p>
              <p className="text-[13px] font-medium text-[#1A1918] mt-0.5">{m.data.menu}</p>
              <p className="text-[11px] text-[#9E9A95]">{m.data.reason}</p>
            </div>
          ))}
          {meal.keyNutrient && <p className="text-[12px] text-[var(--color-primary)] font-medium px-1">핵심 영양소: {meal.keyNutrient}</p>}
          <button onClick={fetchMeal} className="w-full py-1.5 text-[11px] text-[#6B6966] bg-[var(--color-page-bg)] rounded-lg active:bg-[#E8E4DF]">다른 식단</button>
        </div>
      )}
    </div>
  )
}

export default function PreparingPage() {
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); haptic(); setTimeout(() => setToast(null), 2000) }
  const [showGuide, setShowGuide] = useState(false)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  useEffect(() => {
    createClient().auth.getUser().then(({ data }: any) => {
      setAvatarUrl(data.user?.user_metadata?.avatar_url || null)
    })
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('dodam_guide_preparing')) {
      const t = setTimeout(() => setShowGuide(true), 1000)
      return () => clearTimeout(t)
    }
  }, [])

  const [lastPeriod, setLastPeriod] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_last_period') || ''
    return ''
  })
  const [cycleLength, setCycleLength] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('dodam_cycle_length')) || 28
    return 28
  })
  const [editingCycle, setEditingCycle] = useState(!lastPeriod)
  const SUPPL_DEFAULT: Record<string, number> = { folic: 0, vitd: 0, iron: 0, omega3: 0 }
  const [supplements, setSupplements] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0]
      const s = localStorage.getItem(`dodam_suppl_${today}`)
      if (s) {
        const parsed = JSON.parse(s)
        const migrated: Record<string, number> = { ...SUPPL_DEFAULT }
        for (const [k, v] of Object.entries(parsed)) {
          migrated[k] = typeof v === 'boolean' ? (v ? 1 : 0) : (v as number)
        }
        return migrated
      }
      return { ...SUPPL_DEFAULT }
    }
    return { ...SUPPL_DEFAULT }
  })
  const [todayMood, setTodayMood] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0]
      return localStorage.getItem(`dodam_mood_${today}`) || ''
    }
    return ''
  })
  const [motherBirth, setMotherBirth] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_mother_birth') || ''
    return ''
  })
  const [fatherBirth, setFatherBirth] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_father_birth') || ''
    return ''
  })
  const calcAge = (birth: string) => {
    if (!birth) return 0
    const b = new Date(birth)
    const now = new Date()
    let age = now.getFullYear() - b.getFullYear()
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--
    return age
  }
  const motherAge = calcAge(motherBirth)
  const fatherAge = calcAge(fatherBirth)
  const [partnerChecks, setPartnerChecks] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_partner_checks'); return s ? JSON.parse(s) : {}
    }
    return {}
  })
  const [appointments, setAppointments] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_appointments'); return s ? JSON.parse(s) : {}
    }
    return {}
  })

  // 접기 상태
  const [moreOpen, setMoreOpen] = useState(false)

  // AI
  const [aiBriefing, setAiBriefing] = useState<AIBriefing | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMeal, setAiMeal] = useState<any>(null)
  const [aiMealLoading, setAiMealLoading] = useState(false)

  const cycle = useMemo(() => {
    if (!lastPeriod) return null
    return getCycleInfo(lastPeriod, cycleLength)
  }, [lastPeriod, cycleLength])

  const getCyclePhase = useCallback(() => {
    if (!cycle) return 'unknown'
    const today = new Date()
    const dpo = Math.floor((today.getTime() - cycle.ovulationDay.getTime()) / 86400000)
    if (today >= cycle.fertileStart && today <= cycle.fertileEnd) return 'fertile'
    if (dpo === 0) return 'ovulation'
    if (dpo > 0 && dpo <= 14) return 'tww'
    if (cycle.cycleDay <= 5) return 'period'
    return 'follicular'
  }, [cycle])

  const phaseLabel: Record<string, string> = { fertile: '가임기', ovulation: '배란일', tww: '착상 기다리는 중', period: '생리 중', follicular: '준비기', unknown: '-' }

  // AI 브리핑 (하루 1회 캐시)
  const [aiError, setAiError] = useState<string | null>(null)
  const today = new Date().toISOString().split('T')[0]

  const fetchAIBriefing = async (force = false) => {
    if (!cycle) return
    // 캐시 확인 (오늘 이미 받았으면 스킵)
    if (!force) {
      const cached = localStorage.getItem('dodam_ai_briefing')
      if (cached) {
        try {
          const { date, data } = JSON.parse(cached)
          if (date === today && (data.summary || data.greeting)) { setAiBriefing(data); return }
        } catch { /* */ }
      }
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const healthRaw = localStorage.getItem('dodam_health_records')
      const health = healthRaw ? JSON.parse(healthRaw) : {}
      const todayHealth = health[today]
      const res = await fetch('/api/ai-preparing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily', cycleDay: cycle.cycleDay, cycleLength, phase: getCyclePhase(),
          motherAge, fatherAge, mood: todayMood,
          supplements: Object.values(supplements).filter(Boolean).length,
          partnerChecks: Object.values(partnerChecks).filter(Boolean).length,
          sleep: todayHealth?.sleep, steps: todayHealth?.steps, stress: todayHealth?.stress,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setAiError(`AI 오류: ${data.error}`)
      } else {
        setAiBriefing(data)
        localStorage.setItem('dodam_ai_briefing', JSON.stringify({ date: today, data }))
      }
    } catch (e) {
      setAiError(`요청 실패: ${e}`)
    }
    setAiLoading(false)
  }

  const [mealError, setMealError] = useState<string | null>(null)

  const fetchAIMeal = async (force = false) => {
    if (!cycle) return
    // 캐시 확인
    if (!force) {
      const cached = localStorage.getItem('dodam_ai_meal')
      if (cached) {
        try {
          const { date, data } = JSON.parse(cached)
          if (date === today && data.breakfast) { setAiMeal(data); return }
        } catch { /* */ }
      }
    }
    setAiMealLoading(true)
    setMealError(null)
    try {
      const res = await fetch('/api/ai-preparing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meal', phase: getCyclePhase(), cycleDay: cycle.cycleDay }),
      })
      const data = await res.json()
      if (data.error) {
        setMealError(data.error)
      } else if (data.breakfast) {
        setAiMeal(data)
        localStorage.setItem('dodam_ai_meal', JSON.stringify({ date: today, data }))
      } else {
        setMealError('응답 형식 오류')
      }
    } catch (e) {
      setMealError(`${e}`)
    }
    setAiMealLoading(false)
  }

  // AI 자동 호출 제거 — 캐시만 복원 (사용자가 버튼 클릭 시에만 호출)
  useEffect(() => {
    if (cycle && !aiBriefing) {
      const cached = localStorage.getItem(`dodam_ai_briefing_${new Date().toISOString().split('T')[0]}`)
      if (cached) try { setAiBriefing(JSON.parse(cached)) } catch { /* */ }
    }
  }, [!!cycle]) // eslint-disable-line react-hooks/exhaustive-deps

  // 통합 히스토리 저장 (날짜별 모든 활동 기록)
  const saveHistory = (type: string, value: any) => {
    // 개별 타입 히스토리
    const key = `dodam_${type}_history`
    const history = JSON.parse(localStorage.getItem(key) || '[]')
    const today = new Date().toISOString().split('T')[0]
    const existing = history.findIndex((h: any) => h.date === today)
    if (existing >= 0) history[existing] = { date: today, value }
    else history.unshift({ date: today, value })
    localStorage.setItem(key, JSON.stringify(history.slice(0, 90)))

    // 통합 일일 기록 (통계용)
    const dailyKey = `dodam_daily_${today}`
    const daily = JSON.parse(localStorage.getItem(dailyKey) || '{}')
    daily[type] = value
    daily.updatedAt = new Date().toISOString()
    localStorage.setItem(dailyKey, JSON.stringify(daily))

    // 날짜 인덱스 관리
    const indexKey = 'dodam_daily_index'
    const index: string[] = JSON.parse(localStorage.getItem(indexKey) || '[]')
    if (!index.includes(today)) {
      index.unshift(today)
      localStorage.setItem(indexKey, JSON.stringify(index.slice(0, 90)))
    }
  }

  // 핸들러
  const SUPPL_NAMES: Record<string, string> = { folic: '엽산', vitd: '비타민D', iron: '철분', omega3: '오메가3' }
  const SUPPL_MAX = 1 // 하루 1회 토글
  const toggleSupplement = (key: string) => {
    const today = new Date().toISOString().split('T')[0]
    const current = supplements[key] || 0
    const nextVal = current >= SUPPL_MAX ? 0 : 1 // 0↔1 토글
    const next = { ...supplements, [key]: nextVal }
    setSupplements(next); localStorage.setItem(`dodam_suppl_${today}`, JSON.stringify(next))
    const totalDone = Object.values(next).reduce((s, v) => s + v, 0)
    saveHistory('suppl', totalDone)
    const name = SUPPL_NAMES[key] || key
    if (nextVal === 0) showToast(`${name} 취소`)
    else showToast(`${name} 복용 완료!`)
  }
  const saveMood = (mood: string) => {
    const today = new Date().toISOString().split('T')[0]
    setTodayMood(mood); localStorage.setItem(`dodam_mood_${today}`, mood)
    saveHistory('mood', mood)
    showToast('오늘 기분이 기록됐어요')
  }
  const togglePartnerCheck = (key: string) => {
    const next = { ...partnerChecks, [key]: !partnerChecks[key] }
    setPartnerChecks(next); localStorage.setItem('dodam_partner_checks', JSON.stringify(next))
    showToast(next[key] ? '체크 완료!' : '체크 취소')
  }
  const toggleAppointment = (id: string) => {
    const next = { ...appointments }
    const isNew = !next[id]
    if (next[id]) delete next[id]; else next[id] = new Date().toISOString().split('T')[0]
    setAppointments(next); localStorage.setItem('dodam_appointments', JSON.stringify(next))
    showToast(isNew ? '검사 완료 기록됨' : '검사 기록 취소')
  }
  // 주기 설정 저장
  const [tempPeriod, setTempPeriod] = useState(lastPeriod)
  const [tempCycleLen, setTempCycleLen] = useState(cycleLength)
  const [tempMotherBirth, setTempMotherBirth] = useState(motherBirth)
  const [tempFatherBirth, setTempFatherBirth] = useState(fatherBirth)
  const [myRole, setMyRole] = useState<'mom' | 'dad'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('dodam_my_role') as 'mom' | 'dad') || 'mom'
    return 'mom'
  })

  const handleSaveCycleSetup = () => {
    if (!tempPeriod) return
    localStorage.setItem('dodam_my_role', myRole)
    setLastPeriod(tempPeriod); localStorage.setItem('dodam_last_period', tempPeriod)
    setCycleLength(tempCycleLen); localStorage.setItem('dodam_cycle_length', String(tempCycleLen))
    if (tempMotherBirth) { setMotherBirth(tempMotherBirth); localStorage.setItem('dodam_mother_birth', tempMotherBirth) }
    if (tempFatherBirth) { setFatherBirth(tempFatherBirth); localStorage.setItem('dodam_father_birth', tempFatherBirth) }
    setEditingCycle(false)
  }

  // 주기 설정 화면
  if (editingCycle) {
    const myBirth = myRole === 'mom' ? tempMotherBirth : tempFatherBirth
    const partnerBirth = myRole === 'mom' ? tempFatherBirth : tempMotherBirth
    const myAge = calcAge(myBirth)
    const partnerAge = calcAge(partnerBirth)
    const setMyBirth = (v: string) => { if (myRole === 'mom') setTempMotherBirth(v); else setTempFatherBirth(v) }
    const setPartnerBirth = (v: string) => { if (myRole === 'mom') setTempFatherBirth(v); else setTempMotherBirth(v) }

    return (
      <div className="min-h-[100dvh] bg-white">
        <div data-guide="cycle-setup" className="max-w-xs mx-auto pt-12 pb-20 px-6">
          <h1 className="text-[22px] font-bold text-[#1A1918] mb-1">기본 정보</h1>
          <p className="text-[13px] text-[#6B6966] mb-6">맞춤 조언을 위해 필요해요</p>

          {/* 나는 누구? */}
          <div className="mb-5">
            <p className="text-[14px] font-semibold text-[#6B6966] mb-2">나는</p>
            <div className="flex gap-2">
              <button onClick={() => setMyRole('mom')}
                className={`flex-1 py-3 rounded-xl text-[14px] font-semibold ${myRole === 'mom' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-page-bg)] text-[#6B6966]'}`}>
                예비맘
              </button>
              <button onClick={() => setMyRole('dad')}
                className={`flex-1 py-3 rounded-xl text-[14px] font-semibold ${myRole === 'dad' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-page-bg)] text-[#6B6966]'}`}>
                예비파파
              </button>
            </div>
          </div>

          {/* 내 생년월일 */}
          <div className="mb-5">
            <p className="text-[14px] font-semibold text-[#6B6966] mb-1">내 생년월일 {myAge > 0 && <span className="text-[var(--color-primary)] font-bold">{myAge}세</span>}</p>
            <BirthDatePicker value={myBirth} onChange={setMyBirth} />
          </div>

          {/* 생리 주기 (예비맘만) */}
          {myRole === 'mom' && (
            <>
              <div className="mb-5">
                <p className="text-[14px] font-semibold text-[#6B6966] mb-1">마지막 생리 시작일</p>
                <input type="date" value={tempPeriod} onChange={(e) => setTempPeriod(e.target.value)} className="w-full h-12 rounded-xl border border-[#E8E4DF] px-4 text-[14px]" />
              </div>
              <div className="mb-5">
                <p className="text-[14px] font-semibold text-[#6B6966] mb-1">평균 주기 <span className="text-[var(--color-primary)] font-bold">{tempCycleLen}일</span></p>
                <input type="range" min={21} max={40} value={tempCycleLen} onChange={(e) => setTempCycleLen(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
                <div className="flex justify-between text-[13px] text-[#9E9A95]"><span>21일</span><span>28일</span><span>40일</span></div>
              </div>
            </>
          )}

          {/* 예비파파는 아내 초대 유도 */}
          {myRole === 'dad' && !tempPeriod && (
            <div className="mb-5 bg-[#F0F9F4] rounded-xl p-4 text-center">
              <p className="text-[13px] font-semibold text-[var(--color-primary)] mb-1">아내를 초대하세요</p>
              <p className="text-[13px] text-[#6B6966] mb-3">아내가 생리 주기를 입력하면 더 정확한 조언을 받을 수 있어요</p>
              <a href="/settings/caregivers/invite" className="inline-block px-4 py-2 bg-[var(--color-primary)] text-white text-[14px] font-semibold rounded-xl">아내 초대하기</a>
            </div>
          )}

          <button
            onClick={handleSaveCycleSetup}
            disabled={myRole === 'mom' ? !tempPeriod : !myBirth}
            className={`w-full py-3 rounded-xl text-[14px] font-semibold ${(myRole === 'mom' ? tempPeriod : myBirth) ? 'bg-[var(--color-primary)] text-white active:opacity-80' : 'bg-[#E8E4DF] text-[#9E9A95]'}`}
          >
            완료
          </button>
        </div>
      </div>
    )
  }

  const supplCount = Object.values(supplements).reduce((s, v) => s + (v > 0 ? 1 : 0), 0)
  const partnerCount = Object.values(partnerChecks).filter(Boolean).length
  const apptCount = APPOINTMENTS.filter(a => appointments[a.id]).length
  const dpo = cycle ? Math.floor((Date.now() - cycle.ovulationDay.getTime()) / 86400000) : -99
  const showTWW = dpo >= 0 && dpo <= 16

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      {/* 헤더는 GlobalHeader (layout.tsx)에서 처리 */}

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">

        {/* ━━━ 1. AI 히어로 — CTA 형태 ━━━ */}
        {cycle && (
          <div data-guide="ai-briefing" className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SparkleIcon className="w-4 h-4 text-[#C4913E]" />
                <p className="text-[14px] font-bold text-[#1A1918]">오늘의 AI 케어</p>
              </div>
              {aiBriefing?.todayScore ? (
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                  <span className="text-[13px] font-bold text-white">{aiBriefing.todayScore}</span>
                </div>
              ) : null}
            </div>

            {aiError && (
              <div className="bg-[#FFF0E6] rounded-lg p-2 mb-2">
                <p className="text-[13px] text-[#D08068]">{aiError}</p>
              </div>
            )}

            {aiLoading ? (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center"><span className="text-[14px] text-white">AI</span></div>
                  <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0s' }} /><span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} /><span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} /></div>
                </div>
              </div>
            ) : aiBriefing ? (
              <AITypingDisplay briefing={aiBriefing} onRefresh={() => fetchAIBriefing(true)} onShare={() => shareAIAdvice(aiBriefing.summary || aiBriefing.greeting || '', aiBriefing.mainAdvice, getCyclePhase())} />
            ) : (
              <div className="text-center py-3">
                <p className="text-[13px] text-[#1A1918] mb-2">오늘의 맞춤 조언을 받아보세요</p>
                <button onClick={() => fetchAIBriefing()} className="px-6 py-2.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-xl active:opacity-80 shadow-[0_2px_12px_rgba(61,138,90,0.3)]">
                  AI 조언 받기
                </button>
              </div>
            )}

            {/* 착상 기다리는 중 인라인 */}
            {showTWW && (
              <div className="mt-3 pt-3 border-t border-[var(--color-accent-bg)]/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-semibold text-[#1A1918]">착상 기다리는 중 D+{dpo}</p>
                  <p className="text-[14px] text-[var(--color-primary)]">{Math.round((dpo / 14) * 100)}%</p>
                </div>
                <div className="w-full h-1.5 bg-white/50 rounded-full">
                  <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${Math.min((dpo / 14) * 100, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ━━━ 능동적 제안 카드 ━━━ */}
        {(() => {
          const suggestions: { icon: string; text: string; action?: string; href?: string }[] = []
          // 영양제 안 챙김
          if (supplCount === 0) suggestions.push({ icon: '', text: '오늘 엽산 아직 안 챙겼어요!', action: 'suppl' })
          // 가임기 알림
          if (getCyclePhase() === 'fertile') {
            suggestions.push({ icon: '', text: '지금 가임기예요! 타이밍 잡아보세요', href: '/waiting' })
          }
          // TWW 안내
          if (getCyclePhase() === 'tww') {
            suggestions.push({ icon: '', text: '착상 기다리는 중이에요. 무리하지 마세요', href: '/waiting' })
          }

          if (suggestions.length === 0) return null
          return (
            <div className="space-y-1.5">
              {suggestions.slice(0, 3).map((s, i) => (
                <Link key={i} href={s.href || '#'} className="flex items-center gap-2.5 bg-white rounded-xl border border-[#FFDDC8] p-3 active:bg-[var(--color-page-bg)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />
                  <p className="text-[13px] text-[#1A1918] flex-1">{s.text}</p>
                  <span className="text-[#9E9A95] text-[12px]">→</span>
                </Link>
              ))}
            </div>
          )
        })()}

        {/* ━━━ 2. 오늘 할 일 ━━━ */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-3">오늘 할 일</p>

          {/* 영양제 — 탭할 때마다 1회씩 채워짐 (최대 4회) */}
          <div data-guide="supplements" className="grid grid-cols-4 gap-1.5 mb-3">
            {[
              { key: 'folic', name: '엽산' },
              { key: 'vitd', name: '비타민D' },
              { key: 'iron', name: '철분' },
              { key: 'omega3', name: '오메가3' },
            ].map((s) => {
              const count = supplements[s.key] || 0
              const done = count >= SUPPL_MAX
              const pct = (count / SUPPL_MAX) * 100
              return (
                <button key={s.key} onClick={() => toggleSupplement(s.key)}
                  className={`relative rounded-xl overflow-hidden active:scale-95 transition-transform ${done ? 'border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border border-[#E8E4DF]'}`}>
                  {/* 채우기 프로그레스 (완료 아닐 때만) */}
                  {!done && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-[var(--color-primary)]/15 transition-all duration-300"
                      style={{ height: `${pct}%` }}
                    />
                  )}
                  <div className="relative py-2.5 text-center">
                    <p className={`text-[12px] font-semibold ${done ? 'text-[var(--color-primary)]' : count > 0 ? 'text-[#1A1918]' : 'text-[#6B6966]'}`}>
                      {done ? '✓ ' : ''}{s.name}
                    </p>
                    {/* 도트 인디케이터 */}
                    <div className="flex justify-center gap-1 mt-1">
                      {Array.from({ length: SUPPL_MAX }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i < count ? 'bg-[var(--color-primary)]' : 'bg-[#D5D0CA]'}`} />
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

        </div>

        {/* ━━━ 임신 준비 식단 추천 ━━━ */}
        <AIMealCard mode="preparing" value={0} phase={getCyclePhase()} />

        {/* 푸시 알림 동의 */}
        <PushPrompt message="배란일과 엽산 리마인더를 받아볼까요?" />

        {/* ━━━ 3. 상태 카드 2열 ━━━ */}
        <div className="grid grid-cols-2 gap-2">
          {/* 임신 확률 */}
          {cycle && (() => {
            const isFertile = getCyclePhase() === 'fertile'
            let prob = isFertile ? 30 : getCyclePhase() === 'tww' ? 20 : 10
            if (motherAge > 0 && motherAge <= 29) prob += 5
            else if (motherAge >= 35) prob -= 5
            prob += Math.floor(partnerCount * 1.5) + supplCount
            prob = Math.max(5, Math.min(45, prob))
            return (
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 text-center">
                <p className="text-[13px] text-[#6B6966]">임신 가능성</p>
                <p className="text-[22px] font-bold text-[var(--color-primary)] mt-1">{prob}%</p>
                <div className="w-full h-1.5 bg-[#E8E4DF] rounded-full mt-1.5">
                  <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${prob}%` }} />
                </div>
              </div>
            )
          })()}

          {/* 배란 카운트다운 */}
          {cycle && (() => {
            const today = new Date()
            const ovDay = cycle.ovulationDay
            const diff = Math.ceil((ovDay.getTime() - today.getTime()) / 86400000)
            const phase = getCyclePhase()
            // 배란일 지났으면 다음 주기 배란일 계산
            const nextOvDay = diff < -1 ? addDays(ovDay, cycleLength) : ovDay
            const daysUntil = diff < -1
              ? Math.ceil((nextOvDay.getTime() - today.getTime()) / 86400000)
              : diff
            const ovDateStr = (daysUntil > 0 ? nextOvDay : ovDay).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

            let label = ''
            let valueText = ''
            let valueColor = '#6B6966'

            if (phase === 'ovulation' || daysUntil === 0) {
              label = '오늘 배란일!'
              valueText = 'TODAY'
              valueColor = '#E85D4A'
            } else if (daysUntil > 0 && daysUntil <= 5) {
              label = '배란 예정'
              valueText = `D-${daysUntil}`
              valueColor = 'var(--color-primary)'
            } else if (daysUntil > 5) {
              label = '배란 예정'
              valueText = `D-${daysUntil}`
              valueColor = 'var(--color-primary)'
            } else {
              // 배란 지남 (TWW)
              label = '다음 배란'
              valueText = `D-${Math.max(0, daysUntil + cycleLength)}`
              valueColor = '#6B6966'
            }

            return (
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 text-center">
                <p className="text-[13px] text-[#6B6966]">{label}</p>
                <p className="text-[22px] font-bold mt-1" style={{ color: valueColor }}>{valueText}</p>
                <p className="text-[12px] text-[#9E9A95] mt-1">{ovDateStr}</p>
              </div>
            )
          })()}
        </div>
        {/* 배우자·검사·식단 → 우리 탭으로 이동 완료 */}

        {/* 스트릭·더보기 섹션 → 우리 탭으로 이동 완료 */}
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-[#1A1918]/80 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-lg animate-[fadeIn_0.15s_ease-out]">
          {toast}
        </div>
      )}

      {showGuide && <SpotlightGuide mode="preparing" onComplete={() => { localStorage.setItem('dodam_guide_preparing', '1'); setShowGuide(false) }} />}
    </div>
  )
}
