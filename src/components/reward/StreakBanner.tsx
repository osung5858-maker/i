'use client'

import { useMemo, useState } from 'react'
import type { CareEvent } from '@/types'
import { SparkleIcon, SproutIcon, TrophyIcon, XIcon } from '@/components/ui/Icons'

interface Props {
  events: CareEvent[]
  childCreatedAt?: string
  birthdate?: string
}

const BADGES = [
  { days: 3, name: '새싹 도담', color: 'var(--color-accent-bg)' },
  { days: 7, name: '꾸준한 도담', color: '#A8E6CF' },
  { days: 14, name: '든든한 도담', color: '#7BC67E' },
  { days: 30, name: '도담 마스터', color: '#FFD700' },
  { days: 100, name: '100일 전설', color: '#B9F2FF' },
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

const MILESTONES = [
  { days: 100, title: 'D+100', message: '와! 100일간 함께 기록했어요' },
  { days: 200, title: 'D+200', message: '200일이라니, 정말 대단해요' },
  { days: 365, title: 'D+365', message: '1년을 함께 기록한 소중한 여정' },
]

export default function StreakBanner({ events, birthdate }: Props) {
  const [dismissedMilestone, setDismissedMilestone] = useState<number | null>(null)

  const { current, longest, total } = useMemo(() => {
    const dates = getRecordDates(events)
    return calcStreak(dates)
  }, [events])

  // 스트릭 끊김 감지 (어제 기록이 없고 그저께 기록이 있는 경우)
  const streakBroken = useMemo(() => {
    if (current > 0) return false
    const dates = getRecordDates(events)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dayBefore = new Date()
    dayBefore.setDate(dayBefore.getDate() - 2)
    return !dates.has(yesterday.toISOString().split('T')[0]) && dates.has(dayBefore.toISOString().split('T')[0])
  }, [events, current])

  // D+ 마일스톤 계산
  const milestone = useMemo(() => {
    if (!birthdate) return null
    const birth = new Date(birthdate)
    const today = new Date()
    const dPlus = Math.floor((today.getTime() - birth.getTime()) / 86400000)
    return MILESTONES.find((m) => dPlus >= m.days && dPlus < m.days + 7) // 7일 내 표시
  }, [birthdate])

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
      {/* 마일스톤 카드 */}
      {milestone && dismissedMilestone !== milestone.days && (
        <div className="bg-gradient-to-r from-[var(--color-page-bg)] to-[#FFF5EB] rounded-2xl p-4 border border-[#F0DCC8] relative">
          <button
            onClick={() => setDismissedMilestone(milestone.days)}
            className="absolute top-2 right-2 text-tertiary text-xs p-1"
          ><XIcon className="w-3 h-3" /></button>
          <div className="flex items-center gap-3">
            <TrophyIcon className="w-8 h-8 text-[#C4913E]" />
            <div>
              <p className="text-subtitle font-bold text-primary">{milestone.title}</p>
              <p className="text-body-emphasis text-secondary">{milestone.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* 스트릭 끊김 복구 메시지 */}
      {streakBroken && (
        <div className="bg-white rounded-2xl p-3.5 border border-[#E8E4DF]">
          <div className="flex items-center gap-2">
            <SparkleIcon className="w-5 h-5 text-[var(--color-primary)]" />
            <div>
              <p className="text-body-emphasis text-primary">괜찮아요, 오늘부터 다시!</p>
              <p className="text-body text-secondary">최장 {longest}일 연속 기록이 있잖아요. 오늘 하나만 기록하면 다시 시작돼요.</p>
            </div>
          </div>
        </div>
      )}

      {/* 스트릭 배너 */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3.5 border border-[#E8E4DF]">
        <div className="flex items-center gap-3">
          <div>
            {current >= 3 ? <SparkleIcon className="w-6 h-6 text-[var(--color-primary)]" /> : <SproutIcon className="w-6 h-6 text-[var(--color-primary)]" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-subtitle font-bold text-primary">{current}일</span>
              <span className="text-body-emphasis text-secondary">연속 기록 중</span>
            </div>
            {currentBadge && (
              <span className="text-body font-medium" style={{ color: 'var(--color-primary)' }}>
                {currentBadge.name}
              </span>
            )}
          </div>
        </div>

        {nextBadge && (
          <div className="text-right">
            <p className="text-body-emphasis text-tertiary">다음 배지</p>
            <p className="text-body-emphasis text-[var(--color-primary)]">
              {nextBadge.days - current}일 남음
            </p>
          </div>
        )}
      </div>

      {/* AI 해금 프로그레스 (해금 임박 시에만 표시) */}
      {nextAIUnlock && nextAIUnlock.days - total <= 5 && (
        <div className="bg-gradient-to-r from-[#F0F9F4] to-[#E8F5FF] rounded-2xl p-3.5 border border-[#E0F0E8]">
          <div className="flex items-center gap-2 mb-1">
            <SparkleIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="text-body font-bold text-[var(--color-primary)]">AI 기능 해금 임박!</span>
          </div>
          <p className="text-body-emphasis text-primary">
            <span className="font-semibold">{nextAIUnlock.days - total}일</span>만 더 기록하면{' '}
            <span className="font-semibold text-[var(--color-primary)]">{nextAIUnlock.label}</span>이 열려요
          </p>
          <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
              style={{ width: `${Math.min((total / nextAIUnlock.days) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
