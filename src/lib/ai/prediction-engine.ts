import type { CareEvent } from '@/types'

interface PredictionResult {
  target: 'feed_next' | 'sleep_next'
  predicted_ts: string
  ci_minutes: number // ± 분
}

// 이동 평균 + 최근 3일 가중치 기반 예측
export function predictNextEvent(
  events: CareEvent[],
  type: 'feed' | 'sleep'
): PredictionResult | null {
  const typeEvents = events
    .filter((e) => e.type === type)
    .sort((a, b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime())

  if (typeEvents.length < 3) return null

  // 이벤트 간 간격 계산 (분)
  const intervals: number[] = []
  for (let i = 1; i < typeEvents.length; i++) {
    const diff = (new Date(typeEvents[i].start_ts).getTime() - new Date(typeEvents[i - 1].start_ts).getTime()) / 60000
    if (diff > 0 && diff < 1440) intervals.push(diff) // 24시간 이내만
  }

  if (intervals.length < 2) return null

  // 지수 가중 이동 평균 (최근 데이터에 가중치)
  const alpha = 0.4
  let ema = intervals[0]
  for (let i = 1; i < intervals.length; i++) {
    ema = alpha * intervals[i] + (1 - alpha) * ema
  }

  // 표준편차 (신뢰 구간)
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / intervals.length
  const stdDev = Math.sqrt(variance)

  // 마지막 이벤트 + 예측 간격
  const lastEvent = typeEvents[typeEvents.length - 1]
  const predictedTime = new Date(new Date(lastEvent.start_ts).getTime() + ema * 60000)

  return {
    target: type === 'feed' ? 'feed_next' : 'sleep_next',
    predicted_ts: predictedTime.toISOString(),
    ci_minutes: Math.round(stdDev),
  }
}

// 이상 감지 (Z-score 기반)
export function detectAnomalies(events: CareEvent[]): {
  metric: string
  message: string
  severity: 'info' | 'major' | 'critical'
}[] {
  const anomalies: { metric: string; message: string; severity: 'info' | 'major' | 'critical' }[] = []

  // 수유량 감소 감지
  const feeds = events.filter((e) => e.type === 'feed' && e.amount_ml)
  if (feeds.length >= 6) {
    const recent3 = feeds.slice(-3)
    const older = feeds.slice(-6, -3)
    const recentAvg = recent3.reduce((s, e) => s + (e.amount_ml || 0), 0) / recent3.length
    const olderAvg = older.reduce((s, e) => s + (e.amount_ml || 0), 0) / older.length

    if (olderAvg > 0) {
      const change = ((recentAvg - olderAvg) / olderAvg) * 100
      if (change <= -30) {
        anomalies.push({
          metric: 'feed_amount',
          message: `최근 수유량이 평소보다 ${Math.abs(Math.round(change))}% 줄었어요. 컨디션을 살펴보세요.`,
          severity: 'major',
        })
      }
    }
  }

  // 기록 공백 감지
  if (events.length > 0) {
    const latest = events.reduce((a, b) =>
      new Date(a.start_ts) > new Date(b.start_ts) ? a : b
    )
    const hoursSince = (Date.now() - new Date(latest.start_ts).getTime()) / 3600000
    if (hoursSince >= 12) {
      anomalies.push({
        metric: 'record_gap',
        message: '오늘 기록이 없어요. 괜찮으신 거죠?',
        severity: 'info',
      })
    }
  }

  return anomalies
}
