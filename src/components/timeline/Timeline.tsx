'use client'

import { BottleIcon, MoonIcon, CircleIcon, DropletIcon, ThermometerIcon } from '@/components/ui/Icons'
import type { CareEvent } from '@/types'

const EVENT_CONFIG: Record<string, {
  icon: React.FC<{ className?: string }>
  bg: string
  iconColor: string
  label: (e: CareEvent) => string
}> = {
  feed: {
    icon: BottleIcon,
    bg: 'bg-blue-50 dark:bg-blue-950',
    iconColor: 'text-blue-500',
    label: (e) => `수유${e.amount_ml ? ` ${e.amount_ml}ml` : ''}`,
  },
  sleep: {
    icon: MoonIcon,
    bg: 'bg-indigo-50 dark:bg-indigo-950',
    iconColor: 'text-indigo-500',
    label: (e) => {
      if (e.end_ts) {
        const mins = Math.round(
          (new Date(e.end_ts).getTime() - new Date(e.start_ts).getTime()) / 60000
        )
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return `수면 ${h ? `${h}시간 ` : ''}${m}분`
      }
      return '수면 중...'
    },
  },
  poop: {
    icon: CircleIcon,
    bg: 'bg-amber-50 dark:bg-amber-950',
    iconColor: 'text-amber-600',
    label: (e) => {
      const s = e.tags?.status as string | undefined
      return `대변${s ? ` · ${s === 'normal' ? '정상' : s === 'soft' ? '묽음' : '단단'}` : ''}`
    },
  },
  pee: {
    icon: DropletIcon,
    bg: 'bg-cyan-50 dark:bg-cyan-950',
    iconColor: 'text-cyan-500',
    label: () => '소변',
  },
  temp: {
    icon: ThermometerIcon,
    bg: 'bg-rose-50 dark:bg-rose-950',
    iconColor: 'text-rose-500',
    label: (e) => {
      const c = e.tags?.celsius as number | undefined
      return c ? `체온 ${c}°C` : '체온'
    },
  },
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

interface Props {
  events: CareEvent[]
  recorderNames?: Record<string, string>
  onEventTap?: (event: CareEvent) => void
}

export default function Timeline({ events, recorderNames = {}, onEventTap }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-20 h-20 rounded-3xl bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center">
          <svg className="w-10 h-10 text-[#c0c0c0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M12 8v4l3 3" strokeLinecap="round" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-[#0A0B0D] dark:text-white">아직 기록이 없어요</p>
          <p className="text-sm text-[#6B6B6B] mt-1">아래 버튼으로 첫 기록을 남겨보세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 px-4">
      {events.map((event) => {
        const config = EVENT_CONFIG[event.type]
        if (!config) return null
        const Icon = config.icon
        const recorderName = recorderNames[event.recorder_id] || ''

        return (
          <button
            key={event.id}
            onClick={() => onEventTap?.(event)}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] hover:border-[#e0e0e0] dark:hover:border-[#3a3a3a] transition-colors text-left w-full active:scale-[0.99]"
          >
            {/* 아이콘 */}
            <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#0A0B0D] dark:text-white truncate">
                  {config.label(event)}
                </span>
                {!event.synced && (
                  <span className="text-[10px] text-[#9B9B9B] bg-[#f5f5f5] dark:bg-[#2a2a2a] px-1.5 py-0.5 rounded-full">동기화 중</span>
                )}
              </div>
              <span className="text-xs text-[#9B9B9B]">
                {formatTime(event.start_ts)}
                {recorderName && ` · ${recorderName}`}
              </span>
            </div>

            {/* 시각 (우측) */}
            <div className="text-right shrink-0">
              <span className="text-xs font-mono text-[#9B9B9B]">
                {formatTime(event.start_ts)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
