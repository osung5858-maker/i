/**
 * Streak (연속 기록) 계산 유틸리티
 *
 * 여러 컴포넌트에서 중복 구현되던 로직을 통합
 * - RewardBanner.tsx
 * - StreakCard.tsx
 * - StreakBanner.tsx
 */

import type { CareEvent } from '@/types'

export interface StreakResult {
  /** 현재 연속 기록 일수 */
  current: number
  /** 최장 연속 기록 일수 */
  longest: number
  /** 총 기록 일수 */
  total: number
  /** 오늘 기록 여부 */
  recordedToday: boolean
}

/**
 * 이벤트 목록에서 연속 기록 통계 계산
 */
export function calculateStreak(events: CareEvent[]): StreakResult {
  // 날짜별로 중복 제거
  const dateSet = new Set(
    events.map((e) => new Date(e.start_ts).toISOString().split('T')[0])
  )

  const today = new Date()
  const todayKey = today.toISOString().split('T')[0]
  const recordedToday = dateSet.has(todayKey)

  let current = 0
  let longest = 0
  let tempStreak = 0
  let foundBreak = false

  // 오늘부터 과거로 순회
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]

    if (dateSet.has(key)) {
      tempStreak++

      // 현재 연속은 첫 공백 전까지
      if (!foundBreak) {
        current = tempStreak
      }

      // 최장 연속 업데이트
      longest = Math.max(longest, tempStreak)
    } else {
      // 공백 발견
      if (tempStreak > 0) {
        foundBreak = true
        tempStreak = 0
      }
    }
  }

  return {
    current,
    longest,
    total: dateSet.size,
    recordedToday,
  }
}

/**
 * 특정 날짜의 이전 날짜 키 반환
 */
function getPreviousDay(dateKey: string): string {
  const d = new Date(dateKey)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

/**
 * 연속 기록 격려 메시지 생성
 */
export function getStreakMessage(streak: StreakResult): string {
  const { current, recordedToday } = streak

  if (!recordedToday) {
    return current > 0
      ? `${current}일 연속 중! 오늘도 기록하고 이어가세요 🔥`
      : '오늘 첫 기록을 시작해보세요!'
  }

  if (current === 1) return '오늘 첫 기록 완료! 🎉'
  if (current === 7) return '일주일 연속 기록! 대단해요 🌟'
  if (current === 14) return '2주 연속 기록! 멋져요 🏆'
  if (current === 30) return '한 달 연속 기록! 정말 대단해요 🎖️'
  if (current === 100) return '100일 연속 기록! 경이로워요 👑'
  if (current % 10 === 0) return `${current}일 연속 기록 중! 계속 해봐요 💪`

  return `${current}일 연속 기록 중! 🔥`
}

/**
 * 연속 기록 레벨 계산 (게이미피케이션)
 */
export function getStreakLevel(current: number): {
  level: number
  title: string
  emoji: string
  nextMilestone: number
} {
  if (current >= 100) return { level: 5, title: '전설의 기록자', emoji: '👑', nextMilestone: 200 }
  if (current >= 30) return { level: 4, title: '기록 마스터', emoji: '🏆', nextMilestone: 100 }
  if (current >= 14) return { level: 3, title: '꾸준한 부모', emoji: '⭐', nextMilestone: 30 }
  if (current >= 7) return { level: 2, title: '성실한 기록자', emoji: '📝', nextMilestone: 14 }
  if (current >= 3) return { level: 1, title: '기록 시작', emoji: '🌱', nextMilestone: 7 }
  return { level: 0, title: '새싹', emoji: '🌾', nextMilestone: 3 }
}
