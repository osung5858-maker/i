'use client'

import { useState, useCallback } from 'react'
import { BottleIcon, MoonIcon, CircleIcon, DropletIcon, ThermometerIcon } from '@/components/ui/Icons'
import type { EventType } from '@/types'

const BUTTONS = [
  { type: 'feed' as EventType, icon: BottleIcon, label: '수유', bg: 'bg-blue-50 dark:bg-blue-950', iconColor: 'text-blue-500', activeBorder: 'ring-blue-500' },
  { type: 'sleep' as EventType, icon: MoonIcon, label: '수면', bg: 'bg-indigo-50 dark:bg-indigo-950', iconColor: 'text-indigo-500', activeBorder: 'ring-indigo-500' },
  { type: 'poop' as EventType, icon: CircleIcon, label: '대변', bg: 'bg-amber-50 dark:bg-amber-950', iconColor: 'text-amber-600', activeBorder: 'ring-amber-500' },
  { type: 'pee' as EventType, icon: DropletIcon, label: '소변', bg: 'bg-cyan-50 dark:bg-cyan-950', iconColor: 'text-cyan-500', activeBorder: 'ring-cyan-500' },
  { type: 'temp' as EventType, icon: ThermometerIcon, label: '체온', bg: 'bg-rose-50 dark:bg-rose-950', iconColor: 'text-rose-500', activeBorder: 'ring-rose-500' },
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
    <div className="bg-white dark:bg-[#1a1a1a] border-t border-[#f0f0f0] dark:border-[#2a2a2a] px-6 py-4">
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
                  w-14 h-14 rounded-2xl flex items-center justify-center
                  transition-all duration-150 active:scale-90
                  ${btn.bg}
                  ${isPressed ? `ring-2 ${btn.activeBorder} shadow-sm` : ''}
                  ${isSleepActive ? 'ring-2 ring-indigo-500 animate-pulse' : ''}
                `}
              >
                <Icon className={`w-6 h-6 ${btn.iconColor}`} />
              </div>
              <span className="text-[11px] font-medium text-[#6B6B6B] dark:text-[#9B9B9B]">
                {isSleepActive ? '종료' : btn.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
