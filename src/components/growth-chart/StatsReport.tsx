'use client'

import { useMemo, useState } from 'react'
import type { CareEvent } from '@/types'
import { BottleIcon, MoonIcon, DiaperIcon, SparkleIcon, ShareIcon } from '@/components/ui/Icons'

interface Props {
  events: CareEvent[]
  ageMonths: number
}

type Period = 'daily' | 'weekly' | 'monthly'

function groupByDate(events: CareEvent[]): Record<string, CareEvent[]> {
  const groups: Record<string, CareEvent[]> = {}
  events.forEach((e) => {
    const date = e.start_ts.split('T')[0]
    if (!groups[date]) groups[date] = []
    groups[date].push(e)
  })
  return groups
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
}

function getRecentDates(days: number): string[] {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

// 간단 바 차트 컴포넌트
function BarChart({ data, maxVal, color }: { data: { label: string; value: number }[]; maxVal: number; color: string }) {
  return (
    <div className="flex items-end gap-1.5 h-32 px-1">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-body font-bold text-primary">{d.value || ''}</span>
          <div
            className="w-full rounded-t-lg transition-all duration-500"
            style={{
              height: maxVal > 0 ? `${Math.max((d.value / maxVal) * 88, d.value > 0 ? 8 : 0)}px` : '0px',
              backgroundColor: d.value > 0 ? color : '#E0DCD6',
              minHeight: d.value > 0 ? 8 : 3,
            }}
          />
          <span className="text-caption font-medium text-[#4A4744]">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// 수면 히트맵 (24시간 × N일, 월간도 지원)
function SleepHeatmap({ events, dates }: { events: CareEvent[]; dates: string[] }) {
  // 월간일 때는 최근 7일만 히트맵으로 표시하고, 주간 요약 추가
  const displayDates = dates.length > 14 ? dates.slice(-7) : dates
  const grid = useMemo(() => {
    const map: Record<string, Set<number>> = {}
    displayDates.forEach((d) => (map[d] = new Set()))

    events
      .filter((e) => e.type === 'sleep')
      .forEach((e) => {
        const date = e.start_ts.split('T')[0]
        if (!map[date]) return
        const startH = new Date(e.start_ts).getHours()
        const endH = e.end_ts ? new Date(e.end_ts).getHours() : startH + 1
        for (let h = startH; h <= Math.min(endH, 23); h++) {
          map[date].add(h)
        }
      })
    return map
  }, [events, displayDates])

  // 월간일 때 주별 수면 시간 요약
  const weeklySummary = useMemo(() => {
    if (dates.length <= 14) return null
    const weeks: { label: string; hours: number }[] = []
    for (let w = 0; w < 4; w++) {
      const weekDates = dates.slice(w * 7, (w + 1) * 7)
      let totalMin = 0
      events.filter((e) => e.type === 'sleep' && e.end_ts).forEach((e) => {
        const d = e.start_ts.split('T')[0]
        if (weekDates.includes(d)) {
          const diff = (new Date(e.end_ts!).getTime() - new Date(e.start_ts).getTime()) / 60000
          if (diff > 0 && diff < 1440) totalMin += diff
        }
      })
      const avgH = weekDates.length > 0 ? totalMin / weekDates.length / 60 : 0
      weeks.push({ label: `${w + 1}주`, hours: Math.round(avgH * 10) / 10 })
    }
    return weeks
  }, [events, dates])

  return (
    <div className="space-y-3">
      {weeklySummary && (
        <div className="flex gap-2">
          {weeklySummary.map((w, i) => (
            <div key={i} className="flex-1 text-center bg-[#F0EDF6] rounded-lg py-2">
              <p className="text-label text-secondary">{w.label}</p>
              <p className="text-body-emphasis font-bold text-[#4A5AE8]">{w.hours}h</p>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-[300px]">
          <div className="flex gap-0.5">
            <div className="w-6" />
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
              <div key={h} className="flex-1 text-label text-secondary font-medium text-center">{h}</div>
            ))}
          </div>
          {displayDates.map((date) => (
            <div key={date} className="flex items-center gap-0.5 mb-0.5">
              <span className="w-6 text-label text-[#4A4744] font-medium shrink-0">{getDayLabel(date)}</span>
              <div className="flex-1 flex gap-px">
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="flex-1 h-4 rounded-sm"
                    style={{
                      backgroundColor: grid[date]?.has(h) ? '#4A5AE8' : '#E8E4F0',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          {dates.length > 14 && (
            <p className="text-label text-[#7A7672] mt-1 text-center">최근 7일 수면 패턴</p>
          )}
        </div>
      </div>
    </div>
  )
}

// 전주 대비 트렌드 계산
function calcTrend(events: CareEvent[], type: string, days: number): { delta: number; arrow: string; color: string } | null {
  if (days < 7) return null
  const now = new Date()
  const thisWeek: number[] = []
  const lastWeek: number[] = []
  for (let i = 0; i < 7; i++) {
    const d1 = new Date(now); d1.setDate(d1.getDate() - i)
    const d2 = new Date(now); d2.setDate(d2.getDate() - 7 - i)
    const k1 = d1.toISOString().split('T')[0]
    const k2 = d2.toISOString().split('T')[0]
    thisWeek.push(events.filter((e) => e.type === type && e.start_ts.startsWith(k1)).length)
    lastWeek.push(events.filter((e) => e.type === type && e.start_ts.startsWith(k2)).length)
  }
  const avg1 = thisWeek.reduce((a, b) => a + b, 0) / 7
  const avg2 = lastWeek.reduce((a, b) => a + b, 0) / 7
  if (avg2 === 0) return null
  const pct = Math.round(((avg1 - avg2) / avg2) * 100)
  if (pct === 0) return { delta: 0, arrow: '→', color: '#7A7672' }
  return pct > 0
    ? { delta: pct, arrow: '↑', color: '#E85D4A' }
    : { delta: Math.abs(pct), arrow: '↓', color: '#4A5AE8' }
}

// AI 인사이트 생성 (로컬, API 호출 없이)
function generateInsights(events: CareEvent[], ageMonths: number): string[] {
  const insights: string[] = []
  const dates = getRecentDates(7)
  const grouped = groupByDate(events)

  // 수유 트렌드
  const feedCounts = dates.map((d) => (grouped[d] || []).filter((e) => e.type === 'feed').length)
  const recentAvg = feedCounts.slice(-3).reduce((a, b) => a + b, 0) / 3
  const prevAvg = feedCounts.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  if (recentAvg > prevAvg * 1.2) {
    insights.push('수유 횟수가 늘어나고 있어요. 성장 급등기일 수 있어요')
  } else if (recentAvg < prevAvg * 0.8 && prevAvg > 0) {
    insights.push(`수유 횟수가 줄어드는 추세예요. ${ageMonths >= 5 ? '이유식 시작 시기일 수 있어요' : '컨디션을 살펴보세요'}`)
  }

  // 수면 패턴
  const nightFeeds = events.filter((e) => {
    if (e.type !== 'feed') return false
    const h = new Date(e.start_ts).getHours()
    return h >= 0 && h < 5
  })
  if (nightFeeds.length === 0 && events.length > 10) {
    insights.push('최근 새벽 수유가 없어요. 통잠 징후일 수 있어요!')
  }

  // 배변 패턴
  const poopCounts = dates.map((d) => (grouped[d] || []).filter((e) => e.type === 'poop').length)
  const totalPoops = poopCounts.reduce((a, b) => a + b, 0)
  if (totalPoops === 0 && events.length > 5) {
    insights.push('최근 배변 기록이 없어요. 경과를 관찰해보세요')
  }

  // 체온
  const tempEvents = events.filter((e) => e.type === 'temp' && e.tags?.celsius)
  const highTemps = tempEvents.filter((e) => Number(e.tags?.celsius) >= 37.5)
  if (highTemps.length > 0) {
    insights.push(`체온 ${Number(highTemps[0].tags?.celsius)}°C 기록이 있어요. 이후 수유/수면 패턴 변화를 확인해보세요`)
  }

  if (insights.length === 0) {
    insights.push(`규칙적인 패턴을 유지하고 있어요. 도담하게 잘하고 있어요`)
  }

  return insights.slice(0, 3)
}

export default function StatsReport({ events, ageMonths }: Props) {
  const [period, setPeriod] = useState<Period>('weekly')

  const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30
  const dates = useMemo(() => getRecentDates(days), [days])
  const grouped = useMemo(() => groupByDate(events), [events])

  // 통계 계산 — 월간은 주별 그룹핑
  const chartDates = useMemo(() => {
    if (period !== 'monthly') return null
    const weeks: { label: string; dates: string[] }[] = []
    for (let w = 0; w < 4; w++) {
      const wDates = dates.slice(w * 7, (w + 1) * 7)
      weeks.push({ label: `${w + 1}주`, dates: wDates })
    }
    if (dates.length > 28) weeks.push({ label: '5주', dates: dates.slice(28) })
    return weeks
  }, [period, dates])

  const feedData = useMemo(() => chartDates
    ? chartDates.map((w) => ({
        label: w.label,
        value: Math.round(w.dates.reduce((s, d) => s + (grouped[d] || []).filter((e) => e.type === 'feed').length, 0) / Math.max(w.dates.length, 1)),
      }))
    : dates.map((d) => ({
        label: getDayLabel(d),
        value: (grouped[d] || []).filter((e) => e.type === 'feed').length,
      })), [chartDates, dates, grouped])

  const poopData = useMemo(() => chartDates
    ? chartDates.map((w) => ({
        label: w.label,
        value: Math.round(w.dates.reduce((s, d) => s + (grouped[d] || []).filter((e) => e.type === 'poop' || e.type === 'pee').length, 0) / Math.max(w.dates.length, 1)),
      }))
    : dates.map((d) => ({
        label: getDayLabel(d),
        value: (grouped[d] || []).filter((e) => e.type === 'poop' || e.type === 'pee').length,
      })), [chartDates, dates, grouped])

  const avgFeed = useMemo(() => dates.length > 0
    ? (feedData.reduce((a, b) => a + b.value, 0) / dates.filter((d) => (grouped[d] || []).length > 0).length || 0).toFixed(1)
    : '0', [feedData, dates, grouped])

  const avgSleep = useMemo(() => {
    let totalMin = 0, count = 0
    events.filter((e) => e.type === 'sleep' && e.end_ts).forEach((e) => {
      const diff = (new Date(e.end_ts!).getTime() - new Date(e.start_ts).getTime()) / 60000
      if (diff > 0 && diff < 1440) { totalMin += diff; count++ }
    })
    return count > 0 ? (totalMin / count / 60).toFixed(1) : '0'
  }, [events])

  const insights = useMemo(() => generateInsights(events, ageMonths), [events, ageMonths])
  const maxFeed = Math.max(...feedData.map((d) => d.value), 1)
  const maxPoop = Math.max(...poopData.map((d) => d.value), 1)

  const feedTrend = useMemo(() => calcTrend(events, 'feed', days), [events, days])
  const poopTrend = useMemo(() => calcTrend(events, 'poop', days), [events, days])

  return (
    <div className="space-y-4 pb-8">
      {/* 기간 탭 */}
      <div className="flex gap-2 justify-center pt-2">
        {([
          { key: 'daily' as Period, label: '일간' },
          { key: 'weekly' as Period, label: '주간' },
          { key: 'monthly' as Period, label: '월간' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`px-4 py-1.5 rounded-full text-body-emphasis transition-colors ${
              period === tab.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[#D5D0CA] text-[#4A4744]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 수유 카드 */}
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-subtitle text-primary flex items-center gap-1.5"><BottleIcon className="w-4 h-4" /> 수유</h3>
            {feedTrend && (
              <span className="text-caption font-semibold" style={{ color: feedTrend.color }}>
                {feedTrend.arrow} {feedTrend.delta}%
              </span>
            )}
          </div>
          <span className="text-body-emphasis text-[#2D7A4A] font-bold">하루 평균 {avgFeed}회</span>
        </div>
        {period !== 'daily' ? (
          <BarChart data={feedData} maxVal={maxFeed} color="var(--color-primary)" />
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl font-bold text-[var(--color-primary)]">{feedData[0]?.value || 0}<span className="text-sm text-[#4A4744] ml-1">회</span></p>
            <p className="text-body text-[#4A4744] mt-1">오늘 수유</p>
          </div>
        )}
      </div>

      {/* 수면 카드 */}
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-subtitle text-primary flex items-center gap-1.5"><MoonIcon className="w-4 h-4" /> 수면</h3>
          <span className="text-body-emphasis text-[#4A5AE8] font-bold">평균 {avgSleep}시간</span>
        </div>
        {period !== 'daily' ? (
          <SleepHeatmap events={events} dates={dates} />
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl font-bold text-[#5B6DFF]">{avgSleep}<span className="text-sm text-[#4A4744] ml-1">시간</span></p>
            <p className="text-body text-[#4A4744] mt-1">오늘 수면</p>
          </div>
        )}
      </div>

      {/* 배변 카드 */}
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-subtitle text-primary flex items-center gap-1.5"><DiaperIcon className="w-4 h-4" /> 배변</h3>
            {poopTrend && (
              <span className="text-caption font-semibold" style={{ color: poopTrend.color }}>
                {poopTrend.arrow} {poopTrend.delta}%
              </span>
            )}
          </div>
          <span className="text-body-emphasis text-[#A87420] font-bold">
            하루 평균 {(poopData.reduce((a, b) => a + b.value, 0) / Math.max(dates.filter((d) => (grouped[d] || []).length > 0).length, 1)).toFixed(1)}회
          </span>
        </div>
        {period !== 'daily' ? (
          <BarChart data={poopData} maxVal={maxPoop} color="#C68A2E" />
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl font-bold text-[#C68A2E]">{poopData[0]?.value || 0}<span className="text-sm text-[#4A4744] ml-1">회</span></p>
            <p className="text-body text-[#4A4744] mt-1">오늘 배변</p>
          </div>
        )}
      </div>

      {/* AI 인사이트 */}
      <div className="bg-white rounded-2xl border-l-4 border-l-[var(--color-primary)] border border-[#D5D0CA] shadow-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <SparkleIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <h3 className="text-body font-bold text-[var(--color-primary)]">AI 인사이트</h3>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <p key={i} className="text-body text-primary leading-relaxed">• {insight}</p>
          ))}
        </div>
        <p className="text-caption text-[#7A7672] mt-3">참고용 정보예요. 걱정되시면 소아과 상담을 추천드려요.</p>
      </div>

      {/* 공유 버튼 */}
      <button
        onClick={() => {
          const description = `수유 하루 평균 ${avgFeed}회 · 수면 평균 ${avgSleep}시간 · ${insights[0] || ''}`
          const url = 'https://i.dodam.life/growth'

          if (typeof window !== 'undefined' && window.Kakao?.isInitialized?.()) {
            window.Kakao.Share.sendDefault({
              objectType: 'feed',
              content: {
                title: '도담 주간 리포트',
                description,
                imageUrl: 'https://i.dodam.life/og-image.png',
                link: { mobileWebUrl: url, webUrl: url },
              },
              buttons: [
                {
                  title: '도담에서 확인하기',
                  link: { mobileWebUrl: url, webUrl: url },
                },
              ],
            })
          } else if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({
              title: '도담 주간 리포트',
              text: description,
              url,
            }).catch(() => {})
          } else {
            window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '공유 기능을 사용할 수 없어요' } }))
          }
        }}
        className="w-full py-3 text-body font-semibold text-[var(--color-primary)] text-center active:opacity-70"
      >
        <span className="inline-flex items-center gap-1"><ShareIcon className="w-4 h-4 inline" /> 리포트 공유하기</span>
      </button>
    </div>
  )
}
