/**
 * 연쇄 케어 플로우 엔진
 *
 * 이벤트 기록 시 다음 행동을 자동 제안하고,
 * 시간이 지나면 리마인더를 스케줄링한다.
 *
 * 예: 체온 38.0 기록 → "해열제 투약했나요?" → 투약 기록 → "4시간 후 체온 재측정 알림"
 */

import type { CareEvent } from '@/types'

export interface CareAction {
  id: string
  type: 'suggest' | 'remind' | 'alert' | 'info'
  title: string
  desc: string
  /** 액션 버튼 텍스트 (없으면 닫기만) */
  actionLabel?: string
  /** 액션 시 이동할 경로 또는 실행할 동작 */
  actionHref?: string
  actionType?: 'record' | 'navigate' | 'schedule'
  /** 리마인더 스케줄 (분 단위) */
  remindAfterMin?: number
  /** 우선순위 (높을수록 먼저) */
  priority: number
  /** 이 액션이 유효한 시간 (밀리초, 기본 1시간) */
  expiresIn?: number
}

// ===== 체온 케어 플로우 =====

function evaluateTempFlow(event: CareEvent, recentEvents: CareEvent[]): CareAction[] {
  const celsius = Number(event.tags?.celsius)
  if (!celsius || celsius < 37.5) return []

  const actions: CareAction[] = []
  const isCritical = celsius >= 38.5
  const isHigh = celsius >= 39.0

  // 체온 추이 분석
  const recentTemps = recentEvents
    .filter(e => e.type === 'temp' && e.tags?.celsius)
    .slice(0, 5)
    .map(e => ({ celsius: Number(e.tags!.celsius), time: new Date(e.start_ts).getTime() }))

  const isRising = recentTemps.length >= 2 && recentTemps[0].celsius < celsius
  const risingCount = recentTemps.filter((t, i) => i > 0 && t.celsius < recentTemps[i - 1].celsius).length

  // 1. 즉시 제안: 해열제
  const recentMed = recentEvents.find(e =>
    e.type === 'medication' &&
    (Date.now() - new Date(e.start_ts).getTime()) < 4 * 60 * 60 * 1000
  )

  if (!recentMed && celsius >= 38.0) {
    actions.push({
      id: 'temp-med-suggest',
      type: 'suggest',
      title: '해열제 투약하셨나요?',
      desc: `체온 ${celsius}°C — ${isCritical ? '해열제를 먹이고 30분 후 재측정해보세요' : '필요하면 해열제를 고려해보세요'}`,
      actionLabel: '투약 기록하기',
      actionType: 'record',
      priority: isCritical ? 100 : 80,
    })
  }

  // 2. 39도 이상: 즉시 소아과
  if (isHigh) {
    actions.push({
      id: 'temp-emergency',
      type: 'alert',
      title: '소아과 방문을 권해요',
      desc: `체온 ${celsius}°C — 고열이에요. 가까운 소아과를 확인해보세요.`,
      actionLabel: '가까운 소아과',
      actionHref: '/emergency',
      actionType: 'navigate',
      priority: 120,
    })
  }

  // 3. 체온 상승 추세 경고
  if (isRising && risingCount >= 2) {
    actions.push({
      id: 'temp-trend-rising',
      type: 'alert',
      title: '체온이 계속 올라가고 있어요',
      desc: `최근 ${recentTemps.length}회 측정에서 상승 추세예요. 주의 깊게 관찰해주세요.`,
      priority: 90,
    })
  }

  // 4. 리마인더: 30분 후 재측정
  actions.push({
    id: 'temp-recheck-30',
    type: 'remind',
    title: '체온 재측정 시간이에요',
    desc: '30분이 지났어요. 체온을 다시 재볼까요?',
    actionLabel: '체온 기록',
    actionType: 'record',
    remindAfterMin: 30,
    priority: 70,
  })

  return actions
}

// ===== 투약 케어 플로우 =====

function evaluateMedFlow(event: CareEvent, recentEvents: CareEvent[]): CareAction[] {
  const actions: CareAction[] = []

  // 최근 고열이었으면 → 4~6시간 후 재측정 리마인더
  const recentTemp = recentEvents.find(e =>
    e.type === 'temp' &&
    Number(e.tags?.celsius) >= 37.5 &&
    (Date.now() - new Date(e.start_ts).getTime()) < 2 * 60 * 60 * 1000
  )

  if (recentTemp) {
    actions.push({
      id: 'med-recheck-temp',
      type: 'remind',
      title: '체온 재측정 시간이에요',
      desc: '해열제 투약 후 4시간이 지났어요. 체온을 다시 재보세요.',
      actionLabel: '체온 기록',
      actionType: 'record',
      remindAfterMin: 240, // 4시간
      priority: 85,
    })

    actions.push({
      id: 'med-info',
      type: 'info',
      title: '해열제 복용 간격',
      desc: '다음 투약은 최소 4~6시간 후에 가능해요. 38°C 이상 지속 시 소아과를 방문해주세요.',
      priority: 50,
    })
  }

  return actions
}

// ===== 복합 증상 판단 =====

function evaluateCompositeSymptoms(recentEvents: CareEvent[]): CareAction[] {
  const actions: CareAction[] = []
  const last24h = recentEvents.filter(e =>
    (Date.now() - new Date(e.start_ts).getTime()) < 24 * 60 * 60 * 1000
  )

  const hasHighTemp = last24h.some(e => e.type === 'temp' && Number(e.tags?.celsius) >= 37.5)
  const hasSoftPoop = last24h.filter(e => e.type === 'poop' && e.tags?.status === 'soft').length
  const noFeed4h = (() => {
    const lastFeed = recentEvents.find(e => e.type === 'feed')
    if (!lastFeed) return false
    return (Date.now() - new Date(lastFeed.start_ts).getTime()) > 4 * 60 * 60 * 1000
  })()

  // 열 + 설사 → 탈수 주의
  if (hasHighTemp && hasSoftPoop >= 2) {
    actions.push({
      id: 'composite-dehydration',
      type: 'alert',
      title: '탈수 주의',
      desc: '열과 묽은 변이 함께 나타났어요. 수분 섭취를 자주 시도하고, 지속되면 소아과 방문을 권해요.',
      actionLabel: '소아과 찾기',
      actionHref: '/emergency',
      actionType: 'navigate',
      priority: 110,
    })
  }

  // 열 + 수유 거부 → 소아과 권유
  if (hasHighTemp && noFeed4h) {
    actions.push({
      id: 'composite-feed-refuse',
      type: 'alert',
      title: '수유 거부 + 발열',
      desc: '열이 있고 4시간 넘게 수유를 안 했어요. 소량씩 자주 먹이고, 지속 시 소아과 상담을 권해요.',
      priority: 100,
    })
  }

  // 설사 3회 이상 → 수분 보충 안내
  if (hasSoftPoop >= 3) {
    actions.push({
      id: 'composite-diarrhea',
      type: 'suggest',
      title: '수분 보충을 챙겨주세요',
      desc: `오늘 묽은 변이 ${hasSoftPoop}회예요. 전해질 음료나 모유를 자주 먹여주세요.`,
      priority: 75,
    })
  }

  return actions
}

// ===== 수면 케어 플로우 =====

function evaluateSleepFlow(event: CareEvent, recentEvents: CareEvent[]): CareAction[] {
  const actions: CareAction[] = []

  // 수면 종료 시 — 총 수면 시간 체크
  if (event.end_ts) {
    const durationMin = Math.round((new Date(event.end_ts).getTime() - new Date(event.start_ts).getTime()) / 60000)

    if (durationMin < 20) {
      actions.push({
        id: 'sleep-short',
        type: 'info',
        title: '짧은 낮잠이었네요',
        desc: `${durationMin}분 잤어요. 다시 재울 수 있으면 시도해보세요.`,
        priority: 30,
      })
    }
  }

  return actions
}

// ===== 메인 평가 함수 =====

export function evaluateCareFlow(
  event: CareEvent,
  recentEvents: CareEvent[],
): CareAction[] {
  const actions: CareAction[] = []

  // 이벤트 타입별 플로우
  if (event.type === 'temp') {
    actions.push(...evaluateTempFlow(event, recentEvents))
  }
  if (event.type === 'medication') {
    actions.push(...evaluateMedFlow(event, recentEvents))
  }
  if (event.type === 'sleep') {
    actions.push(...evaluateSleepFlow(event, recentEvents))
  }

  // 복합 증상 (항상 체크)
  actions.push(...evaluateCompositeSymptoms(recentEvents))

  // 우선순위 정렬
  return actions.sort((a, b) => b.priority - a.priority)
}

// ===== 리마인더 스케줄링 =====

const REMINDER_STORAGE_KEY = 'dodam_care_reminders'

export interface ScheduledReminder {
  id: string
  action: CareAction
  fireAt: number // timestamp
  fired: boolean
}

export function scheduleReminder(action: CareAction): ScheduledReminder | null {
  if (!action.remindAfterMin) return null

  const reminder: ScheduledReminder = {
    id: `reminder-${action.id}-${Date.now()}`,
    action,
    fireAt: Date.now() + action.remindAfterMin * 60 * 1000,
    fired: false,
  }

  // localStorage에 저장
  const existing = loadReminders()
  existing.push(reminder)
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(existing))

  return reminder
}

export function loadReminders(): ScheduledReminder[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function getDueReminders(): ScheduledReminder[] {
  const all = loadReminders()
  const now = Date.now()
  return all.filter(r => !r.fired && r.fireAt <= now)
}

export function markReminderFired(id: string) {
  const all = loadReminders()
  const updated = all.map(r => r.id === id ? { ...r, fired: true } : r)
  // 24시간 지난 리마인더 정리
  const cleaned = updated.filter(r => Date.now() - r.fireAt < 24 * 60 * 60 * 1000)
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(cleaned))
}
