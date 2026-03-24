'use client'

import { useMemo } from 'react'
import type { CareEvent } from '@/types'

interface Props {
  events: CareEvent[]
  childCreatedAt?: string
}

const BADGES = [
  { days: 3, emoji: '🌱', name: '새싹 도담', color: '#C8F0D8' },
  { days: 7, emoji: '🌿', name: '꾸준한 도담', color: '#A8E6CF' },
  { days: 14, emoji: '🌳', name: '든든한 도담', color: '#7BC67E' },
  { days: 30, emoji: '🏆', name: '도담 마스터', color: '#FFD700' },
  { days: 100, emoji: '💎', name: '100일 전설', color: '#B9F2FF' },
]

const AI_UNLOCKS = [
  { days: 0, label: '기본 기록 + 오늘 요약' },
  { days: 3, label: 'AI 자동일기' },
  { days: 7, label: '루틴 예보 (수유/수면 예측)' },
  { days: 14, label: '수면 패턴 분석' },
  { days: 21, label: '주간 AI 리포트' },
  { days: 30, label: '맞춤 자장가 추천' },
  { days: 60, label: 'AI 발달 분석' },
]

function getRecordDates(events: CareEvent[]): Set<string> {
  const dates = new Set<string>()
  events.forEach((e) => dates.add(e.start_ts.split('T')[0]))
  return dates
}

function calcStreak(dates: Set<string>): { current: number; longest: number; total: number } {
  if (dates.size === 0) return { current: 0, longest: 0, total: dates.size }

  const sorted = [...dates].sort()
  let current = 0
  let longest = 0
  let streak = 0
  const today = new Date().toISOString().split('T')[0]

  // 오늘부터 역순으로 현재 스트릭 계산
  const d = new Date()
  while (true) {
    const dateStr = d.toISOString().split('T')[0]
    if (dates.has(dateStr)) {
      current++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }

  // 최장 스트릭 계산
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      streak = 1
    } else {
      const prev = new Date(sorted[i - 1])
      const curr = new Date(sorted[i])
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      streak = diff === 1 ? streak + 1 : 1
    }
    longest = Math.max(longest, streak)
  }

  return { current, longest, total: dates.size }
}

export default function StreakBanner({ events }: Props) {
  const { current, longest, total } = useMemo(() => {
    const dates = getRecordDates(events)
    return calcStreak(dates)
  }, [events])

  const currentBadge = useMemo(() => {
    return [...BADGES].reverse().find((b) => current >= b.days)
  }, [current])

  const nextBadge = useMemo(() => {
    return BADGES.find((b) => b.days > current)
  }, [current])

  const nextAIUnlock = useMemo(() => {
    return AI_UNLOCKS.find((u) => u.days > total)
  }, [total])

  if (events.length === 0) return null

  return (
    <div className="space-y-3 px-5 pb-2">
      {/* 스트릭 배너 */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3.5 border border-[#E8E4DF]">
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            {current >= 3 ? '🔥' : '✨'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-bold text-[#212124]">{current}일</span>
              <span className="text-[12px] text-[#6B6966]">연속 기록 중</span>
            </div>
            {currentBadge && (
              <span className="text-[11px] font-medium" style={{ color: '#3D8A5A' }}>
                {currentBadge.emoji} {currentBadge.name}
              </span>
            )}
          </div>
        </div>

        {nextBadge && (
          <div className="text-right">
            <p className="text-[10px] text-[#9E9A95]">다음 배지</p>
            <p className="text-[12px] font-semibold text-[#3D8A5A]">
              {nextBadge.emoji} {nextBadge.days - current}일 남음
            </p>
          </div>
        )}
      </div>

      {/* AI 해금 프로그레스 (해금 임박 시에만 표시) */}
      {nextAIUnlock && nextAIUnlock.days - total <= 5 && (
        <div className="bg-gradient-to-r from-[#F0F9F4] to-[#E8F5FF] rounded-2xl p-3.5 border border-[#E0F0E8]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">🔓</span>
            <span className="text-[11px] font-bold text-[#3D8A5A]">AI 기능 해금 임박!</span>
          </div>
          <p className="text-[12px] text-[#212124]">
            <span className="font-semibold">{nextAIUnlock.days - total}일</span>만 더 기록하면{' '}
            <span className="font-semibold text-[#3D8A5A]">{nextAIUnlock.label}</span>이 열려요
          </p>
          <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3D8A5A] rounded-full transition-all duration-500"
              style={{ width: `${Math.min((total / nextAIUnlock.days) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
