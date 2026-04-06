'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRemoteContent } from '@/lib/useRemoteContent'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { upsertProfile, getProfile } from '@/lib/supabase/userProfile'
import { shareAIAdvice, shareProgress, sharePartnerNudge } from '@/lib/kakao/share'
import { fetchUserRecords } from '@/lib/supabase/userRecord'
import { fetchPrepRecords, upsertPrepRecord } from '@/lib/supabase/prepRecord'
import { SparkleIcon, PenIcon, PillIcon, HospitalIcon, BanIcon, ActivityIcon, WalkIcon, FootstepsIcon, YogaIcon, HeartFilledIcon, MoonIcon, WaterGlassIcon, MusicIcon, BookOpenIcon, CompassIcon, SproutIcon, DropletIcon, SunIcon, OmegaIcon, MoodHappyIcon, MoodCalmIcon, MoodAnxiousIcon, MoodTiredIcon } from '@/components/ui/Icons'
import TodayRecordSection from '@/components/ui/TodayRecordSection'
import MissionCard from '@/components/ui/MissionCard'
import PushPrompt from '@/components/push/PushPrompt'
import PageSkeleton from '@/components/ui/PageSkeleton'

// Lazy load below-the-fold and modal components
const AIMealCard = dynamic(() => import('@/components/ai-cards/AIMealCard'), { ssr: true })
const SpotlightGuide = dynamic(() => import('@/components/onboarding/SpotlightGuide'), { ssr: false })

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


const DEFAULT_APPOINTMENTS = [
  { id: 'basic', title: '기본 혈액검사', priority: 'high', desc: '빈혈 · 갑상선 · 간기능 · 혈당 · 혈액형', where: '산부인과 또는 보건소 (무료)', why: '임신 전 몸 상태 확인. 빈혈이 있으면 임신이 어려울 수 있어요' },
  { id: 'rubella', title: '풍진 항체검사', priority: 'high', desc: '풍진 면역 여부 확인', where: '산부인과 또는 보건소 (무료)', why: '임신 중 풍진 감염 시 태아 기형 위험. 항체 없으면 접종 후 1개월 피임 필요' },
  { id: 'amh', title: 'AMH 검사', priority: 'high', desc: '난소 기능 · 잔여 난자 수 예측', where: '산부인과 (유료 5~10만원)', why: '35세 이상 필수. 난소 나이를 확인해 임신 계획에 도움' },
  { id: 'dental', title: '치과 검진', priority: 'medium', desc: '충치 · 잇몸 치료', where: '치과', why: '임신 중 치과 치료 제한됨. 미리 치료해야 해요' },
  { id: 'pap', title: '자궁경부암 검사', priority: 'medium', desc: '자궁경부 세포 검사', where: '산부인과 또는 보건소 (만 20세+ 무료)', why: '2년 이내 미실시 시 필수' },
  { id: 'std', title: '성병 검사', priority: 'medium', desc: '클라미디아 · 매독 · HIV', where: '산부인과 또는 보건소', why: '무증상 감염도 있어 임신 전 확인 필요' },
  { id: 'genetic', title: '유전 상담', priority: 'low', desc: '유전 질환 가족력 확인', where: '대학병원 유전 상담 센터', why: '가족 중 유전 질환이 있을 경우 상담 권장' },
  { id: 'sperm', title: '정액 검사', priority: 'low', desc: '정자 수 · 운동성 · 형태', where: '비뇨기과 또는 난임 클리닉', why: '6개월 이상 임신 안 될 때. 남성 요인이 40%' },
]


// ===== 생년월일 선택 (년/월/일 셀렉트박스) =====
const CURRENT_YEAR = new Date().getFullYear()
function BirthDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = value ? new Date(value + 'T00:00:00') : null
  const [yr, setYr] = useState(parsed ? String(parsed.getFullYear()) : '')
  const [mo, setMo] = useState(parsed ? String(parsed.getMonth() + 1) : '')
  const [dy, setDy] = useState(parsed ? String(parsed.getDate()) : '')

  const emit = (y: string, m: string, d: string) => {
    if (y && m && d) {
      onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
    }
  }

  const daysInMonth = yr && mo ? new Date(Number(yr), Number(mo), 0).getDate() : 31

  const selectClass = 'flex-1 h-12 rounded-xl border border-[#E8E4DF] bg-white px-2 text-center text-body-emphasis appearance-none cursor-pointer'

  return (
    <div className="flex gap-2">
      <select
        value={yr}
        onChange={(e) => { setYr(e.target.value); emit(e.target.value, mo, dy) }}
        className={`${selectClass} ${!yr ? 'text-[#C0B8B0]' : ''}`}
      >
        <option value="" disabled>년도</option>
        {Array.from({ length: CURRENT_YEAR - 15 - 1959 }, (_, i) => CURRENT_YEAR - 15 - i).map(y => (
          <option key={y} value={String(y)}>{y}년</option>
        ))}
      </select>
      <select
        value={mo}
        onChange={(e) => { setMo(e.target.value); emit(yr, e.target.value, dy) }}
        className={`${selectClass} ${!mo ? 'text-[#C0B8B0]' : ''}`}
      >
        <option value="" disabled>월</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
          <option key={m} value={String(m)}>{m}월</option>
        ))}
      </select>
      <select
        value={dy}
        onChange={(e) => { setDy(e.target.value); emit(yr, mo, e.target.value) }}
        className={`${selectClass} ${!dy ? 'text-[#C0B8B0]' : ''}`}
      >
        <option value="" disabled>일</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
          <option key={d} value={String(d)}>{d}일</option>
        ))}
      </select>
    </div>
  )
}

// ===== AI 디스플레이 — 요약 + 상세 항목 =====
function AITypingDisplay({ briefing, onRefresh, onShare }: { briefing: any; onRefresh: () => void; onShare: () => void }) {
  return (
    <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shrink-0 shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
          <span className="font-bold" style={{ fontSize: 14, color: '#FFFFFF' }}>AI</span>
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
                <span className="text-subtitle text-primary leading-snug">{headline}</span>
                {rest && <span className="text-body-emphasis text-[#4A4744] leading-relaxed"> {rest}</span>}
              </div>
            )
          })()}

          {/* 상세 항목 */}
          {[
            { icon: '💡', label: '오늘의 조언', text: briefing.mainAdvice },
            { icon: '🔄', label: '주기 인사이트', text: briefing.cycleInsight },
            { icon: '💛', label: '마음 케어', text: briefing.emotionalCare },
            { icon: '🥗', label: '영양 팁', text: briefing.nutritionTip },
            { icon: '👫', label: '파트너 팁', text: briefing.partnerTip },
          ].filter(s => s.text).length > 0 && (
            <div className="mt-3 space-y-2.5">
              {[
                { icon: '💡', label: '오늘의 조언', text: briefing.mainAdvice },
                { icon: '🔄', label: '주기 인사이트', text: briefing.cycleInsight },
                { icon: '💛', label: '마음 케어', text: briefing.emotionalCare },
                { icon: '🥗', label: '영양 팁', text: briefing.nutritionTip },
                { icon: '👫', label: '파트너 팁', text: briefing.partnerTip },
              ].filter(s => s.text).map(s => (
                <div key={s.label} className="bg-[var(--color-page-bg)] rounded-lg px-3 py-2.5">
                  <p className="text-caption font-bold text-secondary mb-1">{s.icon} {s.label}</p>
                  <p className="text-body-emphasis text-primary leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={onRefresh}
              className="px-3 py-2 rounded-lg font-medium text-secondary bg-[var(--color-page-bg)] active:bg-[#E8E4DF] transition-colors"
              style={{ fontSize: 13 }}>
              다시 받기
            </button>
            <button onClick={onShare}
              className="px-3 py-2 rounded-lg font-semibold text-[var(--color-primary)] bg-[var(--color-primary-bg)] active:opacity-80 transition-opacity"
              style={{ fontSize: 13 }}>
              공유
            </button>
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
          <p className="text-body-emphasis text-primary">{phaseKo[phase] || phase} 맞춤 식단</p>
          <p className="text-body text-tertiary">AI 오늘의 식단 추천받기</p>
        </div>
      </button>
    )
  }
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-2.5">
        <div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
        <p className="text-body text-secondary">AI가 {phaseKo[phase] || ''} 맞춤 식단을 추천 중...</p>
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
          <p className="text-body-emphasis text-primary">{phaseKo[phase] || phase} · 오늘의 식단</p>
          <p className="text-body text-secondary truncate">{meal.breakfast?.menu} · {meal.lunch?.menu}</p>
        </div>
        <span className="text-caption text-tertiary">{expanded ? '접기' : '펼치기'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {[{ label: '아침', data: meal.breakfast }, { label: '점심', data: meal.lunch }, { label: '저녁', data: meal.dinner }, { label: '간식', data: meal.snack }].map(m => m.data && (
            <div key={m.label} className="p-2.5 rounded-lg bg-[var(--color-page-bg)]">
              <p className="text-caption font-semibold text-secondary">{m.label}</p>
              <p className="text-body font-medium text-primary mt-0.5">{m.data.menu}</p>
              <p className="text-label text-tertiary">{m.data.reason}</p>
            </div>
          ))}
          {meal.keyNutrient && <p className="text-caption text-[var(--color-primary)] font-medium px-1">핵심 영양소: {meal.keyNutrient}</p>}
          <button onClick={fetchMeal} className="w-full py-1.5 text-label text-secondary bg-[var(--color-page-bg)] rounded-lg active:bg-[#E8E4DF]">다른 식단</button>
        </div>
      )}
    </div>
  )
}

export default function PreparingPage() {
  const router = useRouter()

  // 모드별 리디렉트: preparing 모드가 아닌데 /preparing 에 접근하면 해당 모드 홈으로
  useEffect(() => {
    const mode = localStorage.getItem('dodam_mode')
    if (mode === 'parenting') { router.replace('/'); return }
    if (mode === 'pregnant') { router.replace('/pregnant'); return }
  }, [router])

  const apptList = useRemoteContent('preparing_appointments', DEFAULT_APPOINTMENTS)
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); haptic(); setTimeout(() => setToast(null), 2000) }
  const [showGuide, setShowGuide] = useState(false)
  const [foodQuery, setFoodQuery] = useState('')

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  useEffect(() => {
    createClient().auth.getUser().then(({ data }: any) => {
      setAvatarUrl(data.user?.user_metadata?.avatar_url || null)
    })
  }, [])

  const [lastPeriod, setLastPeriod] = useState<string>('')
  const [cycleLength, setCycleLength] = useState<number>(28)
  // localStorage로 세팅 완료 캐시 — 재방문·앱 재실행 시 세팅 페이지 깜빡임 방지
  const [editingCycle, setEditingCycle] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('dodam_prep_setup_done') === '1') return false
    return null
  })
  useEffect(() => {
    const cachedDone = localStorage.getItem('dodam_prep_setup_done') === '1'
    getProfile().then(p => {
      // my_role이 저장됐으면 세팅 완료로 간주 (dad는 last_period 없어도 됨)
      if (p?.my_role || p?.last_period) { setEditingCycle(false); localStorage.setItem('dodam_prep_setup_done', '1') }
      else if (!cachedDone) setEditingCycle(true)
      if (p?.last_period) setLastPeriod(p.last_period)
      if (p?.cycle_length) setCycleLength(p.cycle_length)
      if (p?.mother_birth) { setMotherBirth(p.mother_birth); setTempMotherBirth(p.mother_birth) }
      if (p?.father_birth) { setFatherBirth(p.father_birth); setTempFatherBirth(p.father_birth) }
      if (p?.my_role) setMyRole(p.my_role as 'mom' | 'dad')
    })
  }, [])
  // 주기 설정 완료 후에만 가이드 표시 (editingCycle === false, localStorage + DB 이중 확인)
  useEffect(() => {
    if (editingCycle !== false) return
    if (localStorage.getItem('dodam_guide_preparing') === '1') return
    getProfile().then(p => {
      if (p?.tutorial_preparing) {
        localStorage.setItem('dodam_guide_preparing', '1')
      } else {
        setTimeout(() => setShowGuide(true), 1000)
      }
    }).catch(() => {})
  }, [editingCycle])
  const SUPPL_DEFAULT: Record<string, number> = { folic: 0, vitd: 0, iron: 0, omega3: 0 }
  const [supplements, setSupplements] = useState<Record<string, number>>({ ...SUPPL_DEFAULT })
  const [todayMood, setTodayMood] = useState<string>('')
  const [motherBirth, setMotherBirth] = useState<string>('')
  const [fatherBirth, setFatherBirth] = useState<string>('')
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
  const [partnerChecks, setPartnerChecks] = useState<Record<string, boolean>>({})
  const [appointments, setAppointments] = useState<Record<string, string>>({})
  const _td = new Date()
  const today = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`

  // 임신 준비 FAB 오늘 기록
  const [prepTodayDone, setPrepTodayDone] = useState<string[]>([])
  const [prepTodayTsMap, setPrepTodayTsMap] = useState<Record<string, string>>({})
  useEffect(() => {
    // DB에서 오늘 기록 로드
    const loadFromDB = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('prep_events')
          .select('type, tags, created_at')
          .eq('user_id', user.id)
          .eq('recorded_date', today)
        if (data && data.length > 0) {
          let types = Array.from(new Set(data.map((e: any) => e.type))) as string[]
          // prep_mood_happy 등 구체적 기분이 있으면 일반 prep_mood 제거 (중복 칩 방지)
          const hasSpecificMood = types.some(t => t.startsWith('prep_mood_'))
          if (hasSpecificMood) types = types.filter(t => t !== 'prep_mood')
          setPrepTodayDone(types)
          // 타임스탬프 맵 구성
          const tsMap: Record<string, string> = {}
          data.forEach((e: any) => {
            if (e.created_at && !tsMap[e.type]) tsMap[e.type] = e.created_at
            if (e.tags?.duration) tsMap[`${e.type}_duration`] = String(e.tags.duration)
          })
          setPrepTodayTsMap(tsMap)
          // 기분 복원
          const moodRow = data.find((e: any) =>
            e.type === 'prep_mood' || e.type?.startsWith('prep_mood_'))
          if (moodRow?.tags && (moodRow.tags as any).mood) {
            setTodayMood((moodRow.tags as any).mood)
          }
        }
      } catch { /* 오프라인 시 빈 상태 유지 */ }
    }
    loadFromDB()

    // BottomNav가 DB 저장 완료 후 발송하는 이벤트 수신 → 상태 동기화
    const addRecord = (type: string) => {
      const now = new Date().toISOString()
      setPrepTodayDone(prev => prev.includes(type) ? prev : [...prev, type])
      setPrepTodayTsMap(prev => prev[type] ? prev : { ...prev, [type]: now })
    }
    const prepDoneHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any
      const type: string = detail.type
      if (!type?.startsWith('prep_')) return
      if (type.startsWith('prep_mood_')) {
        if (detail.mood) saveMood(detail.mood)
        addRecord(type)
        return
      }
      addRecord(type)
    }
    // dodam-record 이벤트 처리 (FAB에서 기록 완료 시) — UI 상태만 업데이트, DB는 BottomNav가 처리
    const recordHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any
      const type = detail.type as string

      if (type?.startsWith('prep_')) {
        detail._handled = true
        // prep_mood는 BottomNav가 prep_mood_{mood} 이벤트를 별도 발송하므로 여기서 무시 (중복 칩 방지)
        if (type === 'prep_mood') return
        addRecord(type)
      }
    }
    window.addEventListener('dodam-prep-done', prepDoneHandler)
    window.addEventListener('dodam-record', recordHandler)
    return () => {
      window.removeEventListener('dodam-prep-done', prepDoneHandler)
      window.removeEventListener('dodam-record', recordHandler)
    }
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const fetchAIBriefing = async (force = false) => {
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
      let todayHealth: Record<string, unknown> = {}
      try {
        const healthRows = await fetchUserRecords(['health_records'])
        if (healthRows.length) {
          const healthMap = healthRows[0].value as Record<string, Record<string, unknown>>
          todayHealth = healthMap[today] || {}
        }
      } catch { /* */ }
      const res = await fetch('/api/ai-preparing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily', cycleDay: cycle?.cycleDay ?? 0, cycleLength, phase: getCyclePhase(),
          motherAge, fatherAge, mood: todayMood,
          supplements: supplCount,
          exercise: prepTodayDone.filter(k => ['prep_walk', 'prep_stretch', 'prep_breath', 'prep_meditate', 'prep_music'].includes(k)),
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

  // History is now derived from prep_records in DB — no separate storage needed
  const saveHistory = (_type: string, _value: any) => {
    // No-op: supplement/mood data is already persisted via upsertPrepRecord calls
  }

  // 핸들러
  const SUPPL_NAMES: Record<string, string> = { folic: '엽산', vitd: '비타민D', iron: '철분', omega3: '오메가3' }
  const SUPPL_MAX = 1 // 하루 1회 토글
  const toggleSupplement = (key: string) => {
    const today = new Date().toISOString().split('T')[0]
    const current = supplements[key] || 0
    const nextVal = current >= SUPPL_MAX ? 0 : 1 // 0↔1 토글
    const next = { ...supplements, [key]: nextVal }
    setSupplements(next)
    upsertPrepRecord(today, 'supplement', next).catch(() => {})
    const totalDone = Object.values(next).reduce((s, v) => s + v, 0)
    saveHistory('suppl', totalDone)
    const name = SUPPL_NAMES[key] || key
    if (nextVal === 0) showToast(`${name} 취소`)
    else showToast(`${name} 복용 완료!`)
  }
  const saveMood = (mood: string) => {
    const _d = new Date(); const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`
    setTodayMood(mood)
    upsertPrepRecord(today, 'mood', { mood, ts: new Date().toISOString() }).catch(() => {})
    saveHistory('mood', mood)
    showToast('오늘 기분이 기록됐어요')
  }
  const togglePartnerCheck = (key: string) => {
    const next = { ...partnerChecks, [key]: !partnerChecks[key] }
    setPartnerChecks(next)
    const _d = new Date(); const _today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`
    upsertPrepRecord(_today, 'partner_checks', next).catch(() => {})
    showToast(next[key] ? '체크 완료!' : '체크 취소')
  }
  const toggleAppointment = (id: string) => {
    const next = { ...appointments }
    const isNew = !next[id]
    if (next[id]) delete next[id]; else next[id] = new Date().toISOString().split('T')[0]
    setAppointments(next)
    const _d2 = new Date(); const _today2 = `${_d2.getFullYear()}-${String(_d2.getMonth()+1).padStart(2,'0')}-${String(_d2.getDate()).padStart(2,'0')}`
    upsertPrepRecord(_today2, 'appointments', next).catch(() => {})
    showToast(isNew ? '검사 완료 기록됨' : '검사 기록 취소')
  }
  // 주기 설정 저장
  const [tempPeriod, setTempPeriod] = useState(lastPeriod)
  const [tempCycleLen, setTempCycleLen] = useState(cycleLength)
  const [tempMotherBirth, setTempMotherBirth] = useState(motherBirth)
  const [tempFatherBirth, setTempFatherBirth] = useState(fatherBirth)
  const [myRole, setMyRole] = useState<'mom' | 'dad'>('mom')
  useEffect(() => {
    const todayKey = new Date().toISOString().split('T')[0]
    // Load mood + supplement + partner_checks + appointments from Supabase DB
    fetchPrepRecords(['mood', 'supplement', 'partner_checks', 'appointments']).then(rows => {
      const todayMoodRow = rows.find(r => r.type === 'mood' && r.record_date === todayKey)
      if (todayMoodRow?.value) {
        const v = todayMoodRow.value as { mood?: string }
        if (v.mood) setTodayMood(v.mood)
      }
      const todaySupplRow = rows.find(r => r.type === 'supplement' && r.record_date === todayKey)
      if (todaySupplRow?.value) {
        const parsed = todaySupplRow.value as Record<string, unknown>
        const migrated: Record<string, number> = { folic: 0, vitd: 0, iron: 0, omega3: 0 }
        for (const [k, v] of Object.entries(parsed)) {
          migrated[k] = typeof v === 'boolean' ? (v ? 1 : 0) : (v as number)
        }
        setSupplements(migrated)
      }
      const pcRow = rows.find(r => r.type === 'partner_checks')
      if (pcRow?.value) setPartnerChecks(pcRow.value as Record<string, boolean>)
      const apRow = rows.find(r => r.type === 'appointments')
      if (apRow?.value) setAppointments(apRow.value as Record<string, string>)
    }).catch(() => { /* offline — keep defaults */ })
  }, [])

  const handleSaveCycleSetup = () => {
    // mom: tempPeriod 필수, dad: myBirth 필수
    if (myRole === 'mom' && !tempPeriod) return
    if (myRole === 'dad') {
      const myBirth = tempFatherBirth
      if (!myBirth) return
    }
    if (tempPeriod) setLastPeriod(tempPeriod)
    setCycleLength(tempCycleLen)
    if (tempMotherBirth) setMotherBirth(tempMotherBirth)
    if (tempFatherBirth) setFatherBirth(tempFatherBirth)
    upsertProfile({
      my_role: myRole,
      last_period: tempPeriod || null,
      cycle_length: tempCycleLen,
      mother_birth: tempMotherBirth || null,
      father_birth: tempFatherBirth || null,
    })
    // 기다림 페이지에서 DB 지연 없이 즉시 주기 반영
    if (tempPeriod) localStorage.setItem('dodam_last_period', tempPeriod)
    localStorage.setItem('dodam_cycle_length', String(tempCycleLen))
    localStorage.setItem('dodam_prep_setup_done', '1')
    setEditingCycle(false)
  }

  // 주기 설정 화면
  if (editingCycle === null) {
    return <PageSkeleton variant="preparing" />
  }
  if (editingCycle) {
    const myBirth = myRole === 'mom' ? tempMotherBirth : tempFatherBirth
    const partnerBirth = myRole === 'mom' ? tempFatherBirth : tempMotherBirth
    const myAge = calcAge(myBirth)
    const partnerAge = calcAge(partnerBirth)
    const setMyBirth = (v: string) => { if (myRole === 'mom') setTempMotherBirth(v); else setTempFatherBirth(v) }
    const setPartnerBirth = (v: string) => { if (myRole === 'mom') setTempFatherBirth(v); else setTempMotherBirth(v) }

    return (
      <div className="fixed inset-0 z-[80] bg-white overflow-y-auto">
        <div data-guide="cycle-setup" className="max-w-lg mx-auto pt-14 pb-12 px-6">
          <h1 className="text-heading-2 font-bold text-primary mb-1">기본 정보</h1>
          <p className="text-body text-secondary mb-6">맞춤 조언을 위해 필요해요</p>

          {/* 나는 누구? */}
          <div className="mb-5">
            <p className="text-body-emphasis text-secondary mb-2">나는</p>
            <div className="flex gap-2">
              <button onClick={() => setMyRole('mom')}
                className={`flex-1 py-3 rounded-xl font-semibold ${myRole === 'mom' ? 'bg-[var(--color-primary)] font-bold' : 'bg-[var(--color-page-bg)] text-[var(--color-text-secondary)]'}`}
                style={myRole === 'mom' ? { fontSize: 'var(--text-md)', color: '#FFFFFF', fontWeight: 700 } : { fontSize: 'var(--text-md)' }}>
                예비맘
              </button>
              <button onClick={() => setMyRole('dad')}
                className={`flex-1 py-3 rounded-xl font-semibold ${myRole === 'dad' ? 'bg-[var(--color-primary)] font-bold' : 'bg-[var(--color-page-bg)] text-[var(--color-text-secondary)]'}`}
                style={myRole === 'dad' ? { fontSize: 'var(--text-md)', color: '#FFFFFF', fontWeight: 700 } : { fontSize: 'var(--text-md)' }}>
                예비파파
              </button>
            </div>
          </div>

          {/* 내 생년월일 */}
          <div className="mb-5">
            <p className="text-body-emphasis text-secondary mb-1">내 생년월일 {myAge > 0 ? <span className="text-[var(--color-primary)] font-bold">{myAge}세</span> : null}</p>
            <BirthDatePicker value={myBirth} onChange={setMyBirth} />
          </div>

          {/* 생리 주기 (예비맘만) */}
          {myRole === 'mom' && (
            <>
              <div className="mb-5">
                <p className="text-body-emphasis text-secondary mb-1">마지막 생리 시작일</p>
                {/* iOS: input을 absolute로 전체 영역에 투명하게 깔아서 터치 영역 확보 */}
                <div className="relative h-12 rounded-xl border border-[#E8E4DF] overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                    <span className={tempPeriod ? 'text-body-emphasis text-primary' : 'text-body-emphasis text-[#C0B8B0]'}>
                      {tempPeriod || '연도. 월. 일.'}
                    </span>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke="#C0B8B0" strokeWidth="1.5"/><path d="M7 2v4M13 2v4M3 9h14" stroke="#C0B8B0" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <input
                    type="date"
                    value={tempPeriod}
                    onChange={(e) => setTempPeriod(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div className="mb-5">
                <p className="text-body-emphasis text-secondary mb-1">평균 주기 <span className="text-[var(--color-primary)] font-bold">{tempCycleLen}일</span></p>
                <input type="range" min={21} max={40} value={tempCycleLen} onChange={(e) => setTempCycleLen(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
                <div className="flex justify-between text-body text-tertiary"><span>21일</span><span>28일</span><span>40일</span></div>
              </div>
            </>
          )}

          {/* 예비파파는 아내 초대 유도 */}
          {myRole === 'dad' && !tempPeriod && (
            <div className="mb-5 bg-[#F0F9F4] rounded-xl p-4 text-center">
              <p className="text-body font-semibold text-[var(--color-primary)] mb-1">아내를 초대하세요</p>
              <p className="text-body text-secondary mb-3">아내가 생리 주기를 입력하면 더 정확한 조언을 받을 수 있어요</p>
              <a href="/settings/caregivers/invite" className="inline-block px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl">아내 초대하기</a>
            </div>
          )}

          <button
            onClick={handleSaveCycleSetup}
            disabled={myRole === 'mom' ? !tempPeriod : !myBirth}
            className={`w-full py-3 rounded-xl ${(myRole === 'mom' ? tempPeriod : myBirth) ? 'bg-[var(--color-primary)] font-bold active:opacity-80' : 'bg-[#E8E4DF] text-tertiary'}`}
            style={(myRole === 'mom' ? tempPeriod : myBirth) ? { fontSize: 15, color: '#FFFFFF', fontWeight: 700 } : { fontSize: 15 }}
          >
            완료
          </button>
        </div>
      </div>
    )
  }

  const supplKeys = ['prep_folic', 'prep_vitd', 'prep_iron', 'prep_omega3']
  const supplCount = prepTodayDone.filter(k => supplKeys.includes(k)).length
  const partnerCount = Object.values(partnerChecks).filter(Boolean).length
  const apptCount = apptList.filter(a => appointments[a.id]).length
  const dpo = cycle ? Math.floor((Date.now() - cycle.ovulationDay.getTime()) / 86400000) : -99
  const showTWW = dpo >= 0 && dpo <= 16

  return (
    <div className="bg-[var(--color-page-bg)]">
      {/* 헤더는 GlobalHeader (layout.tsx)에서 처리 */}

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-24 space-y-3">

        {/* ━━━ 1. AI 데일리 케어 — 육아 모드 스타일 ━━━ */}
          <div data-guide="ai-briefing" className="dodam-card-accent bg-gradient-to-br from-white via-[var(--color-primary-bg)] to-[var(--color-primary-bg)] border border-white/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SparkleIcon className="w-4 h-4 text-[var(--color-primary)]" />
                <p className="text-body-emphasis font-bold text-primary">AI 데일리 케어</p>
              </div>
              {aiBriefing?.todayScore && (
                <div className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] flex items-center gap-1">
                  <span className="font-bold" style={{ fontSize: 14, color: '#FFFFFF' }}>{aiBriefing.todayScore}점</span>
                </div>
              )}
            </div>

            {/* 오늘 요약 */}
            {(() => {
              const MOOD_LABELS: Record<string, string> = { happy: '행복', excited: '설렘', calm: '평온', anxious: '걱정', tired: '피곤', sad: '슬픔' }
              const exerciseCount = prepTodayDone.filter(k => ['prep_walk', 'prep_stretch', 'prep_breath', 'prep_meditate', 'prep_music'].includes(k)).length
              return (
                <div className="flex gap-2 mb-3">
                  {[
                    { label: '기분', value: todayMood ? (MOOD_LABELS[todayMood] ?? todayMood) : '-', Icon: HeartFilledIcon, colorClass: 'text-pink-400', bgClass: 'bg-pink-50' },
                    { label: '영양제', value: `${supplCount}개`, Icon: PillIcon, colorClass: 'text-green-500', bgClass: 'bg-green-50' },
                    { label: '운동', value: `${exerciseCount}회`, Icon: WalkIcon, colorClass: 'text-amber-500', bgClass: 'bg-amber-50' },
                  ].map(s => (
                    <div key={s.label} className="flex-1 bg-white/80 rounded-lg py-2 text-center border border-white shadow-sm">
                      <div className="flex items-center justify-center gap-1">
                        <s.Icon className={`w-4 h-4 ${s.colorClass}`} />
                        <p className={`text-body-emphasis font-bold ${s.colorClass}`}>{s.value}</p>
                      </div>
                      <p className="text-body text-tertiary">{s.label}</p>
                    </div>
                  ))}
                </div>
              )
            })()}

            {aiError && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
                <p className="text-body text-red-600">{aiError}</p>
              </div>
            )}

            {aiLoading ? (
              <div className="bg-white/80 rounded-xl p-4 border border-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                    <span className="font-bold" style={{ fontSize: 14, color: '#FFFFFF' }}>AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                    <p className="text-body text-tertiary">AI가 분석 중이예요...</p>
                  </div>
                </div>
              </div>
            ) : aiBriefing ? (
              <AITypingDisplay briefing={aiBriefing} onRefresh={() => fetchAIBriefing(true)} onShare={() => shareAIAdvice(aiBriefing.summary || aiBriefing.greeting || '', aiBriefing.mainAdvice, getCyclePhase())} />
            ) : (
              <button
                onClick={() => fetchAIBriefing()}
                className="w-full py-3 bg-[var(--color-primary)] rounded-xl active:opacity-80 transition-opacity"
                style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 700 }}
              >
                AI 케어받기
              </button>
            )}

            {/* 착상 기다리는 중 인라인 */}
            {showTWW && (
              <div className="mt-3 pt-3 border-t border-white/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-body-emphasis text-primary">착상 기다리는 중 D+{dpo}</p>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-body font-bold text-[var(--color-primary)]">
                    {Math.round((dpo / 14) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((dpo / 14) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-label text-tertiary mt-1.5 text-center">14일 중 {dpo}일째</p>
              </div>
            )}
          </div>

        {/* ━━━ 오늘 기록 (FAB) ━━━ */}
        {(() => {
          const PREP_CFG: Record<string, { cat: string; label: string; Icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
            prep_folic:      { cat: '영양제', label: '엽산',        Icon: SproutIcon,    color: '#10B981', bg: '#E8F5EF' },
            prep_vitd:       { cat: '영양제', label: '비타민D',     Icon: SunIcon,       color: '#10B981', bg: '#E8F5EF' },
            prep_iron:       { cat: '영양제', label: '철분',        Icon: DropletIcon,   color: '#10B981', bg: '#E8F5EF' },
            prep_omega3:     { cat: '영양제', label: '오메가3',     Icon: OmegaIcon,     color: '#10B981', bg: '#E8F5EF' },
            prep_walk:       { cat: '건강',   label: '걷기',        Icon: FootstepsIcon, color: '#F59E0B', bg: '#FEF3E0' },
            prep_stretch:    { cat: '건강',   label: '스트레칭',    Icon: YogaIcon,      color: '#F59E0B', bg: '#FEF3E0' },
            prep_breath:     { cat: '건강',   label: '심호흡',      Icon: ActivityIcon,  color: '#F59E0B', bg: '#FEF3E0' },
            prep_meditate:   { cat: '건강',   label: '명상',        Icon: MoonIcon,      color: '#F59E0B', bg: '#FEF3E0' },
            prep_music:      { cat: '건강',   label: '음악감상',    Icon: MusicIcon,     color: '#F59E0B', bg: '#FEF3E0' },
            prep_mood:         { cat: '기분', label: '기록',  Icon: HeartFilledIcon, color: '#F472B6', bg: '#FFE4F2' }, // 구버전 호환
            prep_mood_happy:   { cat: '기분', label: '행복',  Icon: MoodHappyIcon,   color: '#F472B6', bg: '#FFE4F2' },
            prep_mood_excited: { cat: '기분', label: '설렘',  Icon: MoodHappyIcon,   color: '#F472B6', bg: '#FFE4F2' },
            prep_mood_calm:    { cat: '기분', label: '평온',  Icon: MoodCalmIcon,    color: '#F472B6', bg: '#FFE4F2' },
            prep_mood_tired:   { cat: '기분', label: '피곤',  Icon: MoodTiredIcon,   color: '#F472B6', bg: '#FFE4F2' },
            prep_mood_anxious: { cat: '기분', label: '불안',  Icon: MoodAnxiousIcon, color: '#F472B6', bg: '#FFE4F2' },
            prep_journal:      { cat: '기다림', label: '일기 작성', Icon: BookOpenIcon, color: '#A78BFA', bg: '#EDE9FF' },
          }
          const todayTsMap = prepTodayTsMap
          const fmt = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
          const sortedDone = [...prepTodayDone].sort((a, b) => {
            const ta = todayTsMap[a] ? new Date(todayTsMap[a]).getTime() : 0
            const tb = todayTsMap[b] ? new Date(todayTsMap[b]).getTime() : 0
            return tb - ta
          })
          const eventList = prepTodayDone.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto overflow-x-hidden hide-scrollbar">
              {sortedDone.map(type => {
                const cfg = PREP_CFG[type]
                if (!cfg) return null
                const time = fmt(todayTsMap[type])
                return (
                  <div key={type} className="flex items-center gap-2.5 py-2 border-b border-[#F0EDE8] last:border-0">
                    <span className="text-caption text-tertiary w-10 shrink-0 text-right font-mono">{time || '—'}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                      <cfg.Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-body text-primary flex-1 min-w-0 truncate">
                      {cfg.cat && <span className="text-tertiary font-normal mr-1">{cfg.cat}</span>}
                      <span className="font-bold">{cfg.label}</span>
                      {(() => {
                        const dur = todayTsMap[`${type}_duration`]
                        if (!dur) return null
                        const secs = parseInt(dur, 10)
                        if (isNaN(secs) || secs <= 0) return null
                        const mm = Math.floor(secs / 60)
                        const ss = secs % 60
                        return <span className="text-tertiary font-normal ml-1">({mm}분 {String(ss).padStart(2, '0')}초)</span>
                      })()}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null
          const headerRight = (
            <Link href={`/prep-records/${today}`}>
              <span className="text-body text-[var(--color-primary)] font-medium">전체보기 →</span>
            </Link>
          )
          return (
            <TodayRecordSection
              count={prepTodayDone.length}
              emptyMessage="영양제, 운동, 기다림 일기를 기록해보세요"
              headerRight={headerRight}
              footer={eventList}
            />
          )
        })()}

        {/* ━━━ 임신 준비 식단 추천 ━━━ */}
        <AIMealCard mode="preparing" value={0} phase={getCyclePhase()} />

        {/* 음식 물어보기 */}
        {(() => {
          const FOOD_SAMPLES: Record<string, string[]> = {
            fertile: ['연어 먹어도 되나요?', '아보카도 먹어도 되나요?', '석류 먹어도 되나요?', '굴 먹어도 되나요?', '시금치 먹어도 되나요?'],
            ovulation: ['참나물 먹어도 되나요?', '호두 먹어도 되나요?', '브로콜리 먹어도 되나요?', '블루베리 먹어도 되나요?'],
            tww: ['파인애플 먹어도 되나요?', '고구마 먹어도 되나요?', '카페인 먹어도 되나요?', '회 먹어도 되나요?'],
            period: ['미역국 먹어도 되나요?', '당귀차 먹어도 되나요?', '초콜릿 먹어도 되나요?', '시래기 먹어도 되나요?'],
            follicular: ['콩나물 먹어도 되나요?', '달걀 먹어도 되나요?', '아몬드 먹어도 되나요?', '닭가슴살 먹어도 되나요?'],
            unknown: ['참나물 먹어도 되나요?', '연어 먹어도 되나요?', '아보카도 먹어도 되나요?'],
          }
          const phase = getCyclePhase()
          const samples = FOOD_SAMPLES[phase] || FOOD_SAMPLES.unknown
          const dayIdx = new Date().getDate() % samples.length
          const placeholder = samples[dayIdx]
          return (
        <form onSubmit={e => { e.preventDefault(); if (foodQuery.trim()) router.push(`/food-check?q=${encodeURIComponent(foodQuery.trim())}`) }}
          className="flex items-center gap-2 bg-white rounded-xl border border-[#E8E4DF] p-2.5">
          <div className="w-8 h-8 rounded-full bg-[#FFF8F3] flex items-center justify-center shrink-0">
            <span className="text-subtitle">🍽️</span>
          </div>
          <input
            type="text"
            value={foodQuery}
            onChange={e => setFoodQuery(e.target.value)}
            placeholder={placeholder}
            maxLength={100}
            className="flex-1 text-body bg-transparent outline-none text-primary placeholder:text-tertiary"
          />
          {foodQuery.trim() ? (
            <button type="submit" className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] font-bold active:opacity-80" style={{ fontSize: 13, color: '#FFFFFF' }}>확인</button>
          ) : (
            <span className="shrink-0 px-2.5 py-1 rounded-lg bg-[var(--color-primary)]" style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 700 }}>AI 확인</span>
          )}
        </form>
          )
        })()}

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
                <p className="text-body text-secondary">임신 가능성</p>
                <p className="text-heading-2 font-bold mt-1" style={{ color: 'var(--color-primary)' }}>{prob}%</p>
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
                <p className="text-body text-secondary">{label}</p>
                <p className="text-heading-2 font-bold mt-1" style={{ color: valueColor }}>{valueText}</p>
                <p className="text-caption text-tertiary mt-1">{ovDateStr}</p>
              </div>
            )
          })()}
        </div>

        {/* 부부 미션 카드 */}
        <MissionCard mode="preparing" />

        {/* 심심풀이 */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[#E8E4DF]">
          {([
            { href: '/fortune', Icon: ActivityIcon, title: '바이오리듬' },
            { href: '/fortune?tab=zodiac', Icon: CompassIcon, title: '띠 · 별자리' },
            { href: '/fortune?tab=fortune', Icon: SparkleIcon, title: '오늘의 운세' },
          ] as const).map((item) => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-1.5 py-3 px-2 active:bg-[var(--color-page-bg)]">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-page-bg)]">
                <item.Icon className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <p className="text-caption font-semibold text-primary text-center leading-tight">{item.title}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#1A1A1A] px-5 py-2.5 rounded-xl text-body font-bold shadow-[0_8px_30px_rgba(0,0,0,0.3)] max-w-[320px] text-center" style={{ color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {toast}
          </div>
        </div>
      )}

      {showGuide && <SpotlightGuide mode="preparing" onComplete={() => { localStorage.setItem('dodam_guide_preparing', '1'); upsertProfile({ tutorial_preparing: true }); setShowGuide(false) }} />}

    </div>
  </div>
  )
}

