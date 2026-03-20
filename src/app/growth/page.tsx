'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronRightIcon } from '@/components/ui/Icons'
import CommunityComparison from '@/components/growth-chart/CommunityComparison'
import StatsReport from '@/components/growth-chart/StatsReport'
import type { Child, GrowthRecord, CareEvent } from '@/types'

// WHO 표준 성장 곡선 데이터 (남아 몸무게 kg, 3rd/50th/97th percentile)
const WHO_WEIGHT_BOYS: Record<number, [number, number, number]> = {
  0: [2.5, 3.3, 4.3], 1: [3.4, 4.5, 5.7], 2: [4.3, 5.6, 7.1],
  3: [5.0, 6.4, 8.0], 4: [5.6, 7.0, 8.7], 5: [6.0, 7.5, 9.3],
  6: [6.4, 7.9, 9.8], 7: [6.7, 8.3, 10.3], 8: [6.9, 8.6, 10.7],
  9: [7.1, 8.9, 11.0], 10: [7.4, 9.2, 11.4], 11: [7.6, 9.4, 11.7],
  12: [7.7, 9.6, 12.0], 15: [8.3, 10.3, 12.8], 18: [8.8, 10.9, 13.7],
  21: [9.2, 11.5, 14.5], 24: [9.7, 12.2, 15.3],
}

const WHO_WEIGHT_GIRLS: Record<number, [number, number, number]> = {
  0: [2.4, 3.2, 4.2], 1: [3.2, 4.2, 5.4], 2: [3.9, 5.1, 6.5],
  3: [4.5, 5.8, 7.4], 4: [5.0, 6.4, 8.1], 5: [5.4, 6.9, 8.7],
  6: [5.7, 7.3, 9.2], 7: [6.0, 7.6, 9.6], 8: [6.3, 7.9, 10.0],
  9: [6.5, 8.2, 10.4], 10: [6.7, 8.5, 10.7], 11: [6.9, 8.7, 11.0],
  12: [7.0, 8.9, 11.3], 15: [7.6, 9.6, 12.2], 18: [8.1, 10.2, 13.0],
  21: [8.6, 10.9, 13.9], 24: [9.0, 11.5, 14.7],
}

function getAgeMonths(birthdate: string): number {
  const birth = new Date(birthdate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function getPercentile(weight: number, ageMonths: number, sex: string | undefined): number {
  const table = sex === 'female' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS
  const months = Object.keys(table).map(Number).sort((a, b) => a - b)
  const closest = months.reduce((prev, curr) =>
    Math.abs(curr - ageMonths) < Math.abs(prev - ageMonths) ? curr : prev
  )
  const [p3, p50, p97] = table[closest]

  if (weight <= p3) return Math.round((weight / p3) * 3)
  if (weight <= p50) return Math.round(3 + ((weight - p3) / (p50 - p3)) * 47)
  if (weight <= p97) return Math.round(50 + ((weight - p50) / (p97 - p50)) * 47)
  return Math.min(99, Math.round(97 + ((weight - p97) / p97) * 3))
}

type GrowthTab = 'growth' | 'stats'

export default function GrowthPage() {
  const [child, setChild] = useState<Child | null>(null)
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [events, setEvents] = useState<CareEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<GrowthTab>('growth')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }

      const { data: children } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      if (!children || children.length === 0) { router.push('/settings/children/add'); return }

      const c = children[0] as Child
      setChild(c)

      const { data: growthData } = await supabase
        .from('growth_records')
        .select('*')
        .eq('child_id', c.id)
        .order('measured_at', { ascending: true })

      if (growthData) setRecords(growthData as GrowthRecord[])

      // 통계 리포트용 이벤트 로딩 (최근 30일)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('child_id', c.id)
        .gte('start_ts', thirtyDaysAgo.toISOString())
        .order('start_ts', { ascending: false })
      if (eventData) setEvents(eventData as CareEvent[])

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="w-8 h-8 border-3 border-[#FF6F0F]/20 border-t-[#FF6F0F] rounded-full animate-spin" />
      </div>
    )
  }

  const ageMonths = child ? getAgeMonths(child.birthdate) : 0
  const latestRecord = records.length > 0 ? records[records.length - 1] : null
  const weightPercentile = latestRecord?.weight_kg
    ? getPercentile(Number(latestRecord.weight_kg), ageMonths, child?.sex ?? undefined)
    : null

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5] dark:bg-[#0A0B0D]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <h1 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">성장 기록</h1>
          <div className="flex items-center gap-2">
            <Link href="/timelapse" className="text-[11px] font-semibold text-[#868B94] active:opacity-70">
              ▶ 타임랩스
            </Link>
            <Link href="/growth/analyze" className="text-[11px] font-semibold text-[#5B6DFF] active:opacity-70">
              🤖 검진분석
            </Link>
            <Link href="/growth/add" className="text-[11px] font-semibold text-[#FF6F0F] active:opacity-70">
              + 추가
            </Link>
          </div>
        </div>
      </header>

      {/* 서브탭 */}
      <div className="bg-white dark:bg-[#0A0B0D] border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
        <div className="flex max-w-lg mx-auto">
          {([
            { key: 'growth' as GrowthTab, label: '성장곡선' },
            { key: 'stats' as GrowthTab, label: '통계리포트' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-[13px] font-semibold text-center border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#212124] text-[#212124] dark:border-white dark:text-white'
                  : 'border-transparent text-[#AEB1B9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto pb-24">
        {activeTab === 'stats' ? (
          <StatsReport events={events} ageMonths={ageMonths} />
        ) : (
        <>
        {/* 아이 요약 */}
        <div className="m-4 p-5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6F0F] to-[#4A90D9] flex items-center justify-center">
              <span className="text-2xl">👶</span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">{child?.name}</p>
              <p className="text-xs text-[#9B9B9B]">{ageMonths}개월</p>
            </div>
          </div>

          {latestRecord ? (
            <div className="flex gap-3">
              {latestRecord.weight_kg && (
                <div className="flex-1 p-3 rounded-xl bg-[#f5f5f5] dark:bg-[#0A0B0D]">
                  <p className="text-xs text-[#9B9B9B] mb-1">몸무게</p>
                  <p className="text-xl font-bold text-[#0A0B0D] dark:text-white">
                    {Number(latestRecord.weight_kg).toFixed(1)}
                    <span className="text-sm font-normal text-[#9B9B9B] ml-0.5">kg</span>
                  </p>
                  {weightPercentile !== null && (
                    <p className="text-xs text-[#FF6F0F] font-medium mt-1">상위 {100 - weightPercentile}%</p>
                  )}
                </div>
              )}
              {latestRecord.height_cm && (
                <div className="flex-1 p-3 rounded-xl bg-[#f5f5f5] dark:bg-[#0A0B0D]">
                  <p className="text-xs text-[#9B9B9B] mb-1">키</p>
                  <p className="text-xl font-bold text-[#0A0B0D] dark:text-white">
                    {Number(latestRecord.height_cm).toFixed(1)}
                    <span className="text-sm font-normal text-[#9B9B9B] ml-0.5">cm</span>
                  </p>
                </div>
              )}
              {latestRecord.head_cm && (
                <div className="flex-1 p-3 rounded-xl bg-[#f5f5f5] dark:bg-[#0A0B0D]">
                  <p className="text-xs text-[#9B9B9B] mb-1">머리둘레</p>
                  <p className="text-xl font-bold text-[#0A0B0D] dark:text-white">
                    {Number(latestRecord.head_cm).toFixed(1)}
                    <span className="text-sm font-normal text-[#9B9B9B] ml-0.5">cm</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-[#9B9B9B]">아직 기록이 없어요</p>
            </div>
          )}
        </div>

        {/* 타임랩스 바로가기 */}
        <Link
          href="/timelapse"
          className="mx-4 p-4 rounded-2xl bg-[#FFF8F3] border border-[#FFE4CC] flex items-center gap-3 active:scale-[0.99] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF6F0F] flex items-center justify-center shrink-0">
            <span className="text-lg text-white">▶</span>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-[#212124]">타임랩스</p>
            <p className="text-[12px] text-[#868B94]">사진 · 성장 · 루틴 변화를 한눈에</p>
          </div>
          <span className="text-[#AEB1B9] text-sm">→</span>
        </Link>

        {/* 커뮤니티 비교 */}
        {child && (
          <CommunityComparison
            childId={child.id}
            ageMonths={ageMonths}
            sex={child.sex ?? undefined}
          />
        )}

        {/* 면책 */}
        {records.length > 0 && (
          <p className="text-center text-[10px] text-[#9B9B9B] mt-4 px-4">
            ⚠️ 통계적 참고치이며, 의학적 판단의 근거가 아닙니다.
          </p>
        )}

        {/* 기록 히스토리 */}
        <div className="mx-4 mt-4 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">기록 히스토리</p>
          </div>

          {records.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📏</span>
              </div>
              <p className="text-sm font-semibold text-[#0A0B0D] dark:text-white">아직 성장 기록이 없어요</p>
              <p className="text-xs text-[#9B9B9B] mt-1">첫 측정을 기록해볼까요?</p>
              <Link
                href="/growth/add"
                className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-[#FF6F0F] text-white text-sm font-semibold active:scale-95 transition-transform"
              >
                성장 기록 추가
              </Link>
            </div>
          ) : (
            [...records].reverse().map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3.5 border-t border-[#f0f0f0] dark:border-[#2a2a2a]"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                  <span className="text-sm">📏</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0B0D] dark:text-white">
                    {[
                      r.weight_kg && `${Number(r.weight_kg).toFixed(1)}kg`,
                      r.height_cm && `${Number(r.height_cm).toFixed(1)}cm`,
                      r.head_cm && `머리 ${Number(r.head_cm).toFixed(1)}cm`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-xs text-[#9B9B9B]">{r.measured_at}</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B] shrink-0" />
              </div>
            ))
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
