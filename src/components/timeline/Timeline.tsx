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
    bg: 'bg-[#FFF0E6]',
    iconColor: 'text-[#FF6F0F]',
    label: (e) => `수유${e.amount_ml ? ` ${e.amount_ml}ml` : ''}`,
  },
  sleep: {
    icon: MoonIcon,
    bg: 'bg-[#EEF0FF]',
    iconColor: 'text-[#5B6DFF]',
    label: (e) => {
      if (e.end_ts) {
        const mins = Math.round((new Date(e.end_ts).getTime() - new Date(e.start_ts).getTime()) / 60000)
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return `수면 ${h ? `${h}시간 ` : ''}${m}분`
      }
      return '수면 중...'
    },
  },
  poop: {
    icon: CircleIcon,
    bg: 'bg-[#FFF4E6]',
    iconColor: 'text-[#C68A2E]',
    label: (e) => {
      const s = e.tags?.status as string | undefined
      return `대변${s ? ` · ${s === 'normal' ? '정상' : s === 'soft' ? '묽음' : '단단'}` : ''}`
    },
  },
  pee: {
    icon: DropletIcon,
    bg: 'bg-[#E6F5FF]',
    iconColor: 'text-[#3DA5F5]',
    label: () => '소변',
  },
  temp: {
    icon: ThermometerIcon,
    bg: 'bg-[#FFE6E6]',
    iconColor: 'text-[#F25555]',
    label: (e) => {
      const c = e.tags?.celsius as number | undefined
      return c ? `체온 ${c}°C` : '체온'
    },
  },
  memo: {
    icon: BottleIcon,
    bg: 'bg-[#F0EDE8]',
    iconColor: 'text-[#6B6966]',
    label: (e) => {
      const msg = e.tags?.message as string | undefined
      if (e.tags?.emergency) return '🚨 응급 모드 실행'
      return msg || '메모'
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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#9E9A95]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M12 8v4l3 3" strokeLinecap="round" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <p className="text-[15px] font-semibold text-[#212124]">아직 기록이 없어요</p>
        <p className="text-[13px] text-[#6B6966]">아래 버튼으로 첫 기록을 남겨보세요</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-4 gap-2 pb-4">
      {events.map((event) => {
        const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.memo
        const Icon = config.icon
        const recorderName = recorderNames[event.recorder_id] || ''

        return (
          <button
            key={event.id}
            onClick={() => onEventTap?.(event)}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC] hover:bg-[#F0EDE8] transition-colors text-left w-full active:scale-[0.99]"
          >
            <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#212124] truncate">
                {config.label(event)}
              </p>
              <p className="text-[12px] text-[#6B6966]">
                {formatTime(event.start_ts)}
                {recorderName && ` · ${recorderName}`}
                {event.synced === false && ' · 동기화 대기'}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
