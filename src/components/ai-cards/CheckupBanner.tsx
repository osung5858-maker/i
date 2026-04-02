'use client'

import { useMemo } from 'react'
import { getUpcomingSchedule } from '@/lib/utils/checkup-schedule'
import { StethoscopeIcon, ClipboardIcon, SyringeIcon } from '@/components/ui/Icons'

interface Props {
  birthdate: string
}

export default function CheckupBanner({ birthdate }: Props) {
  const schedule = useMemo(() => getUpcomingSchedule(birthdate, 3), [birthdate])

  if (schedule.length === 0) return null

  return (
    <div className="px-4 mb-3">
      <div className="rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
        <div className="px-3.5 pt-3 pb-1.5 flex items-center gap-2">
          <StethoscopeIcon className="w-3.5 h-3.5 text-[#5A5854]" />
          <span className="text-xs font-bold text-primary">검진 · 접종 일정</span>
        </div>
        {schedule.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3.5 py-2.5 border-t border-[#E8E4DF]"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              item.status === 'due'
                ? 'bg-orange-50'
                : 'bg-blue-50'
            }`}>
              {item.type === 'checkup'
                ? <ClipboardIcon className="w-4 h-4 text-[#5B9FD6]" />
                : <SyringeIcon className="w-4 h-4 text-[#5B9FD6]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary truncate">{item.name}</p>
              <p className="text-body-emphasis text-tertiary">{item.description}</p>
            </div>
            <div className="text-right shrink-0">
              {item.status === 'due' ? (
                <span className="text-body-emphasis font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                  지금!
                </span>
              ) : (
                <span className="text-body-emphasis text-tertiary">
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
