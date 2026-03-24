'use client'

import { useMemo } from 'react'
import type { CareEvent } from '@/types'

interface Props {
  events: CareEvent[]
}

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  feed: { color: 'bg-[#FF6F0F]', label: '수유' },
  sleep: { color: 'bg-[#5B6DFF]', label: '수면' },
  poop: { color: 'bg-[#C68A2E]', label: '대변' },
  pee: { color: 'bg-[#3DA5F5]', label: '소변' },
  temp: { color: 'bg-[#F25555]', label: '체온' },
}

export default function RoutineTimelapse({ events }: Props) {
  const hours = useMemo(() => {
    const grid = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      events: events.filter((e) => new Date(e.start_ts).getHours() === h),
    }))
    return grid
  }, [events])

  if (events.length < 3) return null

  return (
    <div className="mx-4 mb-3 p-4 rounded-2xl bg-white border border-[#ECECEC]">
      <p className="text-[13px] font-bold text-[#212124] mb-3">오늘의 루틴 패턴</p>

      {/* 24시간 그리드 */}
      <div className="flex gap-[2px] h-12 items-end">
        {hours.map((h) => (
          <div key={h.hour} className="flex-1 flex flex-col justify-end gap-[1px]">
            {h.events.length > 0 ? (
              h.events.slice(0, 3).map((e, i) => {
                const config = TYPE_CONFIG[e.type]
                return (
                  <div
                    key={i}
                    className={`w-full rounded-sm ${config?.color || 'bg-[#ECECEC]'}`}
                    style={{ height: `${Math.min(h.events.length * 8, 40)}px` }}
                    title={`${h.hour}시 ${config?.label || e.type}`}
                  />
                )
              }).slice(0, 1)
            ) : (
              <div className="w-full h-1 rounded-sm bg-[#F0EDE8]" />
            )}
          </div>
        ))}
      </div>

      {/* 시간 라벨 */}
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#9E9A95]">0시</span>
        <span className="text-[9px] text-[#9E9A95]">6시</span>
        <span className="text-[9px] text-[#9E9A95]">12시</span>
        <span className="text-[9px] text-[#9E9A95]">18시</span>
        <span className="text-[9px] text-[#9E9A95]">24시</span>
      </div>

      {/* 범례 */}
      <div className="flex gap-3 mt-2 flex-wrap">
        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${config.color}`} />
            <span className="text-[10px] text-[#6B6966]">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
