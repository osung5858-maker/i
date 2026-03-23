'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'

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
  greeting: string; mainAdvice: string; cycleInsight: string
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
  { id: 'basic', title: '🩸 기본 혈액검사', priority: 'high' },
  { id: 'rubella', title: '💉 풍진 항체검사', priority: 'high' },
  { id: 'amh', title: '🔬 AMH 검사', priority: 'high' },
  { id: 'dental', title: '🦷 치과 검진', priority: 'medium' },
  { id: 'pap', title: '🏥 자궁경부암 검사', priority: 'medium' },
  { id: 'std', title: '🧪 성병 검사', priority: 'medium' },
  { id: 'genetic', title: '🧬 유전 상담', priority: 'low' },
  { id: 'sperm', title: '🔎 정액 검사', priority: 'low' },
]

const STRESS_TIPS = [
  { icon: '🧘', title: '4-7-8 호흡법', desc: '4초 들숨 → 7초 멈춤 → 8초 날숨' },
  { icon: '🚶‍♀️', title: '산책 명상', desc: '15분 걷기 + 자연 소리' },
  { icon: '📝', title: '감사 일기', desc: '매일 3가지 감사한 것' },
  { icon: '🎵', title: '음악 테라피', desc: '편안한 음악 20분' },
]

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
  const [motherAge, setMotherAge] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('dodam_mother_age')) || 0
    return 0
  })
  const [fatherAge, setFatherAge] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('dodam_father_age')) || 0
    return 0
  })
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

  const phaseLabel: Record<string, string> = { fertile: '가임기', ovulation: '배란일', tww: '착상 대기', period: '생리 중', follicular: '난포기', unknown: '-' }

  // AI 브리핑
  const [aiError, setAiError] = useState<string | null>(null)

  const fetchAIBriefing = async () => {
    if (!cycle) return
    setAiLoading(true)
    setAiError(null)
    try {
      const healthRaw = localStorage.getItem('dodam_health_records')
      const health = healthRaw ? JSON.parse(healthRaw) : {}
      const todayHealth = health[new Date().toISOString().split('T')[0]]
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
      }
    } catch (e) {
      setAiError(`요청 실패: ${e}`)
    }
    setAiLoading(false)
  }

  const fetchAIMeal = async () => {
    if (!cycle) return
    setAiMealLoading(true)
    try {
      const res = await fetch('/api/ai-preparing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meal', phase: getCyclePhase(), cycleDay: cycle.cycleDay }),
      })
      const data = await res.json()
      if (!data.error) setAiMeal(data)
    } catch { /* */ }
    setAiMealLoading(false)
  }

  useEffect(() => {
    if (cycle && !aiBriefing) {
      fetchAIBriefing()
    }
  }, [!!cycle]) // eslint-disable-line react-hooks/exhaustive-deps

  // 핸들러
  const toggleSupplement = (key: string) => {
    const today = new Date().toISOString().split('T')[0]
    const next = { ...supplements, [key]: !supplements[key] }
    setSupplements(next); localStorage.setItem(`dodam_suppl_${today}`, JSON.stringify(next))
  }
  const saveMood = (mood: string) => {
    const today = new Date().toISOString().split('T')[0]
    setTodayMood(mood); localStorage.setItem(`dodam_mood_${today}`, mood)
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
  const savePeriodStart = (date: string) => {
    setLastPeriod(date); localStorage.setItem('dodam_last_period', date); setEditingCycle(false)
  }
  const saveCycleLength = (len: number) => {
    setCycleLength(len); localStorage.setItem('dodam_cycle_length', String(len))
  }

  // 주기 설정 화면
  if (editingCycle) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
        <h1 className="text-[22px] font-bold text-[#1A1918] mb-2">생리 주기를 알려주세요</h1>
        <p className="text-[13px] text-[#868B94] mb-6">배란일과 가임기를 예측해드릴게요</p>
        <div className="w-full max-w-xs space-y-4">
          <div>
            <p className="text-[12px] font-semibold text-[#868B94] mb-1">마지막 생리 시작일</p>
            <input type="date" defaultValue={lastPeriod} onChange={(e) => e.target.value && savePeriodStart(e.target.value)} className="w-full h-12 rounded-xl border border-[#f0f0f0] px-4 text-[14px]" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#868B94] mb-1">평균 주기 ({cycleLength}일)</p>
            <input type="range" min={21} max={40} value={cycleLength} onChange={(e) => saveCycleLength(Number(e.target.value))} className="w-full accent-[#3D8A5A]" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#868B94] mb-1">엄마 나이</p>
            <input type="number" min={18} max={55} value={motherAge || ''} onChange={(e) => { const v = Number(e.target.value); setMotherAge(v); localStorage.setItem('dodam_mother_age', String(v)) }} placeholder="나이" className="w-full h-12 rounded-xl border border-[#f0f0f0] px-4 text-[14px]" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#868B94] mb-1">아빠 나이</p>
            <input type="number" min={18} max={55} value={fatherAge || ''} onChange={(e) => { const v = Number(e.target.value); setFatherAge(v); localStorage.setItem('dodam_father_age', String(v)) }} placeholder="나이" className="w-full h-12 rounded-xl border border-[#f0f0f0] px-4 text-[14px]" />
          </div>
        </div>
        {lastPeriod && <button onClick={() => setEditingCycle(false)} className="mt-6 text-[13px] text-[#3D8A5A] font-semibold">완료 →</button>}
      </div>
    )
  }

  const supplCount = Object.values(supplements).filter(Boolean).length
  const partnerCount = Object.values(partnerChecks).filter(Boolean).length
  const apptCount = APPOINTMENTS.filter(a => appointments[a.id]).length
  const dpo = cycle ? Math.floor((Date.now() - cycle.ovulationDay.getTime()) / 86400000) : -99
  const showTWW = dpo >= 0 && dpo <= 16

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <div>
            <p className="text-[12px] text-[#868B94]">임신 준비 · {phaseLabel[getCyclePhase()]}</p>
            <p className="text-[16px] font-bold text-[#1A1918]">{cycle ? `주기 ${cycle.cycleDay}일차` : '주기 설정'}</p>
          </div>
          <button onClick={() => setEditingCycle(true)} className="text-[11px] text-[#868B94]">수정</button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28 space-y-3">

        {/* ━━━ 1. AI 히어로 카드 ━━━ */}
        {cycle && (
          <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[#C8F0D8] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">✨</span>
                <p className="text-[14px] font-bold text-[#1A1918]">AI 데일리 케어</p>
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
              <div className="flex items-center justify-center py-4 gap-2">
                <div className="w-4 h-4 border-2 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" />
                <p className="text-[12px] text-[#868B94]">AI가 조언을 준비 중...</p>
              </div>
            ) : aiBriefing ? (
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-[#1A1918]">{aiBriefing.greeting}</p>
                <p className="text-[12px] text-[#1A1918] leading-relaxed bg-white/60 rounded-lg p-2.5">{aiBriefing.mainAdvice}</p>
                {aiBriefing.cycleInsight && <p className="text-[11px] text-[#868B94]">🔄 {aiBriefing.cycleInsight}</p>}
                {aiBriefing.emotionalCare && <p className="text-[11px] text-[#868B94]">💚 {aiBriefing.emotionalCare}</p>}
                <button onClick={fetchAIBriefing} className="text-[10px] text-[#AEB1B9]">새로고침</button>
              </div>
            ) : (
              <button onClick={fetchAIBriefing} className="w-full py-3 text-[12px] text-[#3D8A5A] font-semibold">AI 조언 받기 ✨</button>
            )}

            {/* 투윅웨이트 인라인 */}
            {showTWW && (
              <div className="mt-3 pt-3 border-t border-[#C8F0D8]/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-semibold text-[#1A1918]">🤞 투윅웨이트 D+{dpo}</p>
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
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-3">오늘 할 일</p>

          {/* 영양제 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[12px] font-semibold text-[#868B94]">영양제 {supplCount}/4</p>
            </div>
            <div className="flex gap-1.5">
              {[
                { key: 'folic', name: '엽산' },
                { key: 'vitd', name: '비타민D' },
                { key: 'iron', name: '철분' },
                { key: 'omega3', name: '오메가3' },
              ].map((s) => (
                <button key={s.key} onClick={() => toggleSupplement(s.key)}
                  className={`flex-1 py-2 rounded-lg text-center text-[11px] font-medium ${supplements[s.key] ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                  {supplements[s.key] ? '✓ ' : ''}{s.name}
                </button>
              ))}
            </div>
          </div>

          {/* 감정 */}
          <div>
            <p className="text-[12px] font-semibold text-[#868B94] mb-1.5">오늘 기분</p>
            <div className="flex gap-1.5">
              {[
                { emoji: '😊', key: 'hopeful' },
                { emoji: '😌', key: 'calm' },
                { emoji: '😰', key: 'anxious' },
                { emoji: '😢', key: 'tired' },
                { emoji: '🥰', key: 'excited' },
              ].map((m) => (
                <button key={m.key} onClick={() => saveMood(m.key)}
                  className={`flex-1 py-1.5 rounded-lg text-center text-lg ${todayMood === m.key ? 'bg-[#3D8A5A] ring-2 ring-[#3D8A5A]/30' : 'bg-[#F5F4F1]'}`}>
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ━━━ 3. 빠른 카드 그리드 ━━━ */}
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
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-3">
                <p className="text-[11px] text-[#868B94] mb-1">🎯 이번 주기</p>
                <p className="text-[24px] font-bold text-[#3D8A5A]">{prob}%</p>
                <div className="w-full h-1 bg-[#F0F0F0] rounded-full mt-1">
                  <div className="h-full bg-[#3D8A5A] rounded-full" style={{ width: `${prob}%` }} />
                </div>
                <p className="text-[9px] text-[#AEB1B9] mt-1">예상 확률</p>
              </div>
            )
          })()}

          {/* 파트너 건강 */}
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-3">
            <p className="text-[11px] text-[#868B94] mb-1">💑 파트너</p>
            <p className="text-[24px] font-bold text-[#1A1918]">{partnerCount}<span className="text-[14px] text-[#AEB1B9]">/6</span></p>
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full ${i < partnerCount ? 'bg-[#3D8A5A]' : 'bg-[#F0F0F0]'}`} />
              ))}
            </div>
            <p className="text-[9px] text-[#AEB1B9] mt-1">건강 체크</p>
          </div>

          {/* AI 식단 */}
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-3">
            <p className="text-[11px] text-[#868B94] mb-1">🍽️ 오늘 식단</p>
            {aiMeal ? (
              <>
                <p className="text-[12px] font-semibold text-[#1A1918] line-clamp-1">{aiMeal.breakfast?.menu}</p>
                <p className="text-[10px] text-[#868B94] line-clamp-1">{aiMeal.lunch?.menu}</p>
                <button onClick={fetchAIMeal} className="text-[9px] text-[#3D8A5A] mt-1">다른 추천</button>
              </>
            ) : (
              <button onClick={fetchAIMeal} disabled={aiMealLoading} className="text-[12px] text-[#3D8A5A] font-semibold mt-1">
                {aiMealLoading ? '...' : '추천받기'}
              </button>
            )}
          </div>

          {/* 검사 현황 */}
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-3">
            <p className="text-[11px] text-[#868B94] mb-1">🏥 검사</p>
            <p className="text-[24px] font-bold text-[#1A1918]">{apptCount}<span className="text-[14px] text-[#AEB1B9]">/8</span></p>
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full ${i < apptCount ? 'bg-[#3D8A5A]' : 'bg-[#F0F0F0]'}`} />
              ))}
            </div>
            <p className="text-[9px] text-[#AEB1B9] mt-1">완료</p>
          </div>
        </div>

        {/* ━━━ 4. 더보기 (접이식) ━━━ */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="w-full bg-white rounded-xl border border-[#f0f0f0] p-3 flex items-center justify-between"
        >
          <p className="text-[13px] font-semibold text-[#1A1918]">가이드 · 리마인더 · 스트레스 관리</p>
          <span className={`text-[#AEB1B9] text-sm transition-transform ${moreOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {moreOpen && (
          <div className="space-y-3">
            {/* 파트너 건강 상세 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">💑 파트너 건강 체크</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'p_nosmoking', label: '금연' }, { key: 'p_nodrink', label: '금주' },
                  { key: 'p_vitamin', label: '비타민·아연' }, { key: 'p_checkup', label: '건강검진' },
                  { key: 'p_nosauna', label: '사우나 자제' }, { key: 'p_weight', label: '적정 체중' },
                ].map((item) => (
                  <button key={item.key} onClick={() => togglePartnerCheck(item.key)}
                    className={`py-2 rounded-lg text-[11px] font-medium ${partnerChecks[item.key] ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                    {partnerChecks[item.key] ? '✓ ' : ''}{item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 검사 리마인더 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">🏥 검사 리마인더</p>
              {APPOINTMENTS.filter(a => !(a.id === 'amh' && motherAge > 0 && motherAge < 35)).map((a) => (
                <button key={a.id} onClick={() => toggleAppointment(a.id)} className="w-full flex items-center gap-2 py-1.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${appointments[a.id] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#AEB1B9]'}`}>
                    {appointments[a.id] && <span className="text-white text-[8px]">✓</span>}
                  </div>
                  <span className={`text-[12px] ${appointments[a.id] ? 'text-[#AEB1B9] line-through' : 'text-[#1A1918]'}`}>{a.title}</span>
                  {a.priority === 'high' && !appointments[a.id] && <span className="text-[8px] px-1 rounded bg-[#FDE8E8] text-[#D08068]">필수</span>}
                </button>
              ))}
            </div>

            {/* 식단 가이드 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">🥗 식단 가이드</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {GOOD_FOODS.map((f) => (
                  <div key={f.name} className="bg-[#F0F9F4] rounded-lg p-2">
                    <p className="text-[11px] font-semibold text-[#1A1918]">{f.icon} {f.name}</p>
                    <p className="text-[9px] text-[#868B94]">{f.items}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-semibold text-[#D08068] mb-1">피해야 할 것</p>
              {BAD_FOODS.map((f) => (
                <p key={f.name} className="text-[10px] text-[#868B94]">{f.icon} {f.name} — {f.desc}</p>
              ))}
            </div>

            {/* 스트레스 관리 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">🧘 스트레스 관리</p>
              <div className="grid grid-cols-2 gap-2">
                {STRESS_TIPS.map((t) => (
                  <div key={t.title} className="bg-[#F5F4F1] rounded-lg p-2">
                    <p className="text-sm mb-0.5">{t.icon}</p>
                    <p className="text-[11px] font-semibold text-[#1A1918]">{t.title}</p>
                    <p className="text-[9px] text-[#868B94]">{t.desc}</p>
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
