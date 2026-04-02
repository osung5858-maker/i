'use client'

import { useMemo } from 'react'
import type { CareEvent } from '@/types'
import { SparkleIcon } from '@/components/ui/Icons'
import { calculateStreak } from '@/lib/utils/streak'

interface Props {
  events: CareEvent[]
}

export default function RewardBanner({ events }: Props) {
  const streakData = useMemo(() => calculateStreak(events), [events])
  const streak = streakData.current

  if (streak < 1) return null

  const badges = [
    { days: 3, label: '꾸준한 도담상', desc: '3일 연속 기록!' },
    { days: 7, label: '일주일 도담상', desc: '7일 연속 기록 달성!' },
    { days: 14, label: '보름 도담상', desc: '2주 연속 기록!' },
    { days: 30, label: '한 달 도담상', desc: '30일 연속 기록 달성!' },
  ]

  const nextBadge = badges.find((b) => b.days > streak)
  const currentBadge = [...badges].reverse().find((b) => b.days <= streak)

  return (
    <div className="mx-4 mb-3 p-3.5 rounded-2xl bg-[#FFF8F3] border border-[#FFE4CC]">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-body-emphasis font-bold text-[var(--color-primary)] flex items-center gap-1"><SparkleIcon className="w-4 h-4" /> {streak}일 연속 기록 중</span>
          </div>
          {currentBadge && (
            <p className="text-body text-[#C68A2E] mt-0.5">{currentBadge.label}</p>
          )}
        </div>
        {nextBadge && (
          <div className="text-right">
            <p className="text-body-emphasis text-tertiary">다음 배지까지</p>
            <p className="text-body font-bold text-[var(--color-primary)]">{nextBadge.days - streak}일</p>
          </div>
        )}
      </div>
    </div>
  )
}
