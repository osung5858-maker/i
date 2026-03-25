'use client'

import { useMemo } from 'react'
import type { CareEvent } from '@/types'
import { predictNextEvent, detectAnomalies, hasEnoughData } from '@/lib/ai/prediction-engine'
import EmergencyCard from '@/components/ai-cards/EmergencyCard'
import RewardBanner from '@/components/ai-cards/RewardBanner'
import RoutineTimelapse from '@/components/ai-cards/RoutineTimelapse'
import CheckupBanner from '@/components/ai-cards/CheckupBanner'
import AICardFeed from '@/components/ai-cards/AICardFeed'
import MonthlyCalendar from '@/components/reward/MonthlyCalendar'
import SmartReminder from '@/components/reminder/SmartReminder'

function formatTimeRemaining(ts: string): string {
  const diff = new Date(ts).getTime() - Date.now()
  if (diff < 0) return '곧'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `약 ${mins}분 후`
  const hrs = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `약 ${hrs}시간 ${m}분 후` : `약 ${hrs}시간 후`
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

interface Props {
  events: CareEvent[]
  birthdate?: string
  childName: string
}

export default function InsightHub({ events, birthdate, childName }: Props) {
  const feedPred = useMemo(() => predictNextEvent(events, 'feed'), [events])
  const sleepPred = useMemo(() => predictNextEvent(events, 'sleep'), [events])
  const anomalies = useMemo(() => detectAnomalies(events), [events])
  const feedDataCheck = useMemo(() => hasEnoughData(events, 'feed'), [events])
  const sleepDataCheck = useMemo(() => hasEnoughData(events, 'sleep'), [events])

  const todayFeedCount = events.filter((e) => e.type === 'feed').length
  const todaySleepCount = events.filter((e) => e.type === 'sleep' && e.end_ts).length

  // AI 요약 텍스트 생성
  const summaryText = useMemo(() => {
    const parts: string[] = []
    if (todayFeedCount > 0) parts.push(`수유 ${todayFeedCount}회`)
    if (todaySleepCount > 0) parts.push(`낮잠 ${todaySleepCount}회`)
    if (parts.length === 0) return `${childName}의 오늘 기록이 아직 없어요.\n첫 기록을 남겨보세요!`

    const base = `${childName}가 오전에 ${parts.join(', ')}로\n꾸준한 리듬을 유지하고 있어요.`
    if (feedPred) {
      return `${base}\n${formatTime(feedPred.predicted_ts)}쯤 다음 수유가 예상돼요 🍼`
    }
    return base
  }, [childName, todayFeedCount, todaySleepCount, feedPred])

  // 상태 칩 계산
  const statusChips = useMemo(() => {
    const chips: { label: string; color: string; bg: string }[] = []
    const hasCritical = anomalies.some((a) => a.severity === 'critical')
    const hasMajor = anomalies.some((a) => a.severity === 'major')

    if (hasCritical) {
      chips.push({ label: '주의 필요', color: 'text-red-700', bg: 'bg-red-50' })
    } else if (hasMajor) {
      chips.push({ label: '관찰 필요', color: 'text-orange-700', bg: 'bg-orange-50' })
    } else if (events.length >= 3) {
      chips.push({ label: '리듬 안정 🟢', color: 'text-[#2D6B45]', bg: 'bg-[var(--color-accent-bg)]' })
    }

    if (todaySleepCount >= 1) {
      chips.push({ label: '수면 충분', color: 'text-[#5B4A8A]', bg: 'bg-[#E8E0F8]' })
    }
    if (todayFeedCount >= 2) {
      chips.push({ label: '수유량 정상', color: 'text-[#B8652A]', bg: 'bg-[#FEF0E8]' })
    }
    return chips
  }, [anomalies, events.length, todaySleepCount, todayFeedCount])

  const now = new Date()
  const updateTime = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <div>
      {/* 긴급 알림 (있을 때만) */}
      <EmergencyCard events={events} />

      {/* AI 데일리 요약 히어로 */}
      <div className="mx-4 mb-3 bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(26,25,24,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px]">✨</span>
            <span className="text-[14px] font-bold text-[#212124]">오늘의 AI 인사이트</span>
          </div>
          <span className="text-[13px] text-[#9E9A95]">{updateTime} 업데이트</span>
        </div>
        <p className="text-[14px] text-[#5A5854] leading-relaxed whitespace-pre-line mb-3">
          {summaryText}
        </p>
        {statusChips.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {statusChips.map((chip) => (
              <span
                key={chip.label}
                className={`${chip.bg} ${chip.color} text-[13px] font-semibold px-3 py-1.5 rounded-full`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 다음 예측 카드 2열 */}
      {(feedPred || sleepPred) ? (
        <div className="mx-4 mb-3 grid grid-cols-2 gap-3">
          {feedPred && (
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(26,25,24,0.03)]">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-accent-bg)] flex items-center justify-center">
                  <span className="text-[14px]">🍼</span>
                </div>
                <span className="text-[14px] font-semibold text-[#212124]">다음 수유</span>
              </div>
              <p className="text-[22px] font-bold text-[#212124] mb-1">
                {formatTime(feedPred.predicted_ts)}
              </p>
              <p className="text-[13px] text-[#9E9A95] mb-2.5">
                {formatTimeRemaining(feedPred.predicted_ts)} · ±{feedPred.ci_minutes}분
              </p>
              <div className="w-full h-1 bg-[#E8E6E1] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4A9B6E] rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(10, 100 - ((new Date(feedPred.predicted_ts).getTime() - Date.now()) / (3 * 3600000)) * 100))}%` }}
                />
              </div>
              {feedPred.confidence === 'low' && (
                <p className="text-[11px] text-[#9E9A95] mt-2">도담이가 아직 배우는 중이에요</p>
              )}
            </div>
          )}
          {sleepPred && (
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(26,25,24,0.03)]">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E8E0F8] flex items-center justify-center">
                  <span className="text-[14px]">💤</span>
                </div>
                <span className="text-[14px] font-semibold text-[#212124]">다음 낮잠</span>
              </div>
              <p className="text-[22px] font-bold text-[#212124] mb-1">
                {formatTime(sleepPred.predicted_ts)}
              </p>
              <p className="text-[13px] text-[#9E9A95] mb-2.5">
                {formatTimeRemaining(sleepPred.predicted_ts)} · ±{sleepPred.ci_minutes}분
              </p>
              <div className="w-full h-1 bg-[#E8E6E1] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7B6DB0] rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(10, 100 - ((new Date(sleepPred.predicted_ts).getTime() - Date.now()) / (3 * 3600000)) * 100))}%` }}
                />
              </div>
              {sleepPred.confidence === 'low' && (
                <p className="text-[11px] text-[#9E9A95] mt-2">도담이가 아직 배우는 중이에요</p>
              )}
            </div>
          )}
        </div>
      ) : (!feedDataCheck.enough || !sleepDataCheck.enough) && events.length > 0 ? (
        <div className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(26,25,24,0.03)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[14px]">🌱</span>
            <span className="text-[14px] font-semibold text-[#212124]">루틴 예보 학습 중</span>
          </div>
          <p className="text-[13px] text-[#5A5854] leading-relaxed">
            도담이가 {childName}의 패턴을 배우고 있어요.
            {!feedDataCheck.enough && ` 수유 ${feedDataCheck.count}/${feedDataCheck.needed}건`}
            {!feedDataCheck.enough && !sleepDataCheck.enough && ' ·'}
            {!sleepDataCheck.enough && ` 수면 ${sleepDataCheck.count}/${sleepDataCheck.needed}건`}
          </p>
          <div className="mt-2 w-full h-1.5 bg-[#E8E6E1] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4A9B6E] rounded-full transition-all"
              style={{ width: `${Math.min(100, ((feedDataCheck.count + sleepDataCheck.count) / (feedDataCheck.needed + sleepDataCheck.needed)) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* 스마트 리마인더 */}
      <SmartReminder events={events} />

      {/* 루틴 패턴 */}
      <RoutineTimelapse events={events} />

      {/* 연속 기록 배너 */}
      <RewardBanner events={events} />

      {/* 검진·접종 일정 */}
      {birthdate && <CheckupBanner birthdate={birthdate} />}

      {/* 월간 스토리 캘린더 */}
      <div className="mx-4 mb-3">
        <MonthlyCalendar events={events} />
      </div>

      {/* AI 카드 피드 (이상 감지, 감정 카드 등) */}
      <AICardFeed events={events} />

      {/* 기록 부족 안내 */}
      {events.length < 3 && (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-[#9E9A95]">기록이 쌓이면 더 정확한 인사이트가 나타나요</p>
        </div>
      )}
    </div>
  )
}
