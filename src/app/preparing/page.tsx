'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { shareAIAdvice, shareProgress, sharePartnerNudge } from '@/lib/kakao/share'
import StreakCard from '@/components/engagement/StreakCard'
import CommunityTeaser from '@/components/engagement/CommunityTeaser'

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
  { icon: '🥬', name: '엽산 식품', items: '시금치 · 브로콜리 · 아보카도' },
  { icon: '🐟', name: '오메가3', items: '연어 · 고등어 · 호두' },
  { icon: '🥩', name: '철분', items: '소고기 · 두부 · 렌틸콩' },
  { icon: '🫐', name: '항산화', items: '블루베리 · 토마토 · 석류' },
]
const BAD_FOODS = [
  { icon: '☕', name: '카페인', desc: '하루 1잔 이하' },
  { icon: '🍺', name: '알코올', desc: '완전 금주' },
  { icon: '🐟', name: '고수은 생선', desc: '참치(큰것) · 황새치' },
]

const APPOINTMENTS = [
  { id: 'basic', title: '🩸 기본 혈액검사', priority: 'high', desc: '빈혈 · 갑상선 · 간기능 · 혈당 · 혈액형', where: '산부인과 또는 보건소 (무료)', why: '임신 전 몸 상태 확인. 빈혈이 있으면 임신이 어려울 수 있어요' },
  { id: 'rubella', title: '💉 풍진 항체검사', priority: 'high', desc: '풍진 면역 여부 확인', where: '산부인과 또는 보건소 (무료)', why: '임신 중 풍진 감염 시 태아 기형 위험. 항체 없으면 접종 후 1개월 피임 필요' },
  { id: 'amh', title: '🔬 AMH 검사', priority: 'high', desc: '난소 기능 · 잔여 난자 수 예측', where: '산부인과 (유료 5~10만원)', why: '35세 이상 필수. 난소 나이를 확인해 임신 계획에 도움' },
  { id: 'dental', title: '🦷 치과 검진', priority: 'medium', desc: '충치 · 잇몸 치료', where: '치과', why: '임신 중 치과 치료 제한됨. 미리 치료해야 해요' },
  { id: 'pap', title: '🏥 자궁경부암 검사', priority: 'medium', desc: '자궁경부 세포 검사', where: '산부인과 또는 보건소 (만 20세+ 무료)', why: '2년 이내 미실시 시 필수' },
  { id: 'std', title: '🧪 성병 검사', priority: 'medium', desc: '클라미디아 · 매독 · HIV', where: '산부인과 또는 보건소', why: '무증상 감염도 있어 임신 전 확인 필요' },
  { id: 'genetic', title: '🧬 유전 상담', priority: 'low', desc: '유전 질환 가족력 확인', where: '대학병원 유전 상담 센터', why: '가족 중 유전 질환이 있을 경우 상담 권장' },
  { id: 'sperm', title: '🔎 정액 검사', priority: 'low', desc: '정자 수 · 운동성 · 형태', where: '비뇨기과 또는 난임 클리닉', why: '6개월 이상 임신 안 될 때. 남성 요인이 40%' },
]

const STRESS_TIPS = [
  { icon: '🧘', title: '4-7-8 호흡법', desc: '4초 들숨 → 7초 멈춤 → 8초 날숨' },
  { icon: '🚶‍♀️', title: '산책 명상', desc: '15분 걷기 + 자연 소리' },
  { icon: '📝', title: '감사 일기', desc: '매일 3가지 감사한 것' },
  { icon: '🎵', title: '음악 테라피', desc: '편안한 음악 20분' },
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
        <div className="w-6 h-6 rounded-full bg-[#3D8A5A] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] text-white font-bold">AI</span>
        </div>
        <div className="flex-1">
          {/* 요약 (항상 보임) — 핵심 2-3줄 */}
          <p className="text-[12px] text-[#1A1918] leading-relaxed whitespace-pre-line">{briefing.summary || briefing.greeting}</p>

          {/* 펼친 후: 전체 */}
          {expanded && (
            <div className="mt-2 space-y-2 bg-white/60 rounded-lg p-2.5">
              <p className="text-[12px] text-[#1A1918] leading-relaxed">{briefing.mainAdvice}</p>
              {briefing.cycleInsight && <p className="text-[11px] text-[#6B6966]">🔄 {briefing.cycleInsight}</p>}
              {briefing.emotionalCare && <p className="text-[11px] text-[#6B6966]">💚 {briefing.emotionalCare}</p>}
              {briefing.nutritionTip && <p className="text-[11px] text-[#6B6966]">🥗 {briefing.nutritionTip}</p>}
              {briefing.partnerTip && <p className="text-[11px] text-[#6B6966]">💑 {briefing.partnerTip}</p>}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-[#3D8A5A] font-semibold">
              {expanded ? '접기 ▲' : '자세히 보기 ▼'}
            </button>
            <button onClick={onRefresh} className="text-[10px] text-[#9E9A95]">다시 받기</button>
            <button onClick={onShare} className="text-[10px] text-[#3D8A5A]">공유</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PreparingPage() {
  const [lastPeriod, setLastPeriod] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_last_period') || ''
    return ''
  })
  const [cycleLength, setCycleLength] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('dodam_cycle_length')) || 28
    return 28
  })
  const [editingCycle, setEditingCycle] = useState(!lastPeriod)
  const [supplements, setSupplements] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0]
      const s = localStorage.getItem(`dodam_suppl_${today}`); return s ? JSON.parse(s) : {}
    }
    return {}
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

  // 히스토리 저장 유틸
  const saveHistory = (type: 'mood' | 'suppl', value: any) => {
    const key = `dodam_${type}_history`
    const history = JSON.parse(localStorage.getItem(key) || '[]')
    const today = new Date().toISOString().split('T')[0]
    const existing = history.findIndex((h: any) => h.date === today)
    if (existing >= 0) history[existing] = { date: today, value }
    else history.unshift({ date: today, value })
    localStorage.setItem(key, JSON.stringify(history.slice(0, 90))) // 90일 보관
  }

  // 핸들러
  const toggleSupplement = (key: string) => {
    const today = new Date().toISOString().split('T')[0]
    const next = { ...supplements, [key]: !supplements[key] }
    setSupplements(next); localStorage.setItem(`dodam_suppl_${today}`, JSON.stringify(next))
    // 히스토리 저장
    saveHistory('suppl', Object.values(next).filter(Boolean).length)
  }
  const saveMood = (mood: string) => {
    const today = new Date().toISOString().split('T')[0]
    setTodayMood(mood); localStorage.setItem(`dodam_mood_${today}`, mood)
    saveHistory('mood', mood)
  }
  const togglePartnerCheck = (key: string) => {
    const next = { ...partnerChecks, [key]: !partnerChecks[key] }
    setPartnerChecks(next); localStorage.setItem('dodam_partner_checks', JSON.stringify(next))
  }
  const toggleAppointment = (id: string) => {
    const next = { ...appointments }
    if (next[id]) delete next[id]; else next[id] = new Date().toISOString().split('T')[0]
    setAppointments(next); localStorage.setItem('dodam_appointments', JSON.stringify(next))
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
        <div className="max-w-xs mx-auto pt-12 pb-20 px-6">
          <h1 className="text-[22px] font-bold text-[#1A1918] mb-1">기본 정보</h1>
          <p className="text-[13px] text-[#6B6966] mb-6">맞춤 조언을 위해 필요해요</p>

          {/* 나는 누구? */}
          <div className="mb-5">
            <p className="text-[12px] font-semibold text-[#6B6966] mb-2">나는</p>
            <div className="flex gap-2">
              <button onClick={() => setMyRole('mom')}
                className={`flex-1 py-3 rounded-xl text-[14px] font-semibold ${myRole === 'mom' ? 'bg-[#3D8A5A] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                🤰 예비맘
              </button>
              <button onClick={() => setMyRole('dad')}
                className={`flex-1 py-3 rounded-xl text-[14px] font-semibold ${myRole === 'dad' ? 'bg-[#3D8A5A] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                👨 예비파파
              </button>
            </div>
          </div>

          {/* 내 생년월일 */}
          <div className="mb-5">
            <p className="text-[12px] font-semibold text-[#6B6966] mb-1">내 생년월일 {myAge > 0 && <span className="text-[#3D8A5A] font-bold">{myAge}세</span>}</p>
            <BirthDatePicker value={myBirth} onChange={setMyBirth} />
          </div>

          {/* 생리 주기 (예비맘만) */}
          {myRole === 'mom' && (
            <>
              <div className="mb-5">
                <p className="text-[12px] font-semibold text-[#6B6966] mb-1">마지막 생리 시작일</p>
                <input type="date" value={tempPeriod} onChange={(e) => setTempPeriod(e.target.value)} className="w-full h-12 rounded-xl border border-[#E8E4DF] px-4 text-[14px]" />
              </div>
              <div className="mb-5">
                <p className="text-[12px] font-semibold text-[#6B6966] mb-1">평균 주기 <span className="text-[#3D8A5A] font-bold">{tempCycleLen}일</span></p>
                <input type="range" min={21} max={40} value={tempCycleLen} onChange={(e) => setTempCycleLen(Number(e.target.value))} className="w-full accent-[#3D8A5A]" />
                <div className="flex justify-between text-[9px] text-[#9E9A95]"><span>21일</span><span>28일</span><span>40일</span></div>
              </div>
            </>
          )}

          {/* 예비파파는 아내 초대 유도 */}
          {myRole === 'dad' && !tempPeriod && (
            <div className="mb-5 bg-[#F0F9F4] rounded-xl p-4 text-center">
              <p className="text-[13px] font-semibold text-[#3D8A5A] mb-1">아내를 초대하세요</p>
              <p className="text-[11px] text-[#6B6966] mb-3">아내가 생리 주기를 입력하면 더 정확한 조언을 받을 수 있어요</p>
              <a href="/settings/caregivers/invite" className="inline-block px-4 py-2 bg-[#3D8A5A] text-white text-[12px] font-semibold rounded-xl">💌 아내 초대하기</a>
            </div>
          )}

          <button
            onClick={handleSaveCycleSetup}
            disabled={myRole === 'mom' ? !tempPeriod : !myBirth}
            className={`w-full py-3 rounded-xl text-[14px] font-semibold ${(myRole === 'mom' ? tempPeriod : myBirth) ? 'bg-[#3D8A5A] text-white active:opacity-80' : 'bg-[#E8E4DF] text-[#9E9A95]'}`}
          >
            완료
          </button>
        </div>
      </div>
    )
  }

  const supplCount = Object.values(supplements).filter(Boolean).length
  const partnerCount = Object.values(partnerChecks).filter(Boolean).length
  const apptCount = APPOINTMENTS.filter(a => appointments[a.id]).length
  const dpo = cycle ? Math.floor((Date.now() - cycle.ovulationDay.getTime()) / 86400000) : -99
  const showTWW = dpo >= 0 && dpo <= 16

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5]">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-[#E8E4DF]/60">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <div>
            <p className="text-[12px] text-[#6B6966]">임신 준비 · {phaseLabel[getCyclePhase()]}</p>
            <p className="text-[16px] font-bold text-[#1A1918]">{cycle ? `주기 ${cycle.cycleDay}일차` : '주기 설정'}</p>
          </div>
          <button onClick={() => setEditingCycle(true)} className="text-[11px] text-[#6B6966]">수정</button>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">

        {/* ━━━ 1. AI 히어로 — CTA 형태 ━━━ */}
        {cycle && (
          <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[#C8F0D8] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">✨</span>
                <p className="text-[14px] font-bold text-[#1A1918]">오늘의 AI 케어</p>
              </div>
              {aiBriefing?.todayScore ? (
                <div className="w-8 h-8 rounded-full bg-[#3D8A5A] flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white">{aiBriefing.todayScore}</span>
                </div>
              ) : null}
            </div>

            {aiError && (
              <div className="bg-[#FFF0E6] rounded-lg p-2 mb-2">
                <p className="text-[11px] text-[#D08068]">{aiError}</p>
              </div>
            )}

            {aiLoading ? (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[#3D8A5A] flex items-center justify-center"><span className="text-[10px] text-white">AI</span></div>
                  <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-[#3D8A5A] rounded-full animate-bounce" style={{ animationDelay: '0s' }} /><span className="w-1.5 h-1.5 bg-[#3D8A5A] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} /><span className="w-1.5 h-1.5 bg-[#3D8A5A] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} /></div>
                </div>
              </div>
            ) : aiBriefing ? (
              <AITypingDisplay briefing={aiBriefing} onRefresh={() => fetchAIBriefing(true)} onShare={() => shareAIAdvice(aiBriefing.summary || aiBriefing.greeting || '', aiBriefing.mainAdvice, getCyclePhase())} />
            ) : (
              <div className="text-center py-3">
                <p className="text-[13px] text-[#1A1918] mb-2">오늘의 맞춤 조언을 받아보세요</p>
                <button onClick={() => fetchAIBriefing()} className="px-6 py-2.5 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl active:opacity-80 shadow-[0_2px_12px_rgba(61,138,90,0.3)]">
                  ✨ AI 조언 받기
                </button>
              </div>
            )}

            {/* 착상 기다리는 중 인라인 */}
            {showTWW && (
              <div className="mt-3 pt-3 border-t border-[#C8F0D8]/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-semibold text-[#1A1918]">🤞 착상 기다리는 중 D+{dpo}</p>
                  <p className="text-[10px] text-[#3D8A5A]">{Math.round((dpo / 14) * 100)}%</p>
                </div>
                <div className="w-full h-1.5 bg-white/50 rounded-full">
                  <div className="h-full bg-[#3D8A5A] rounded-full" style={{ width: `${Math.min((dpo / 14) * 100, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ━━━ 2. 오늘 할 일 ━━━ */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-3">오늘 할 일</p>

          {/* 영양제 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[12px] font-semibold text-[#6B6966]">영양제 {supplCount}/4</p>
            </div>
            <div className="flex gap-1.5">
              {[
                { key: 'folic', name: '엽산' },
                { key: 'vitd', name: '비타민D' },
                { key: 'iron', name: '철분' },
                { key: 'omega3', name: '오메가3' },
              ].map((s) => (
                <button key={s.key} onClick={() => toggleSupplement(s.key)}
                  className={`flex-1 py-2 rounded-lg text-center text-[11px] font-medium ${supplements[s.key] ? 'bg-[#3D8A5A] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                  {supplements[s.key] ? '✓ ' : ''}{s.name}
                </button>
              ))}
            </div>
          </div>

          {/* 감정 */}
          <div>
            <p className="text-[12px] font-semibold text-[#6B6966] mb-1.5">오늘 기분</p>
            <div className="flex gap-1.5">
              {[
                { emoji: '😊', key: 'hopeful', msg: '희망찬 하루! 그 마음이 좋은 에너지가 돼요 ✨' },
                { emoji: '😌', key: 'calm', msg: '평온한 마음, 아이에게도 전해질 거예요 🌿' },
                { emoji: '😰', key: 'anxious', msg: '괜찮아요. 불안한 건 그만큼 간절하기 때문이에요 💚' },
                { emoji: '😢', key: 'tired', msg: '지친 날도 있는 거예요. 오늘은 푹 쉬세요 🫂' },
                { emoji: '🥰', key: 'excited', msg: '설레는 마음, 그대로 간직하세요! 좋은 일이 올 거예요 💕' },
              ].map((m) => (
                <button key={m.key} onClick={() => saveMood(m.key)}
                  className={`flex-1 py-1.5 rounded-lg text-center text-lg ${todayMood === m.key ? 'bg-[#3D8A5A] ring-2 ring-[#3D8A5A]/30' : 'bg-[#FFF9F5]'}`}>
                  {m.emoji}
                </button>
              ))}
            </div>
            {todayMood && (
              <p className="text-[11px] text-[#3D8A5A] mt-2 text-center animate-[fadeIn_0.3s]">
                {({ hopeful: '희망찬 하루! 그 마음이 좋은 에너지가 돼요 ✨', calm: '평온한 마음, 아이에게도 전해질 거예요 🌿', anxious: '괜찮아요. 불안한 건 그만큼 간절하기 때문이에요 💚', tired: '지친 날도 있는 거예요. 오늘은 푹 쉬세요 🫂', excited: '설레는 마음, 그대로 간직하세요! 💕' } as Record<string, string>)[todayMood]}
              </p>
            )}
            {/* 7일 감정 미니 히스토리 */}
            {(() => {
              const moodEmojis: Record<string, string> = { hopeful: '😊', calm: '😌', anxious: '😰', tired: '😢', excited: '🥰' }
              const history = JSON.parse(localStorage.getItem('dodam_mood_history') || '[]').slice(0, 7)
              if (history.length < 2) return null
              return (
                <div className="flex items-center justify-center gap-1 mt-2">
                  {history.reverse().map((h: any, i: number) => (
                    <div key={i} className="text-center">
                      <span className="text-[12px]">{moodEmojis[h.value] || '·'}</span>
                      <p className="text-[9px] text-[#9E9A95]">{h.date.slice(5)}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>

        {/* ━━━ 3. 상태 카드 3열 ━━━ */}
        <div className="grid grid-cols-3 gap-2">
          {/* 임신 확률 */}
          {cycle && (() => {
            const isFertile = getCyclePhase() === 'fertile'
            let prob = isFertile ? 30 : getCyclePhase() === 'tww' ? 20 : 10
            if (motherAge > 0 && motherAge <= 29) prob += 5
            else if (motherAge >= 35) prob -= 5
            prob += Math.floor(partnerCount * 1.5) + supplCount
            prob = Math.max(5, Math.min(45, prob))
            return (
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-[10px] text-[#6B6966]">🤰 임신 가능성</p>
                <p className="text-[20px] font-bold text-[#3D8A5A] mt-0.5">{prob}%</p>
                <div className="w-full h-1 bg-[#E8E4DF] rounded-full mt-1">
                  <div className="h-full bg-[#3D8A5A] rounded-full" style={{ width: `${prob}%` }} />
                </div>
              </div>
            )
          })()}

          {/* 파트너 건강 */}
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
            <p className="text-[10px] text-[#6B6966]">💑 배우자</p>
            <p className="text-[20px] font-bold text-[#1A1918] mt-0.5">{partnerCount}<span className="text-[12px] text-[#9E9A95]">/6</span></p>
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full ${i < partnerCount ? 'bg-[#3D8A5A]' : 'bg-[#E8E4DF]'}`} />
              ))}
            </div>
          </div>

          {/* 검사 현황 */}
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
            <p className="text-[10px] text-[#6B6966]">🏥 검사</p>
            <p className="text-[20px] font-bold text-[#1A1918] mt-0.5">{apptCount}<span className="text-[12px] text-[#9E9A95]">/8</span></p>
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full ${i < apptCount ? 'bg-[#3D8A5A]' : 'bg-[#E8E4DF]'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* ━━━ 4. AI 오늘 식단 (시간대 맞춤) ━━━ */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[14px] font-bold text-[#1A1918]">🍽️ {new Date().getHours() < 10 ? '아침' : new Date().getHours() < 14 ? '점심' : new Date().getHours() < 18 ? '간식' : '저녁'} 뭐 먹지?</p>
              <p className="text-[10px] text-[#6B6966]">{getCyclePhase() === 'fertile' ? '가임기' : getCyclePhase() === 'tww' ? '기다림' : '준비기'} 맞춤</p>
            </div>
            {aiMeal && <button onClick={() => fetchAIMeal(true)} className="text-[10px] text-[#3D8A5A]">다른 추천</button>}
          </div>
          {aiMeal ? (
            <div className="space-y-2.5">
              {(() => {
                const hour = new Date().getHours()
                const currentMeal = hour < 10 ? 'breakfast' : hour < 14 ? 'lunch' : hour < 18 ? 'snack' : 'dinner'
                return [
                  { key: 'breakfast', label: '아침', icon: '🌅', data: aiMeal.breakfast },
                  { key: 'lunch', label: '점심', icon: '☀️', data: aiMeal.lunch },
                  { key: 'dinner', label: '저녁', icon: '🌙', data: aiMeal.dinner },
                  { key: 'snack', label: '간식', icon: '🍎', data: aiMeal.snack },
                ].map((m) => m.data && (
                  <div key={m.label} className={`rounded-lg ${m.key === currentMeal ? 'bg-[#F0F9F4] -mx-1 px-3 py-2' : 'py-1.5'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{m.icon}</span>
                        <span className={`text-[10px] ${m.key === currentMeal ? 'text-[#3D8A5A] font-bold' : 'text-[#9E9A95]'}`}>{m.label}</span>
                        <p className="text-[13px] font-semibold text-[#1A1918]">{m.data.menu}</p>
                        {m.key === currentMeal && <span className="text-[9px] bg-[#3D8A5A] text-white px-1 rounded">지금</span>}
                      </div>
                      <Link href={`/map?q=${encodeURIComponent((() => {
                        const menu = m.data.menu
                        // 메뉴에서 외식 가능한 키워드 추출
                        if (menu.includes('비빔밥')) return '비빔밥'
                        if (menu.includes('찌개') || menu.includes('된장')) return '한식당'
                        if (menu.includes('샐러드')) return '샐러드 맛집'
                        if (menu.includes('연어') || menu.includes('생선')) return '일식당'
                        if (menu.includes('파스타') || menu.includes('리조또')) return '이탈리안 레스토랑'
                        if (menu.includes('국밥') || menu.includes('탕')) return '국밥집'
                        if (menu.includes('죽')) return '죽집'
                        return menu.replace(/[()（）·]/g, '').split(' ')[0] + ' 맛집'
                      })())}`}
                        className="shrink-0 px-2 py-0.5 rounded-full bg-[#FFF9F5] text-[9px] text-[#3D8A5A] active:opacity-60">📍 식당</Link>
                    </div>
                    <p className="text-[10px] text-[#6B6966] mt-0.5 ml-7">{m.data.reason}</p>
                  </div>
                ))
              })()}
              {aiMeal.keyNutrient && (
                <div className="bg-[#F0F9F4] rounded-lg p-2.5 mt-1">
                  <p className="text-[11px] text-[#3D8A5A]">핵심: <span className="font-semibold">{aiMeal.keyNutrient}</span></p>
                  {aiMeal.avoid && <p className="text-[11px] text-[#D08068] mt-0.5">주의: {aiMeal.avoid}</p>}
                </div>
              )}
            </div>
          ) : (
            <>
              {mealError && <p className="text-[11px] text-[#D08068] mb-2">{mealError}</p>}
              <button onClick={() => fetchAIMeal()} disabled={aiMealLoading} className="w-full py-2.5 text-[13px] font-semibold text-[#3D8A5A] bg-[#F0F9F4] rounded-xl">
                {aiMealLoading ? 'AI가 식단을 준비 중...' : '오늘의 식단 추천받기 🍽️'}
              </button>
            </>
          )}
        </div>

        {/* ━━━ 스트릭 (콤팩트) ━━━ */}
        <StreakCard mode="preparing" />

        {/* ━━━ 5. 더보기 (접이식) ━━━ */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="w-full bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center justify-between"
        >
          <div>
            <p className="text-[13px] font-semibold text-[#1A1918]">더 알아보기</p>
            <p className="text-[10px] text-[#6B6966]">검사 가이드 · 배우자 건강 · 식단 · 마음 관리</p>
          </div>
          <span className={`text-[#9E9A95] text-sm transition-transform ${moreOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {moreOpen && (
          <div className="space-y-3">
            {/* 동네 소식 */}
            <CommunityTeaser />

            {/* 카톡 공유 */}
            <button
              onClick={() => {
                const ltrs = (() => { try { return JSON.parse(localStorage.getItem('dodam_letters') || '[]').length } catch { return 0 } })()
                shareProgress({ letters: ltrs, appointments: apptCount, totalAppointments: 8, supplements: supplCount, partnerChecks: partnerCount, days: cycle?.cycleDay || 0 })
              }}
              className="w-full bg-white rounded-xl border border-[#E8E4DF] p-3 text-center text-[12px] text-[#3D8A5A] font-semibold active:opacity-80"
            >
              📋 준비 현황 카톡으로 공유
            </button>

            {/* 배우자 건강 상세 */}
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-bold text-[#1A1918]">💑 배우자 건강 체크</p>
                <button onClick={() => sharePartnerNudge(partnerCount, 6)} className="text-[10px] text-[#3D8A5A] font-medium">카톡 넛지 보내기</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'p_nosmoking', label: '금연' }, { key: 'p_nodrink', label: '금주' },
                  { key: 'p_vitamin', label: '비타민·아연' }, { key: 'p_checkup', label: '건강검진' },
                  { key: 'p_nosauna', label: '사우나 자제' }, { key: 'p_weight', label: '적정 체중' },
                ].map((item) => (
                  <button key={item.key} onClick={() => togglePartnerCheck(item.key)}
                    className={`py-2 rounded-lg text-[11px] font-medium ${partnerChecks[item.key] ? 'bg-[#3D8A5A] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                    {partnerChecks[item.key] ? '✓ ' : ''}{item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 검사 가이드 */}
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-3">🏥 산전 검사 가이드</p>
              {APPOINTMENTS.filter(a => !(a.id === 'amh' && motherAge > 0 && motherAge < 35)).map((a) => (
                <div key={a.id} className="mb-3 last:mb-0">
                  <button onClick={() => toggleAppointment(a.id)} className="w-full flex items-start gap-2.5 active:bg-[#FFF9F5] rounded-lg -mx-1 px-1 py-1">
                    <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${appointments[a.id] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : a.priority === 'high' ? 'border-[#D08068]' : 'border-[#AEB1B9]'}`}>
                      {appointments[a.id] && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13px] font-semibold ${appointments[a.id] ? 'text-[#9E9A95] line-through' : 'text-[#1A1918]'}`}>{a.title}</span>
                        {a.priority === 'high' && !appointments[a.id] && <span className="text-[9px] px-1 rounded bg-[#FDE8E8] text-[#D08068]">필수</span>}
                      </div>
                      <p className="text-[11px] text-[#6B6966] mt-0.5">{a.desc}</p>
                      <p className="text-[10px] text-[#3D8A5A] mt-0.5">📍 {a.where}</p>
                      <p className="text-[10px] text-[#6B6966] mt-0.5 italic">{a.why}</p>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            {/* 식단 가이드 */}
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">🥗 식단 가이드</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {GOOD_FOODS.map((f) => (
                  <div key={f.name} className="bg-[#F0F9F4] rounded-lg p-2">
                    <p className="text-[11px] font-semibold text-[#1A1918]">{f.icon} {f.name}</p>
                    <p className="text-[9px] text-[#6B6966]">{f.items}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-semibold text-[#D08068] mb-1">피해야 할 것</p>
              {BAD_FOODS.map((f) => (
                <p key={f.name} className="text-[10px] text-[#6B6966]">{f.icon} {f.name} — {f.desc}</p>
              ))}
            </div>

            {/* 스트레스 관리 */}
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">🧘 스트레스 관리</p>
              <div className="grid grid-cols-2 gap-2">
                {STRESS_TIPS.map((t) => (
                  <div key={t.title} className="bg-[#FFF9F5] rounded-lg p-2">
                    <p className="text-sm mb-0.5">{t.icon}</p>
                    <p className="text-[11px] font-semibold text-[#1A1918]">{t.title}</p>
                    <p className="text-[9px] text-[#6B6966]">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
