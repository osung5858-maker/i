'use client'

import { useMemo, useState } from 'react'
import type { CareEvent } from '@/types'

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
    <div className="flex items-end gap-1.5 h-28 px-1">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-[#212124]">{d.value || ''}</span>
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{
              height: maxVal > 0 ? `${Math.max((d.value / maxVal) * 80, d.value > 0 ? 4 : 0)}px` : '0px',
              backgroundColor: d.value > 0 ? color : '#ECECEC',
              minHeight: d.value > 0 ? 4 : 2,
            }}
          />
          <span className="text-[10px] text-[#6B6966]">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// 수면 히트맵 (24시간 × 7일)
function SleepHeatmap({ events, dates }: { events: CareEvent[]; dates: string[] }) {
  const grid = useMemo(() => {
    const map: Record<string, Set<number>> = {}
    dates.forEach((d) => (map[d] = new Set()))

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
  }, [events, dates])

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[300px]">
        <div className="flex gap-0.5">
          <div className="w-6" />
          {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
            <div key={h} className="flex-1 text-[9px] text-[#9E9A95] text-center">{h}</div>
          ))}
        </div>
        {dates.map((date) => (
          <div key={date} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-6 text-[9px] text-[#6B6966] shrink-0">{getDayLabel(date)}</span>
            <div className="flex-1 flex gap-px">
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="flex-1 h-3 rounded-sm"
                  style={{
                    backgroundColor: grid[date]?.has(h) ? '#5B6DFF' : '#F0F2FF',
                    opacity: grid[date]?.has(h) ? 0.8 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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
    insights.push('수유 횟수가 늘어나고 있어요. 성장 급등기일 수 있어요 📈')
  } else if (recentAvg < prevAvg * 0.8 && prevAvg > 0) {
    insights.push(`수유 횟수가 줄어드는 추세예요. ${ageMonths >= 5 ? '이유식 시작 시기일 수 있어요 🍚' : '컨디션을 살펴보세요'}`)
  }

  // 수면 패턴
  const sleepEvents = events.filter((e) => e.type === 'sleep' && e.end_ts)
  const nightFeeds = events.filter((e) => {
    if (e.type !== 'feed') return false
    const h = new Date(e.start_ts).getHours()
    return h >= 0 && h < 5
  })
  if (nightFeeds.length === 0 && events.length > 10) {
    insights.push('최근 새벽 수유가 없어요. 통잠 징후일 수 있어요! 🎉')
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
    insights.push(`규칙적인 패턴을 유지하고 있어요. 도담하게 잘하고 있어요 👏`)
  }

  return insights.slice(0, 3)
}

export default function StatsReport({ events, ageMonths }: Props) {
  const [period, setPeriod] = useState<Period>('weekly')

  const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30
  const dates = useMemo(() => getRecentDates(days), [days])
  const grouped = useMemo(() => groupByDate(events), [events])

  // 통계 계산
  const feedData = dates.map((d) => ({
    label: period === 'monthly' ? d.slice(8) : getDayLabel(d),
    value: (grouped[d] || []).filter((e) => e.type === 'feed').length,
  }))
  const poopData = dates.map((d) => ({
    label: period === 'monthly' ? d.slice(8) : getDayLabel(d),
    value: (grouped[d] || []).filter((e) => e.type === 'poop' || e.type === 'pee').length,
  }))

  const avgFeed = dates.length > 0
    ? (feedData.reduce((a, b) => a + b.value, 0) / dates.filter((d) => (grouped[d] || []).length > 0).length || 0).toFixed(1)
    : '0'
  const avgSleep = (() => {
    let totalMin = 0, count = 0
    events.filter((e) => e.type === 'sleep' && e.end_ts).forEach((e) => {
      const diff = (new Date(e.end_ts!).getTime() - new Date(e.start_ts).getTime()) / 60000
      if (diff > 0 && diff < 1440) { totalMin += diff; count++ }
    })
    return count > 0 ? (totalMin / count / 60).toFixed(1) : '0'
  })()

  const insights = useMemo(() => generateInsights(events, ageMonths), [events, ageMonths])
  const maxFeed = Math.max(...feedData.map((d) => d.value), 1)
  const maxPoop = Math.max(...poopData.map((d) => d.value), 1)

  return (
    <div className="space-y-4 px-5 pb-8">
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
            className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
              period === tab.key
                ? 'bg-[#3D8A5A] text-white'
                : 'bg-[#E8E4DF] text-[#6B6966]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 수유 카드 */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold text-[#212124]">🍼 수유</h3>
          <span className="text-[12px] text-[#3D8A5A] font-semibold">하루 평균 {avgFeed}회</span>
        </div>
        {period !== 'daily' ? (
          <BarChart data={feedData} maxVal={maxFeed} color="#FF6F0F" />
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl font-bold text-[#FF6F0F]">{feedData[0]?.value || 0}<span className="text-sm text-[#6B6966] ml-1">회</span></p>
            <p className="text-[12px] text-[#6B6966] mt-1">오늘 수유</p>
          </div>
        )}
      </div>

      {/* 수면 카드 */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold text-[#212124]">💤 수면</h3>
          <span className="text-[12px] text-[#5B6DFF] font-semibold">평균 {avgSleep}시간</span>
        </div>
        {period !== 'daily' && dates.length <= 7 ? (
          <SleepHeatmap events={events} dates={dates} />
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl font-bold text-[#5B6DFF]">{avgSleep}<span className="text-sm text-[#6B6966] ml-1">시간</span></p>
            <p className="text-[12px] text-[#6B6966] mt-1">{period === 'daily' ? '오늘 수면' : '일 평균 수면'}</p>
          </div>
        )}
      </div>

      {/* 배변 카드 */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold text-[#212124]">🩲 배변</h3>
          <span className="text-[12px] text-[#C68A2E] font-semibold">
            하루 평균 {(poopData.reduce((a, b) => a + b.value, 0) / Math.max(dates.filter((d) => (grouped[d] || []).length > 0).length, 1)).toFixed(1)}회
          </span>
        </div>
        {period !== 'daily' ? (
          <BarChart data={poopData} maxVal={maxPoop} color="#C68A2E" />
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl font-bold text-[#C68A2E]">{poopData[0]?.value || 0}<span className="text-sm text-[#6B6966] ml-1">회</span></p>
            <p className="text-[12px] text-[#6B6966] mt-1">오늘 배변</p>
          </div>
        )}
      </div>

      {/* AI 인사이트 */}
      <div className="bg-white rounded-2xl border-l-4 border-l-[#3D8A5A] border border-[#E8E4DF] p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">🤖</span>
          <h3 className="text-[13px] font-bold text-[#3D8A5A]">AI 인사이트</h3>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <p key={i} className="text-[13px] text-[#212124] leading-relaxed">• {insight}</p>
          ))}
        </div>
        <p className="text-[10px] text-[#9E9A95] mt-3">⚠️ 참고용 정보예요. 걱정되시면 소아과 상담을 추천드려요.</p>
      </div>

      {/* 공유 버튼 */}
      <button
        onClick={() => {
          const description = `수유 하루 평균 ${avgFeed}회 · 수면 평균 ${avgSleep}시간 · ${insights[0] || ''}`
          const url = 'https://www.dodam.life/growth'

          if (typeof window !== 'undefined' && window.Kakao?.isInitialized?.()) {
            window.Kakao.Share.sendDefault({
              objectType: 'feed',
              content: {
                title: '도담 주간 리포트 📊',
                description,
                imageUrl: 'https://www.dodam.life/og-image.png',
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
              title: '도담 주간 리포트 📊',
              text: description,
              url,
            }).catch(() => {})
          } else {
            alert('공유 기능을 사용할 수 없어요.')
          }
        }}
        className="w-full py-3 text-[13px] font-semibold text-[#3D8A5A] text-center active:opacity-70"
      >
        📤 리포트 공유하기
      </button>
    </div>
  )
}
