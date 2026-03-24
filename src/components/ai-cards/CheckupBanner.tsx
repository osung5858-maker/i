'use client'

import { useMemo } from 'react'
import { getUpcomingSchedule } from '@/lib/utils/checkup-schedule'

interface Props {
  birthdate: string
}

export default function CheckupBanner({ birthdate }: Props) {
  const schedule = useMemo(() => getUpcomingSchedule(birthdate, 3), [birthdate])

  if (schedule.length === 0) return null

  return (
    <div className="px-4 mb-3">
      <div className="rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a] overflow-hidden">
        <div className="px-3.5 pt-3 pb-1.5 flex items-center gap-2">
          <span className="text-xs">🩺</span>
          <span className="text-xs font-bold text-[#0A0B0D] dark:text-white">검진 · 접종 일정</span>
        </div>
        {schedule.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3.5 py-2.5 border-t border-[#E8E4DF] dark:border-[#2a2a2a]"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              item.status === 'due'
                ? 'bg-orange-50 dark:bg-orange-950'
                : 'bg-blue-50 dark:bg-blue-950'
            }`}>
              <span className="text-sm">{item.type === 'checkup' ? '📋' : '💉'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0A0B0D] dark:text-white truncate">{item.name}</p>
              <p className="text-[10px] text-[#9B9B9B]">{item.description}</p>
            </div>
            <div className="text-right shrink-0">
              {item.status === 'due' ? (
                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-950 px-2 py-0.5 rounded-full">
                  지금!
                </span>
              ) : (
                <span className="text-[10px] text-[#9B9B9B]">
                  {item.daysUntil > 0 ? `D-${item.daysUntil}` : '완료'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
