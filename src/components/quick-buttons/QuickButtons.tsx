'use client'

import { useState, useCallback } from 'react'
import { BottleIcon, MoonIcon, CircleIcon, DropletIcon, ThermometerIcon } from '@/components/ui/Icons'
import type { EventType } from '@/types'

const BUTTONS = [
  { type: 'feed' as EventType, icon: BottleIcon, label: '수유', bg: 'bg-[#FFF0E6]', iconColor: 'text-[#FF6F0F]', ring: 'ring-[#FF6F0F]' },
  { type: 'sleep' as EventType, icon: MoonIcon, label: '수면', bg: 'bg-[#EEF0FF]', iconColor: 'text-[#5B6DFF]', ring: 'ring-[#5B6DFF]' },
  { type: 'poop' as EventType, icon: CircleIcon, label: '대변', bg: 'bg-[#FFF4E6]', iconColor: 'text-[#C68A2E]', ring: 'ring-[#C68A2E]' },
  { type: 'pee' as EventType, icon: DropletIcon, label: '소변', bg: 'bg-[#E6F5FF]', iconColor: 'text-[#3DA5F5]', ring: 'ring-[#3DA5F5]' },
  { type: 'temp' as EventType, icon: ThermometerIcon, label: '체온', bg: 'bg-[#FFE6E6]', iconColor: 'text-[#F25555]', ring: 'ring-[#F25555]' },
]

interface Props {
  onRecord: (type: EventType) => void
  sleepActive?: boolean
}

export default function QuickButtons({ onRecord, sleepActive }: Props) {
  const [pressedType, setPressedType] = useState<EventType | null>(null)

  const handleTap = useCallback(
    (type: EventType) => {
      setPressedType(type)
      if (navigator.vibrate) navigator.vibrate(30)
      onRecord(type)
      setTimeout(() => setPressedType(null), 200)
    },
    [onRecord]
  )

  return (
    <div className="bg-white border-t border-[#ECECEC] px-4 py-3">
      <div className="flex items-center justify-between max-w-sm mx-auto">
        {BUTTONS.map((btn) => {
          const isPressed = pressedType === btn.type
          const isSleepActive = btn.type === 'sleep' && sleepActive
          const Icon = btn.icon

          return (
            <button
              key={btn.type}
              onClick={() => handleTap(btn.type)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center
                  transition-all duration-150 active:scale-90
                  ${btn.bg}
                  ${isPressed ? `ring-2 ${btn.ring}` : ''}
                  ${isSleepActive ? 'ring-2 ring-[#5B6DFF] animate-pulse' : ''}
                `}
              >
                <Icon className={`w-6 h-6 ${btn.iconColor}`} />
              </div>
              <span className="text-[11px] font-medium text-[#6B6966]">
                {isSleepActive ? '종료' : btn.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
