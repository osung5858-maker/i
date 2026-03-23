'use client'

import { useState, useMemo } from 'react'

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
      </div>
    </div>
  )
}
