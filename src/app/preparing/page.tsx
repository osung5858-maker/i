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

// ===== 식단 가이드 =====
const GOOD_FOODS = [
  { icon: '🥬', name: '엽산 식품', items: '시금치 · 브로콜리 · 아스파라거스 · 아보카도', tip: '태아 신경관 발달에 필수' },
  { icon: '🐟', name: '오메가3', items: '연어 · 고등어 · 호두 · 아마씨', tip: '두뇌 발달 + 혈액순환' },
  { icon: '🥩', name: '철분', items: '소고기 · 닭간 · 두부 · 렌틸콩', tip: '빈혈 예방 + 산소 운반' },
  { icon: '🥛', name: '칼슘', items: '우유 · 치즈 · 멸치 · 케일', tip: '뼈 건강 + 호르몬 분비' },
  { icon: '🫐', name: '항산화', items: '블루베리 · 토마토 · 고구마 · 석류', tip: '난자 건강 + 세포 보호' },
]
const BAD_FOODS = [
  { icon: '☕', name: '카페인', desc: '하루 200mg 이하 (커피 1잔)', level: '제한' },
  { icon: '🍺', name: '알코올', desc: '임신 준비 시 완전 금주 권장', level: '금지' },
  { icon: '🐟', name: '고수은 생선', desc: '참치(큰것) · 황새치 · 상어', level: '제한' },
  { icon: '🧀', name: '비살균 유제품', desc: '리스테리아균 감염 위험', level: '금지' },
  { icon: '🍖', name: '가공육', desc: '소시지 · 햄 — 아질산나트륨', level: '제한' },
]

function FoodGuide() {
  const [tab, setTab] = useState<'good' | 'bad'>('good')
  return (
    <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
      <p className="text-[14px] font-bold text-[#1A1918] mb-3">🥗 임신 준비 식단</p>
      <div className="flex gap-1.5 mb-3">
        <button onClick={() => setTab('good')} className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold ${tab === 'good' ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>좋은 음식</button>
        <button onClick={() => setTab('bad')} className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold ${tab === 'bad' ? 'bg-[#D08068] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>피해야 할 음식</button>
      </div>
      {tab === 'good' ? (
        <div className="space-y-2.5">
          {GOOD_FOODS.map((f) => (
            <div key={f.name} className="flex gap-3">
              <span className="text-lg mt-0.5">{f.icon}</span>
              <div>
                <p className="text-[13px] font-semibold text-[#1A1918]">{f.name}</p>
                <p className="text-[11px] text-[#868B94]">{f.items}</p>
                <p className="text-[10px] text-[#3D8A5A] mt-0.5">{f.tip}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {BAD_FOODS.map((f) => (
            <div key={f.name} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{f.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-[#1A1918]">{f.name}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${f.level === '금지' ? 'bg-[#FDE8E8] text-[#D08068]' : 'bg-[#FFF3E0] text-[#E09B4B]'}`}>{f.level}</span>
                </div>
                <p className="text-[11px] text-[#868B94]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== 스트레스 관리 =====
function StressRelief() {
  const [breathing, setBreathing] = useState(false)
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')
  const [count, setCount] = useState(4)
  const [rounds, setRounds] = useState(0)

  useEffect(() => {
    if (!breathing) return
    const timer = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          setPhase((p) => {
            if (p === 'in') return 'hold'
            if (p === 'hold') return 'out'
            setRounds((r) => r + 1)
            return 'in'
          })
          return phase === 'in' ? 7 : phase === 'hold' ? 8 : 4
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [breathing, phase])

  const startBreathing = () => {
    setBreathing(true); setPhase('in'); setCount(4); setRounds(0)
  }
  const stopBreathing = () => {
    setBreathing(false)
  }

  const TIPS = [
    { icon: '🧘', title: '4-7-8 호흡법', desc: '4초 들숨 → 7초 멈춤 → 8초 날숨' },
    { icon: '🚶‍♀️', title: '산책 명상', desc: '15분 걷기 + 자연 소리 집중' },
    { icon: '📝', title: '감사 일기', desc: '매일 3가지 감사한 것 적기' },
    { icon: '🎵', title: '음악 테라피', desc: '편안한 음악 20분 감상' },
    { icon: '🛁', title: '반신욕', desc: '38~40도 물에 15분 (배란 후 주의)' },
    { icon: '🌸', title: '아로마 테라피', desc: '라벤더 · 캐모마일 향 확산' },
  ]

  return (
    <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
      <p className="text-[14px] font-bold text-[#1A1918] mb-3">🧘 스트레스 관리</p>

      {/* 호흡 운동 */}
      <div className="bg-[#F0F9F4] rounded-xl p-4 mb-3 text-center">
        {breathing ? (
          <>
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-2 transition-all duration-1000 ${
              phase === 'in' ? 'bg-[#3D8A5A]/20 scale-110' : phase === 'hold' ? 'bg-[#3D8A5A]/30 scale-100' : 'bg-[#3D8A5A]/10 scale-90'
            }`}>
              <span className="text-[24px] font-bold text-[#3D8A5A]">{count}</span>
            </div>
            <p className="text-[14px] font-semibold text-[#3D8A5A]">
              {phase === 'in' ? '들숨 (4초)' : phase === 'hold' ? '멈춤 (7초)' : '날숨 (8초)'}
            </p>
            <p className="text-[11px] text-[#868B94] mt-1">{rounds}회 완료</p>
            <button onClick={stopBreathing} className="mt-2 text-[12px] text-[#868B94]">중지</button>
          </>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-[#3D8A5A] mb-1">4-7-8 호흡법</p>
            <p className="text-[11px] text-[#6D6C6A] mb-2">스트레스 감소 · 수면 개선 · 혈압 안정</p>
            <button onClick={startBreathing} className="px-4 py-2 bg-[#3D8A5A] text-white text-[12px] font-semibold rounded-xl">시작하기</button>
          </>
        )}
      </div>

      {/* 팁 목록 */}
      <div className="grid grid-cols-2 gap-2">
        {TIPS.map((tip) => (
          <div key={tip.title} className="bg-[#F5F4F1] rounded-xl p-2.5">
            <p className="text-sm mb-0.5">{tip.icon}</p>
            <p className="text-[11px] font-semibold text-[#1A1918]">{tip.title}</p>
            <p className="text-[9px] text-[#868B94]">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== 병원 예약 리마인더 =====
const APPOINTMENTS = [
  { id: 'basic', icon: '🩸', title: '기본 혈액검사', desc: '빈혈 · 갑상선 · 간 기능 · 혈당', when: '준비 시작 즉시', priority: 'high' },
  { id: 'rubella', icon: '💉', title: '풍진 항체검사', desc: '음성 시 접종 후 1개월 피임', when: '준비 시작 즉시', priority: 'high' },
  { id: 'amh', icon: '🔬', title: 'AMH 검사 (난소기능)', desc: '난소 나이 · 잔여 난자 수 예측', when: '35세 이상 필수', priority: 'high' },
  { id: 'dental', icon: '🦷', title: '치과 검진', desc: '임신 중 치료 제한 — 미리 치료', when: '3개월 전', priority: 'medium' },
  { id: 'pap', icon: '🏥', title: '자궁경부암 검사', desc: '2년 이내 미실시 시', when: '준비 시작 즉시', priority: 'medium' },
  { id: 'std', icon: '🧪', title: '성병 검사', desc: '클라미디아 · 매독 · HIV', when: '준비 시작 즉시', priority: 'medium' },
  { id: 'genetic', icon: '🧬', title: '유전 상담', desc: '가족력 있을 경우 권장', when: '해당 시', priority: 'low' },
  { id: 'sperm', icon: '🔎', title: '정액 검사 (파트너)', desc: '정자 수 · 운동성 · 형태', when: '6개월 미임신 시', priority: 'low' },
]

function AppointmentReminder({ motherAge }: { motherAge: number }) {
  const [done, setDone] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_appointments'); return s ? JSON.parse(s) : {}
    }
    return {}
  })

  const toggleDone = (id: string) => {
    const next = { ...done }
    if (next[id]) { delete next[id] } else { next[id] = new Date().toISOString().split('T')[0] }
    setDone(next); localStorage.setItem('dodam_appointments', JSON.stringify(next))
  }

  const filtered = APPOINTMENTS.filter((a) => {
    if (a.id === 'amh' && motherAge > 0 && motherAge < 35) return false
    return true
  })

  const doneCount = filtered.filter((a) => done[a.id]).length

  return (
    <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-[#1A1918]">🏥 검사 리마인더</p>
        <p className="text-[11px] text-[#3D8A5A] font-semibold">{doneCount}/{filtered.length}</p>
      </div>
      <div className="space-y-1">
        {filtered.map((a) => (
          <button key={a.id} onClick={() => toggleDone(a.id)} className="w-full flex items-start gap-3 py-2.5 rounded-lg active:bg-[#F5F4F1]">
            <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${done[a.id] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#AEB1B9]'}`}>
              {done[a.id] && <span className="text-white text-[10px]">✓</span>}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className={`text-[13px] font-medium ${done[a.id] ? 'text-[#AEB1B9] line-through' : 'text-[#1A1918]'}`}>{a.icon} {a.title}</span>
                {a.priority === 'high' && !done[a.id] && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-[#FDE8E8] text-[#D08068] font-semibold">필수</span>
                )}
              </div>
              <p className="text-[10px] text-[#868B94]">{a.desc}</p>
              {done[a.id] ? (
                <p className="text-[9px] text-[#3D8A5A] mt-0.5">완료: {done[a.id]}</p>
              ) : (
                <p className="text-[9px] text-[#AEB1B9] mt-0.5">{a.when}</p>
              )}
            </div>
          </button>
        ))}
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

  const cycle = useMemo(() => {
    if (!lastPeriod) return null
    return getCycleInfo(lastPeriod, cycleLength)
  }, [lastPeriod, cycleLength])

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
  const savePeriodStart = (date: string) => {
    setLastPeriod(date); localStorage.setItem('dodam_last_period', date); setEditingCycle(false)
  }
  const saveCycleLength = (len: number) => {
    setCycleLength(len); localStorage.setItem('dodam_cycle_length', String(len))
  }

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
            <input type="number" min={18} max={55} value={motherAge || ''} onChange={(e) => { const v = Number(e.target.value); setMotherAge(v); localStorage.setItem('dodam_mother_age', String(v)) }} placeholder="나이 입력" className="w-full h-12 rounded-xl border border-[#f0f0f0] px-4 text-[14px]" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#868B94] mb-1">아빠 나이</p>
            <input type="number" min={18} max={55} value={fatherAge || ''} onChange={(e) => { const v = Number(e.target.value); setFatherAge(v); localStorage.setItem('dodam_father_age', String(v)) }} placeholder="나이 입력" className="w-full h-12 rounded-xl border border-[#f0f0f0] px-4 text-[14px]" />
          </div>
        </div>
        {lastPeriod && <button onClick={() => setEditingCycle(false)} className="mt-6 text-[13px] text-[#3D8A5A] font-semibold">완료 →</button>}
      </div>
    )
  }

  const twwTips = [
    '너무 이른 시기예요. 평소처럼 지내세요.',
    '착상이 시작되는 시기. 무리하지 마세요.',
    '착상이 진행 중일 수 있어요. 따뜻한 차 한 잔.',
    '카페인을 줄이고 충분히 쉬세요.',
    '조급해하지 않아도 돼요. 자신을 돌보세요.',
    '좋아하는 일에 집중해보세요.',
    '빠르면 테스트 가능. 서두르지 않아도 괜찮아요.',
    '생리 예정일이 다가오고 있어요.',
  ]

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <div>
            <p className="text-[12px] text-[#868B94]">임신 준비</p>
            <p className="text-[16px] font-bold text-[#1A1918]">{cycle ? `주기 ${cycle.cycleDay}일차` : '주기 설정'}</p>
          </div>
          <button onClick={() => setEditingCycle(true)} className="text-[11px] text-[#868B94]">주기 수정</button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28 space-y-3">

        {/* AI 케어 */}
        {cycle && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">✨</span>
              <p className="text-[14px] font-bold text-[#1A1918]">AI 케어</p>
            </div>
            {(() => {
              const today = new Date()
              const dpo = Math.floor((today.getTime() - cycle.ovulationDay.getTime()) / 86400000)
              if (today >= cycle.fertileStart && today <= cycle.fertileEnd) {
                return <p className="text-[13px] text-[#1A1918]">지금은 <span className="text-[#3D8A5A] font-semibold">가임기</span>예요.</p>
              }
              if (dpo >= 0 && dpo <= 14) {
                return <p className="text-[13px] text-[#1A1918]">배란 후 {dpo}일차. {twwTips[Math.min(Math.floor(dpo / 2), twwTips.length - 1)]}</p>
              }
              const daysToNext = Math.ceil((cycle.nextPeriod.getTime() - today.getTime()) / 86400000)
              return <p className="text-[13px] text-[#1A1918]">다음 생리까지 <span className="font-semibold">{daysToNext}일</span>. 컨디션 관리 잘 하고 있어요.</p>
            })()}
            {motherAge > 0 && (
              <p className="text-[12px] text-[#868B94] mt-2">
                {motherAge <= 29 && '시간적 여유가 있어요. 건강한 생활습관에 집중하세요 🌿'}
                {motherAge >= 30 && motherAge <= 34 && '최적의 시기예요. 기본 검사를 미리 받아두세요 ✨'}
                {motherAge >= 35 && motherAge <= 39 && '고령 임신 검사를 미리 받아보세요. AMH 검사를 권장해요 🏥'}
                {motherAge >= 40 && '난임 전문의 상담을 권장해요. 시간이 중요한 시기예요 💪'}
              </p>
            )}
            {fatherAge >= 40 && (
              <p className="text-[12px] text-[#868B94] mt-1">파트너도 정자 건강 검사를 받아보세요</p>
            )}
          </div>
        )}

        {/* 투윅웨이트 프로그레스 */}
        {cycle && (() => {
          const dpo = Math.floor((Date.now() - cycle.ovulationDay.getTime()) / 86400000)
          if (dpo < 0 || dpo > 16) return null
          return (
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[14px] font-bold text-[#1A1918]">🤞 투윅웨이트</p>
                <p className="text-[12px] font-semibold text-[#3D8A5A]">D+{dpo}</p>
              </div>
              <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full">
                <div className="h-full bg-[#3D8A5A] rounded-full" style={{ width: `${Math.min((dpo / 14) * 100, 100)}%` }} />
              </div>
            </div>
          )
        })()}

        {/* 영양제 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex justify-between mb-2">
            <p className="text-[14px] font-bold text-[#1A1918]">오늘의 영양제</p>
            <p className="text-[11px] text-[#3D8A5A] font-semibold">{Object.values(supplements).filter(Boolean).length}/4</p>
          </div>
          {[
            { key: 'folic', name: '엽산 400μg', time: '아침' },
            { key: 'vitd', name: '비타민D', time: '아침' },
            { key: 'iron', name: '철분', time: '점심' },
            { key: 'omega3', name: '오메가3', time: '저녁' },
          ].map((s) => (
            <button key={s.key} onClick={() => toggleSupplement(s.key)} className="w-full flex items-center gap-3 py-2 rounded-lg active:bg-[#F5F4F1]">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${supplements[s.key] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#AEB1B9]'}`}>
                {supplements[s.key] && <span className="text-white text-[10px]">✓</span>}
              </div>
              <span className={`text-[13px] flex-1 text-left ${supplements[s.key] ? 'text-[#AEB1B9] line-through' : 'text-[#1A1918]'}`}>{s.name}</span>
              <span className="text-[10px] text-[#AEB1B9]">{s.time}</span>
            </button>
          ))}
        </div>

        {/* 감정 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-3">오늘 기분은?</p>
          <div className="flex gap-2">
            {[
              { emoji: '😊', label: '희망적', key: 'hopeful' },
              { emoji: '😌', label: '평온', key: 'calm' },
              { emoji: '😰', label: '불안', key: 'anxious' },
              { emoji: '😢', label: '지침', key: 'tired' },
              { emoji: '🥰', label: '설렘', key: 'excited' },
            ].map((m) => (
              <button key={m.key} onClick={() => saveMood(m.key)} className={`flex-1 py-2 rounded-xl text-center ${todayMood === m.key ? 'bg-[#3D8A5A]' : 'bg-[#F5F4F1]'}`}>
                <p className="text-lg">{m.emoji}</p>
                <p className={`text-[9px] mt-0.5 ${todayMood === m.key ? 'text-white font-semibold' : 'text-[#868B94]'}`}>{m.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 파트너 건강 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-2">파트너 건강</p>
          {[
            { key: 'p_nosmoking', label: '금연' },
            { key: 'p_nodrink', label: '금주' },
            { key: 'p_vitamin', label: '비타민·아연' },
            { key: 'p_checkup', label: '건강검진' },
            { key: 'p_nosauna', label: '사우나 자제' },
            { key: 'p_weight', label: '적정 체중' },
          ].map((item) => (
            <button key={item.key} onClick={() => togglePartnerCheck(item.key)} className="w-full flex items-center gap-3 py-2.5 rounded-lg active:bg-[#F5F4F1]">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${partnerChecks[item.key] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#AEB1B9]'}`}>
                {partnerChecks[item.key] && <span className="text-white text-[10px]">✓</span>}
              </div>
              <span className={`text-[13px] ${partnerChecks[item.key] ? 'text-[#AEB1B9] line-through' : 'text-[#1A1918]'}`}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* 임신 확률 계산기 */}
        {cycle && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🎯</span>
              <p className="text-[14px] font-bold text-[#1A1918]">이번 주기 임신 확률</p>
            </div>
            {(() => {
              const today = new Date()
              const dpo = Math.floor((today.getTime() - cycle.ovulationDay.getTime()) / 86400000)
              const isFertile = today >= cycle.fertileStart && today <= cycle.fertileEnd

              // 기본 확률 (주기 위치 기반)
              let baseProb = 10
              if (isFertile) {
                const daysToOv = Math.floor((cycle.ovulationDay.getTime() - today.getTime()) / 86400000)
                if (daysToOv === 0) baseProb = 33
                else if (daysToOv === 1) baseProb = 30
                else if (daysToOv === -1) baseProb = 28
                else if (daysToOv === 2) baseProb = 22
                else baseProb = 15
              } else if (dpo >= 0 && dpo <= 14) {
                baseProb = 20 // 대기 중
              }

              // 나이 보정
              let ageAdj = 0
              if (motherAge > 0) {
                if (motherAge <= 29) ageAdj = 5
                else if (motherAge <= 34) ageAdj = 0
                else if (motherAge <= 37) ageAdj = -5
                else if (motherAge <= 39) ageAdj = -10
                else ageAdj = -15
              }

              // 생활습관 보정
              const habitScore = Object.values(partnerChecks).filter(Boolean).length
              const habitAdj = Math.floor(habitScore * 1.5)
              const supplScore = Object.values(supplements).filter(Boolean).length
              const supplAdj = Math.floor(supplScore * 1)

              const prob = Math.max(5, Math.min(45, baseProb + ageAdj + habitAdj + supplAdj))

              return (
                <>
                  <div className="flex items-end gap-3 mb-3">
                    <p className="text-[32px] font-bold text-[#3D8A5A]">{prob}%</p>
                    <p className="text-[12px] text-[#868B94] mb-1">예상 확률</p>
                  </div>
                  <div className="w-full h-2 bg-[#F0F0F0] rounded-full mb-3">
                    <div className="h-full bg-[#3D8A5A] rounded-full transition-all" style={{ width: `${prob}%` }} />
                  </div>
                  <div className="space-y-1">
                    {isFertile && <p className="text-[11px] text-[#3D8A5A] font-semibold">지금 가임기예요! 확률이 가장 높은 시기</p>}
                    {motherAge > 0 && <p className="text-[11px] text-[#868B94]">나이 ({motherAge}세): {ageAdj >= 0 ? `+${ageAdj}` : ageAdj}%</p>}
                    <p className="text-[11px] text-[#868B94]">생활습관 ({habitScore}항목): +{habitAdj}%</p>
                    <p className="text-[11px] text-[#868B94]">영양제 ({supplScore}/4): +{supplAdj}%</p>
                  </div>
                  <p className="text-[9px] text-[#AEB1B9] mt-2">참고용 예측이며, 실제 의학적 확률과 다를 수 있어요</p>
                </>
              )
            })()}
          </div>
        )}

        {/* 식단 가이드 */}
        <FoodGuide />

        {/* 스트레스 관리 */}
        <StressRelief />

        {/* 병원 예약 리마인더 */}
        <AppointmentReminder motherAge={motherAge} />
      </div>
    </div>
  )
}
