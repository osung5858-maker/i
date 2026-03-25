import type { CareEvent } from '@/types'

interface PredictionResult {
  target: 'feed_next' | 'sleep_next'
  predicted_ts: string
  ci_minutes: number // ± 분
  confidence: 'low' | 'medium' | 'high'
}

// 데이터 충분 여부 체크
export function hasEnoughData(events: CareEvent[], type: 'feed' | 'sleep'): { enough: boolean; count: number; needed: number } {
  const count = events.filter((e) => e.type === type).length
  const needed = 10 // 최소 10건 (약 2-3일치)
  return { enough: count >= needed, count, needed }
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

  // 신뢰도: 데이터 충분 + 편차 적을수록 높음
  const confidence: 'low' | 'medium' | 'high' =
    intervals.length >= 20 && stdDev < 30 ? 'high' :
    intervals.length >= 10 && stdDev < 60 ? 'medium' : 'low'

  return {
    target: type === 'feed' ? 'feed_next' : 'sleep_next',
    predicted_ts: predictedTime.toISOString(),
    ci_minutes: Math.round(stdDev),
    confidence,
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

  // 체온 이상 감지
  const tempEvents = events.filter((e) => e.type === 'temp' && e.tags?.celsius)
  if (tempEvents.length > 0) {
    const latest = tempEvents.reduce((a, b) =>
      new Date(a.start_ts) > new Date(b.start_ts) ? a : b
    )
    const celsius = latest.tags?.celsius as number
    if (celsius >= 38.5) {
      anomalies.push({
        metric: 'temperature',
        message: `체온 ${celsius}°C — 고열이에요! 가까운 소아과를 확인해보세요.`,
        severity: 'critical',
      })
    } else if (celsius >= 37.5) {
      anomalies.push({
        metric: 'temperature',
        message: `체온 ${celsius}°C — 미열이에요. 경과를 살펴보세요.`,
        severity: 'major',
      })
    }
  }

  // 수면 패턴 이상 감지 (최근 3일 vs 이전 평균)
  const sleepEvents = events.filter((e) => e.type === 'sleep' && e.end_ts)
  if (sleepEvents.length >= 6) {
    const sorted = [...sleepEvents].sort((a, b) => new Date(b.start_ts).getTime() - new Date(a.start_ts).getTime())
    const recent3 = sorted.slice(0, 3)
    const older = sorted.slice(3, Math.min(sorted.length, 10))

    const avgDur = (arr: CareEvent[]) =>
      arr.reduce((s, e) => s + (new Date(e.end_ts!).getTime() - new Date(e.start_ts).getTime()) / 3600000, 0) / arr.length

    const recentAvg = avgDur(recent3)
    const olderAvg = avgDur(older)

    if (olderAvg > 0 && Math.abs(recentAvg - olderAvg) >= 2) {
      const direction = recentAvg > olderAvg ? '늘었어요' : '줄었어요'
      anomalies.push({
        metric: 'sleep_pattern',
        message: `최근 수면 시간이 평소보다 ${Math.abs(Math.round(recentAvg - olderAvg))}시간 ${direction}. 컨디션 변화를 살펴보세요.`,
        severity: 'major',
      })
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
