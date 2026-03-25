'use client'

import { useMemo } from 'react'
import type { CareEvent } from '@/types'

interface Props {
  events: CareEvent[]
}

function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    dates.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return dates
}

export default function MonthlyCalendar({ events }: Props) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const monthDates = useMemo(() => getMonthDates(year, month), [year, month])
  const recordDates = useMemo(() => {
    const dates = new Set<string>()
    events.forEach((e) => dates.add(e.start_ts.split('T')[0]))
    return dates
  }, [events])

  const today = now.toISOString().split('T')[0]
  const pastDates = monthDates.filter((d) => d <= today)
  const recordedCount = pastDates.filter((d) => recordDates.has(d)).length
  const rate = pastDates.length > 0 ? Math.round((recordedCount / pastDates.length) * 100) : 0

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
  const monthName = `${month + 1}월`

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#E8E4DF]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-[#212124]">📅 {monthName} 도담 스토리</h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-[14px] font-bold ${rate === 100 ? 'text-[var(--color-primary)]' : 'text-[#212124]'}`}>
            {rate}%
          </span>
          {rate === 100 && <span className="text-[14px]">🏅</span>}
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[13px] text-[#9E9A95] font-medium">{d}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 첫 주 빈 칸 */}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {monthDates.map((dateStr) => {
          const day = parseInt(dateStr.split('-')[2])
          const isToday = dateStr === today
          const isFuture = dateStr > today
          const hasRecord = recordDates.has(dateStr)
          const isPast = dateStr < today

          return (
            <div
              key={dateStr}
              className={`aspect-square rounded-lg flex items-center justify-center text-[14px] font-medium transition-colors ${
                isToday
                  ? 'bg-[var(--color-primary)] text-white font-bold'
                  : hasRecord
                    ? 'bg-[var(--color-accent-bg)] text-[var(--color-primary)]'
                    : isPast
                      ? 'bg-[#FFF0E6] text-[#D89575]'
                      : 'bg-[#F0EDE8] text-[#9E9A95]'
              }`}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent-bg)]" />
          <span className="text-[13px] text-[#6B6966]">기록 있음</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#FFF0E6]" />
          <span className="text-[13px] text-[#6B6966]">빈 날</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#F0EDE8]" />
          <span className="text-[13px] text-[#6B6966]">미래</span>
        </div>
      </div>

      {rate < 100 && pastDates.length > 0 && (
        <p className="text-center text-[13px] text-[#6B6966] mt-2">
          {rate >= 90
            ? `완벽한 ${monthName}까지 ${pastDates.length - recordedCount}일만 채우면 돼요!`
            : `${monthName}에 ${recordedCount}일 기록했어요 👏`
          }
        </p>
      )}
    </div>
  )
}
