'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'

const SCHEDULE = [
  { month: 0, id: 'bcg', name: 'BCG (결핵)', desc: '생후 4주 이내', required: true },
  { month: 0, id: 'hepb_1', name: 'B형간염 1차', desc: '출생 시', required: true },
  { month: 1, id: 'hepb_2', name: 'B형간염 2차', desc: '생후 1개월', required: true },
  { month: 2, id: 'dtap_1', name: 'DTaP 1차', desc: '디프테리아·파상풍·백일해', required: true },
  { month: 2, id: 'ipv_1', name: 'IPV 1차', desc: '폴리오', required: true },
  { month: 2, id: 'hib_1', name: 'Hib 1차', desc: 'b형 헤모필루스 인플루엔자', required: true },
  { month: 2, id: 'pcv_1', name: 'PCV 1차', desc: '폐렴구균', required: true },
  { month: 2, id: 'rv_1', name: '로타바이러스 1차', desc: '경구 투여', required: false },
  { month: 4, id: 'dtap_2', name: 'DTaP 2차', desc: '생후 4개월', required: true },
  { month: 4, id: 'ipv_2', name: 'IPV 2차', desc: '생후 4개월', required: true },
  { month: 4, id: 'hib_2', name: 'Hib 2차', desc: '생후 4개월', required: true },
  { month: 4, id: 'pcv_2', name: 'PCV 2차', desc: '생후 4개월', required: true },
  { month: 4, id: 'rv_2', name: '로타바이러스 2차', desc: '경구 투여', required: false },
  { month: 6, id: 'dtap_3', name: 'DTaP 3차', desc: '생후 6개월', required: true },
  { month: 6, id: 'ipv_3', name: 'IPV 3차', desc: '생후 6개월', required: true },
  { month: 6, id: 'hepb_3', name: 'B형간염 3차', desc: '생후 6개월', required: true },
  { month: 6, id: 'hib_3', name: 'Hib 3차', desc: '생후 6개월 (제품에 따라)', required: true },
  { month: 6, id: 'pcv_3', name: 'PCV 3차', desc: '생후 6개월 (제품에 따라)', required: true },
  { month: 6, id: 'flu', name: '인플루엔자', desc: '매년 접종 (6개월~)', required: true },
  { month: 12, id: 'mmr_1', name: 'MMR 1차', desc: '홍역·유행성이하선염·풍진', required: true },
  { month: 12, id: 'var_1', name: '수두 1차', desc: '생후 12~15개월', required: true },
  { month: 12, id: 'hepa_1', name: 'A형간염 1차', desc: '생후 12~23개월', required: true },
  { month: 12, id: 'hib_4', name: 'Hib 추가', desc: '생후 12~15개월', required: true },
  { month: 12, id: 'pcv_4', name: 'PCV 추가', desc: '생후 12~15개월', required: true },
  { month: 15, id: 'dtap_4', name: 'DTaP 4차', desc: '생후 15~18개월', required: true },
  { month: 18, id: 'hepa_2', name: 'A형간염 2차', desc: '1차 접종 후 6개월 이상', required: true },
  { month: 24, id: 'je_1', name: '일본뇌염 1차', desc: '사백신 기준', required: true },
  { month: 24, id: 'je_2', name: '일본뇌염 2차', desc: '1차 후 7~30일', required: true },
  { month: 36, id: 'je_3', name: '일본뇌염 3차', desc: '2차 접종 후 12개월', required: true },
  { month: 48, id: 'dtap_5', name: 'DTaP 5차', desc: '만 4~6세', required: true },
  { month: 48, id: 'ipv_4', name: 'IPV 4차', desc: '만 4~6세', required: true },
  { month: 48, id: 'mmr_2', name: 'MMR 2차', desc: '만 4~6세', required: true },
]

export default function VaccinationPage() {
  const [done, setDone] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_vaccinations') || '{}') } catch { return {} } }
    return {}
  })
  const [ageMonths, setAgeMonths] = useState(0)

  useEffect(() => {
    // 아이 생년월일에서 월령 계산 (포커스 시 갱신)
    const calcAge = () => {
      const child = localStorage.getItem('dodam_child_birthdate')
      if (child) {
        const birth = new Date(child)
        const now = new Date()
        setAgeMonths((now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()))
      }
    }
    calcAge()
    window.addEventListener('focus', calcAge)
    return () => window.removeEventListener('focus', calcAge)
  }, [])

  const toggleDone = (id: string) => {
    const next = { ...done }
    if (next[id]) delete next[id]; else next[id] = new Date().toISOString().split('T')[0]
    setDone(next); localStorage.setItem('dodam_vaccinations', JSON.stringify(next))
  }

  const doneCount = Object.keys(done).length
  const totalRequired = SCHEDULE.filter(v => v.required).length

  // 그룹핑
  const groups = useMemo(() => {
    const map = new Map<string, typeof SCHEDULE>()
    SCHEDULE.forEach(v => {
      const label = v.month === 0 ? '출생' : v.month < 12 ? `${v.month}개월` : `${Math.floor(v.month / 12)}세 (${v.month}개월)`
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(v)
    })
    return Array.from(map.entries())
  }, [])

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col">
      <PageHeader title="예방접종" showBack rightAction={<span className="text-[13px] text-[var(--color-primary)] font-semibold">{doneCount}/{SCHEDULE.length}</span>} />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">
        {/* 프로그레스 */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[14px] font-bold text-[#1A1918]">💉 접종 현황</p>
            <p className="text-[14px] text-[var(--color-primary)] font-semibold">{Math.round((doneCount / SCHEDULE.length) * 100)}%</p>
          </div>
          <div className="w-full h-2 bg-[#E8E4DF] rounded-full">
            <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${(doneCount / SCHEDULE.length) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-[14px] text-[#6B6966]">필수 {SCHEDULE.filter(v => v.required && done[v.id]).length}/{totalRequired}</p>
            <p className="text-[14px] text-[#6B6966]">선택 {SCHEDULE.filter(v => !v.required && done[v.id]).length}/{SCHEDULE.filter(v => !v.required).length}</p>
          </div>
        </div>

        {/* 접종 목록 */}
        {groups.map(([label, vaccines]) => {
          const groupMonth = vaccines[0].month
          const isPast = groupMonth <= ageMonths
          const isCurrent = groupMonth <= ageMonths && groupMonth >= ageMonths - 2
          const hasUndone = vaccines.some(v => !done[v.id] && v.required)

          return (
            <div key={label} className={`bg-white rounded-xl border p-4 ${isCurrent && hasUndone ? 'border-[var(--color-accent-bg)]' : 'border-[#E8E4DF]'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-[#1A1918]">{label}</p>
                  {isCurrent && hasUndone && <span className="text-[13px] px-1.5 py-0.5 rounded bg-[#FDE8E8] text-[#D08068] font-semibold">접종 시기</span>}
                  {isPast && !hasUndone && <span className="text-[13px] text-[var(--color-primary)]">✓</span>}
                </div>
                <p className="text-[14px] text-[#9E9A95]">{vaccines.filter(v => done[v.id]).length}/{vaccines.length}</p>
              </div>
              {vaccines.map(v => (
                <button key={v.id} onClick={() => toggleDone(v.id)} className="w-full flex items-center gap-2.5 py-2 active:bg-[#FFF9F5] rounded-lg">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${done[v.id] ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : isPast && v.required ? 'border-[#D08068]' : 'border-[#AEB1B9]'}`}>
                    {done[v.id] && <span className="text-white text-[14px]">✓</span>}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[14px] font-medium ${done[v.id] ? 'text-[#9E9A95] line-through' : 'text-[#1A1918]'}`}>{v.name}</span>
                      {!v.required && <span className="text-[13px] px-1 rounded bg-[#FFF9F5] text-[#6B6966]">선택</span>}
                    </div>
                    <p className="text-[14px] text-[#6B6966]">{v.desc}</p>
                  </div>
                  {done[v.id] && <span className="text-[13px] text-[var(--color-primary)]">{done[v.id]}</span>}
                </button>
              ))}
            </div>
          )
        })}

        <div className="bg-[#F0F9F4] rounded-xl p-3 text-center">
          <p className="text-[13px] text-[var(--color-primary)]">예방접종 도우미 ☎ 1544-4774</p>
          <a href="https://nip.kdca.go.kr" target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#6B6966]">질병관리청 예방접종 도우미 →</a>
        </div>
      </div>
    </div>
  )
}
