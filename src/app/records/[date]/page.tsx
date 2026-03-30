'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Timeline from '@/components/timeline/Timeline'
import { ChevronRightIcon } from '@/components/ui/Icons'
import type { CareEvent } from '@/types'

function formatDateKr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

function getDateOffset(dateStr: string, offset: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

export default function RecordDetailPage() {
  const params = useParams()
  const dateStr = params.date as string
  const router = useRouter()
  const supabase = createClient()

  const [events, setEvents] = useState<CareEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }

      const { data: children } = await supabase
        .from('children')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!children || children.length === 0) return

      const start = `${dateStr}T00:00:00`
      const end = `${dateStr}T23:59:59`

      const { data } = await supabase
        .from('events')
        .select('id, type, start_ts, end_ts, amount_ml, unit, temperature, tags, memo, notes, child_id, recorder_id')
        .eq('child_id', children[0].id)
        .gte('start_ts', start)
        .lte('start_ts', end)
        .order('start_ts', { ascending: false })

      if (data) setEvents(data as CareEvent[])
      setLoading(false)
    }
    load()
  }, [dateStr]) // eslint-disable-line react-hooks/exhaustive-deps

  const isToday = dateStr === new Date().toISOString().split('T')[0]
  const prevDate = getDateOffset(dateStr, -1)
  const nextDate = getDateOffset(dateStr, 1)
  const canGoNext = nextDate <= new Date().toISOString().split('T')[0]

  // 요약 통계
  const feedCount = events.filter((e) => e.type === 'feed').length
  const feedTotal = events.filter((e) => e.type === 'feed').reduce((sum, e) => sum + (e.amount_ml || 0), 0)
  const sleepCount = events.filter((e) => e.type === 'sleep').length
  const poopCount = events.filter((e) => e.type === 'poop').length
  const peeCount = events.filter((e) => e.type === 'pee').length

  const handleDelete = async (event: CareEvent) => {
    if (!confirm('이 기록을 삭제할까요?')) return
    await supabase.from('events').delete().eq('id', event.id)
    setEvents((prev) => prev.filter((e) => e.id !== event.id))
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5]">
      {/* 헤더 */}
      <div className="pt-4 pb-2 px-5 max-w-lg mx-auto w-full flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">뒤로</button>
        <h1 className="text-[15px] font-bold text-[#0A0B0D]">기록 상세</h1>
        <div className="w-8" />
      </div>

      <div className="max-w-lg mx-auto w-full pb-24">
        {/* 날짜 네비게이션 */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push(`/records/${prevDate}`)}
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B] rotate-180" />
          </button>
          <p className="text-sm font-semibold text-[#0A0B0D]">
            {formatDateKr(dateStr)}
            {isToday && <span className="text-[var(--color-primary)] ml-1">오늘</span>}
          </p>
          <button
            onClick={() => canGoNext && router.push(`/records/${nextDate}`)}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
          >
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
          </button>
        </div>

        {/* 요약 */}
        {events.length > 0 && (
          <div className="mx-4 mb-3 flex gap-2 overflow-x-auto hide-scrollbar">
            {feedCount > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-[14px] text-blue-500 font-medium">수유</p>
                <p className="text-sm font-bold text-blue-600">
                  {feedCount}회{feedTotal > 0 && ` · ${feedTotal}ml`}
                </p>
              </div>
            )}
            {sleepCount > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
                <p className="text-[14px] text-indigo-500 font-medium">수면</p>
                <p className="text-sm font-bold text-indigo-600">{sleepCount}회</p>
              </div>
            )}
            {poopCount > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[14px] text-amber-600 font-medium">대변</p>
                <p className="text-sm font-bold text-amber-700">{poopCount}회</p>
              </div>
            )}
            {peeCount > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-cyan-50 border border-cyan-100">
                <p className="text-[14px] text-cyan-500 font-medium">소변</p>
                <p className="text-sm font-bold text-cyan-600">{peeCount}회</p>
              </div>
            )}
          </div>
        )}

        {/* 기록 목록 */}
        <div className="mx-4 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
            </div>
          ) : (
            <Timeline events={events} onEventTap={handleDelete} />
          )}
        </div>
      </div>
    </div>
  )
}
