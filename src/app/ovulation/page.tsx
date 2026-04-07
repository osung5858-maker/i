'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { upsertProfile, getProfile } from '@/lib/supabase/userProfile'
import PageHeader from '@/components/layout/PageHeader'

function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d
}
function fmt(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}
function fmtInput(d: Date): string {
  return d.toISOString().split('T')[0]
}
function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

// 년/월/일 셀렉터 피커
function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date()
  const parsed = value ? new Date(value) : null
  const [year, setYear]   = useState(parsed ? parsed.getFullYear()   : today.getFullYear())
  const [month, setMonth] = useState(parsed ? parsed.getMonth() + 1  : today.getMonth() + 1)
  const [day, setDay]     = useState(parsed ? parsed.getDate()       : today.getDate())

  const years  = Array.from({ length: 3 }, (_, i) => today.getFullYear() - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  useEffect(() => {
    const d = day > daysInMonth ? daysInMonth : day
    setDay(d)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    onChange(dateStr)
  }, [year, month, day]) // eslint-disable-line react-hooks/exhaustive-deps

  const sel = 'flex-1 appearance-none bg-[var(--color-page-bg)] border border-[#E8E4DF] rounded-xl px-3 py-2.5 text-primary text-center focus:outline-none focus:border-[var(--color-primary)]'
  const selStyle = { fontSize: 16 } as const

  return (
    <div className="flex gap-2">
      <select value={year} onChange={e => setYear(Number(e.target.value))} className={sel} style={selStyle}>
        {years.map(y => <option key={y} value={y}>{y}년</option>)}
      </select>
      <select value={month} onChange={e => setMonth(Number(e.target.value))} className={sel} style={selStyle}>
        {months.map(m => <option key={m} value={m}>{m}월</option>)}
      </select>
      <select value={day} onChange={e => setDay(Number(e.target.value))} className={sel} style={selStyle}>
        {days.map(d => <option key={d} value={d}>{d}일</option>)}
      </select>
    </div>
  )
}

export default function OvulationPage() {
  const router = useRouter()
  const [lastPeriod, setLastPeriod] = useState('')
  const [cycleLength, setCycleLength] = useState(28)
  const [result, setResult] = useState<{
    ovulation: Date
    fertileStart: Date
    fertileEnd: Date
    nextPeriod: Date
    daysToOv: number
    status: 'fertile' | 'tww' | 'period' | 'wait'
  } | null>(null)

  useEffect(() => {
    getProfile().then(p => {
      if (p?.last_period) setLastPeriod(p.last_period)
      if (p?.cycle_length) setCycleLength(p.cycle_length)
    })
  }, [])

  useEffect(() => {
    if (!lastPeriod) { setResult(null); return }
    const start = new Date(lastPeriod)
    if (isNaN(start.getTime())) { setResult(null); return }

    const ovulation = addDays(start, cycleLength - 14)
    const fertileStart = addDays(ovulation, -5)
    const fertileEnd = addDays(ovulation, 1)
    const nextPeriod = addDays(start, cycleLength)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const daysToOv = diffDays(today, ovulation)

    let status: 'fertile' | 'tww' | 'period' | 'wait' = 'wait'
    if (today >= fertileStart && today <= fertileEnd) status = 'fertile'
    else if (today > fertileEnd && today < nextPeriod) status = 'tww'
    else if (today >= nextPeriod) status = 'period'

    setResult({ ovulation, fertileStart, fertileEnd, nextPeriod, daysToOv, status })
  }, [lastPeriod, cycleLength])

  const handleSave = () => {
    upsertProfile({ cycle_length: cycleLength })
  }

  const STATUS_INFO = {
    fertile: { label: '지금 가임기예요!', desc: '임신 가능성이 높은 시기예요', color: '#5BA882', bg: '#E8F5EF' },
    tww:     { label: '착상 대기 중',     desc: '무리하지 말고 편안하게 지내세요', color: '#8B7EC8', bg: '#F3EDFF' },
    period:  { label: '생리 예정일 지났어요', desc: '생리 시작일을 업데이트해주세요', color: '#E8937A', bg: '#FFF0E6' },
    wait:    { label: '가임기까지 대기 중', desc: '건강한 생활 습관을 유지해요', color: '#6B9EC8', bg: '#F0F5FA' },
  }

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      <PageHeader title="배란일 계산기" />

      <div className="max-w-lg mx-auto w-full px-4 pt-4 pb-8 space-y-4">
        {/* 입력 카드 */}
        <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4 space-y-4">
          <div>
            <p className="text-caption font-bold text-secondary mb-1.5">마지막 생리 시작일</p>
            <DatePicker value={lastPeriod} onChange={v => { setLastPeriod(v); upsertProfile({ last_period: v }) }} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-caption font-bold text-secondary">생리 주기</p>
              <p className="text-body font-bold text-[var(--color-primary)]">{cycleLength}일</p>
            </div>
            <input
              type="range"
              min={21} max={35} value={String(cycleLength)}
              onChange={e => setCycleLength(Number(e.target.value))}
              onMouseUp={handleSave} onTouchEnd={handleSave}
              className="w-full accent-[var(--color-primary)]"
            />
            <div className="flex justify-between text-label text-muted mt-0.5">
              <span>21일</span><span>28일</span><span>35일</span>
            </div>
          </div>
        </div>

        {/* 결과 */}
        {result && (
          <>
            {/* 현재 상태 배너 */}
            <div className="rounded-2xl px-4 py-3.5" style={{ background: STATUS_INFO[result.status].bg }}>
              <p className="text-subtitle" style={{ color: STATUS_INFO[result.status].color }}>
                {STATUS_INFO[result.status].label}
              </p>
              <p className="text-caption text-secondary mt-0.5">{STATUS_INFO[result.status].desc}</p>
            </div>

            {/* 날짜 카드 4개 */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: '배란 예정일', value: fmt(result.ovulation), sub: result.daysToOv === 0 ? '오늘!' : result.daysToOv > 0 ? `D-${result.daysToOv}` : `D+${Math.abs(result.daysToOv)}`, color: '#5BA882', bg: '#E8F5EF' },
                { label: '가임기 시작', value: fmt(result.fertileStart), sub: '배란 5일 전', color: '#6B9EC8', bg: '#F0F5FA' },
                { label: '가임기 종료', value: fmt(result.fertileEnd), sub: '배란 1일 후', color: '#6B9EC8', bg: '#F0F5FA' },
                { label: '다음 생리 예정', value: fmt(result.nextPeriod), sub: `${diffDays(new Date(), result.nextPeriod)}일 후`, color: '#E8937A', bg: '#FFF0E6' },
              ].map(c => (
                <div key={c.label} className="rounded-2xl px-3.5 py-3" style={{ background: c.bg }}>
                  <p className="text-label font-medium text-tertiary">{c.label}</p>
                  <p className="text-subtitle font-bold mt-0.5" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-label font-medium mt-0.5" style={{ color: c.color }}>{c.sub}</p>
                </div>
              ))}
            </div>

            {/* 타임라인 */}
            <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
              <p className="text-body font-bold text-primary mb-3">이번 주기 타임라인</p>
              <div className="space-y-2.5">
                {[
                  { label: '생리', date: new Date(lastPeriod), color: '#E8937A', icon: '🔴' },
                  { label: '가임기 시작', date: result.fertileStart, color: '#6B9EC8', icon: '💙' },
                  { label: '배란일', date: result.ovulation, color: '#5BA882', icon: '🟢' },
                  { label: '가임기 종료', date: result.fertileEnd, color: '#6B9EC8', icon: '💙' },
                  { label: '다음 생리 예정', date: result.nextPeriod, color: '#E8937A', icon: '🔴' },
                ].map((t, i) => {
                  const today = new Date(); today.setHours(0, 0, 0, 0)
                  const isPast = t.date < today
                  const isToday = fmtInput(t.date) === fmtInput(today)
                  return (
                    <div key={i} className={`flex items-center gap-3 ${isPast && !isToday ? 'opacity-40' : ''}`}>
                      <span className="text-base w-6 text-center shrink-0">{t.icon}</span>
                      <div className="flex-1">
                        <p className={`text-body font-medium ${isToday ? 'font-bold' : ''}`} style={{ color: isToday ? t.color : '#1A1918' }}>
                          {t.label} {isToday && <span className="text-label">← 오늘</span>}
                        </p>
                      </div>
                      <p className="text-caption text-secondary shrink-0">{fmt(t.date)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 안내 */}
            <div className="bg-[#F5F1EC] rounded-2xl px-4 py-3">
              <p className="text-label text-tertiary leading-relaxed">
                ※ 이 계산기는 평균 주기 기반의 참고용 정보예요. 실제 배란일은 개인차가 있으며, 정확한 확인은 배란 테스트기나 산부인과 초음파를 권장해요.
              </p>
            </div>
          </>
        )}

        {!lastPeriod && (
          <div className="flex flex-col items-center justify-center py-12 text-tertiary">
            <p className="text-body-emphasis">마지막 생리 시작일을 입력해주세요</p>
            <p className="text-body mt-1">배란일과 가임기를 자동으로 계산해드려요</p>
          </div>
        )}
      </div>
    </div>
  )
}
