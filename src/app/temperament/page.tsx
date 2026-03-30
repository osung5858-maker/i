'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageLayout'
import { createClient } from '@/lib/supabase/client'
import type { Child, CareEvent } from '@/types'

interface TemperamentResult {
  type: string
  emoji: string
  title: string
  description: string
  scores: { regularity: number; activity: number; adaptability: number; sensitivity: number }
  strengths: string[]
  parentingTips: string[]
  funFact: string
}

function getAgeMonths(birthdate: string): number {
  const birth = new Date(birthdate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] text-[#6B6966] w-14 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-[#F0EDE8] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(5, value))}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[13px] font-semibold text-[#1A1918] w-8 text-right">{value}</span>
    </div>
  )
}

export default function TemperamentPage() {
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<TemperamentResult | null>(null)
  const [error, setError] = useState('')
  const [dayCount, setDayCount] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }

      const { data: children } = await supabase
        .from('children').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1)

      if (!children || children.length === 0) { router.push('/settings/children/add'); return }
      setChild(children[0] as Child)
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function analyze() {
    if (!child) return
    setAnalyzing(true)
    setError('')
    setResult(null)

    try {
      // Fetch events from the last 30 days
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const { data: events } = await supabase
        .from('events').select('id,type,start_ts,end_ts,amount_ml,tags')
        .eq('child_id', child.id)
        .gte('start_ts', since.toISOString())
        .order('start_ts', { ascending: true })

      if (!events || events.length === 0) {
        setDayCount(0)
        setError('기록된 데이터가 없어요.')
        setAnalyzing(false)
        return
      }

      // Calculate unique days
      const daySet = new Set(events.map((e: CareEvent) => e.start_ts.slice(0, 10)))
      const totalDays = daySet.size
      setDayCount(totalDays)

      if (totalDays < 7) {
        setError(`기록이 ${totalDays}일밖에 없어요. 7일 이상 필요해요.`)
        setAnalyzing(false)
        return
      }

      // Analyze patterns
      const feeds = events.filter((e: CareEvent) => e.type === 'feed')
      const sleeps = events.filter((e: CareEvent) => e.type === 'sleep')

      const avgFeedPerDay = Math.round((feeds.length / totalDays) * 10) / 10
      const avgSleepPerDay = Math.round((sleeps.length / totalDays) * 10) / 10
      const avgActivityPerDay = Math.round((events.length / totalDays) * 10) / 10

      // Standard deviation of feed times (hour of day)
      const feedHours = feeds.map((e: CareEvent) => new Date(e.start_ts).getHours() + new Date(e.start_ts).getMinutes() / 60)
      const feedTimeStdDev = feedHours.length > 1 ? calcStdDev(feedHours) : 0

      // Standard deviation of sleep times
      const sleepHours = sleeps.map((e: CareEvent) => new Date(e.start_ts).getHours() + new Date(e.start_ts).getMinutes() / 60)
      const sleepTimeStdDev = sleepHours.length > 1 ? calcStdDev(sleepHours) : 0

      // Pattern change adaptation (simplified: compare first half vs second half daily counts)
      const sortedDays = Array.from(daySet).sort()
      const midIdx = Math.floor(sortedDays.length / 2)
      const firstHalfDays = new Set(sortedDays.slice(0, midIdx))
      const secondHalfDays = new Set(sortedDays.slice(midIdx))
      const firstHalfAvg = events.filter((e: CareEvent) => firstHalfDays.has(e.start_ts.slice(0, 10))).length / Math.max(1, firstHalfDays.size)
      const secondHalfAvg = events.filter((e: CareEvent) => secondHalfDays.has(e.start_ts.slice(0, 10))).length / Math.max(1, secondHalfDays.size)
      const patternChangeAdaptDays = Math.round(Math.abs(firstHalfAvg - secondHalfAvg))

      const ageMonths = getAgeMonths(child.birthdate)

      const res = await fetch('/api/ai-temperament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: child.name,
          ageMonths,
          totalDays,
          avgFeedPerDay,
          avgSleepPerDay,
          avgActivityPerDay,
          feedTimeStdDev: Math.round(feedTimeStdDev * 60),
          sleepTimeStdDev: Math.round(sleepTimeStdDev * 60),
          patternChangeAdaptDays,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: '분석에 실패했어요' }))
        setError(d.error || '분석에 실패했어요')
        setAnalyzing(false)
        return
      }

      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch {
      setError('분석 중 오류가 발생했어요')
    }
    setAnalyzing(false)
  }

  function calcStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const sq = values.map(v => (v - mean) ** 2)
    return Math.sqrt(sq.reduce((a, b) => a + b, 0) / values.length)
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-page-bg)] flex flex-col">
        <PageHeader title="아기 기질 분석" showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const typeColors: Record<string, string> = {
    '해맑이': '#FFB347',
    '자유로운 탐험가': '#4ECDC4',
    '섬세한 감성파': '#FF9ECD',
    '열정 에너자이저': '#FF6B6B',
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="아기 기질 분석" showBack />
      <div className="flex-1 max-w-lg mx-auto w-full px-5 pb-28 space-y-5">

        {/* Intro */}
        {!result && !analyzing && (
          <div className="pt-8 text-center space-y-4">
            <div className="text-6xl">🧒</div>
            <h2 className="text-[18px] font-bold text-[#1A1918]">
              {child?.name ? `${child.name}의 기질 유형은?` : '우리 아이 기질 유형은?'}
            </h2>
            <p className="text-[14px] text-[#6B6966] leading-relaxed">
              수면, 수유, 활동 패턴을 AI가 분석해서<br />아이의 기질 유형을 알려드려요.
            </p>
            {error && (
              <div className="bg-[#FFF5F5] border border-[#FFCCC7] rounded-xl p-4 text-[13px] text-[#D05050]">
                {error}
              </div>
            )}
            <button
              onClick={analyze}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-[15px]"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              기질 분석 시작하기
            </button>
            <p className="text-[12px] text-[#9E9A95]">최근 30일 기록을 기반으로 분석해요 (최소 7일 필요)</p>
          </div>
        )}

        {/* Analyzing */}
        {analyzing && (
          <div className="pt-16 text-center space-y-4">
            <div className="text-5xl animate-bounce">🔍</div>
            <p className="text-[15px] font-semibold text-[#1A1918]">패턴을 분석하고 있어요...</p>
            <p className="text-[13px] text-[#6B6966]">{dayCount}일간의 기록을 살펴보는 중</p>
            <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Type Card */}
            <div
              className="rounded-2xl p-6 text-center space-y-3"
              style={{ backgroundColor: (typeColors[result.type] || '#FFB347') + '15' }}
            >
              <div className="text-5xl">{result.emoji}</div>
              <h2 className="text-[20px] font-bold text-[#1A1918]">{result.title}</h2>
              <div
                className="inline-block px-4 py-1.5 rounded-full text-[13px] font-semibold text-white"
                style={{ backgroundColor: typeColors[result.type] || '#FFB347' }}
              >
                {result.type}
              </div>
              <p className="text-[14px] text-[#4A4845] leading-relaxed">{result.description}</p>
            </div>

            {/* Scores */}
            <div className="bg-white rounded-xl border border-[#D5D0CA] p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-[#1A1918]">기질 분석 차트</h3>
              <ScoreBar label="규칙성" value={result.scores.regularity} color="#FFB347" />
              <ScoreBar label="활동량" value={result.scores.activity} color="#4ECDC4" />
              <ScoreBar label="적응성" value={result.scores.adaptability} color="#7B68EE" />
              <ScoreBar label="민감성" value={result.scores.sensitivity} color="#FF9ECD" />
            </div>

            {/* Strengths */}
            <div className="bg-white rounded-xl border border-[#D5D0CA] p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-[#1A1918]">💪 우리 아이 강점</h3>
              <div className="space-y-2">
                {result.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-0.5">•</span>
                    <p className="text-[14px] text-[#4A4845]">{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Parenting Tips */}
            <div className="bg-white rounded-xl border border-[#D5D0CA] p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-[#1A1918]">📝 육아 꿀팁</h3>
              <div className="space-y-2">
                {result.parentingTips.map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="bg-[var(--color-primary-bg)] text-[var(--color-primary)] text-[12px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[14px] text-[#4A4845]">{t}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fun Fact */}
            <div className="bg-[#FFF8F0] rounded-xl p-4">
              <p className="text-[13px] text-[#8B7355]">✨ {result.funFact}</p>
            </div>

            {/* Retry */}
            <button
              onClick={() => { setResult(null); analyze() }}
              className="w-full py-3 rounded-xl font-semibold text-[var(--color-primary)] border-2 border-[var(--color-primary)] text-[15px]"
            >
              다시 분석하기
            </button>
          </>
        )}
      </div>
    </div>
  )
}
