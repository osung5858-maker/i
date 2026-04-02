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

      const start = new Date(dateStr + 'T00:00:00').toISOString()
      const end = new Date(dateStr + 'T23:59:59.999').toISOString()

      const { data } = await supabase
        .from('events')
        .select('id, type, start_ts, end_ts, amount_ml, tags, child_id, recorder_id')
        .eq('child_id', children[0].id)
        .gte('start_ts', start)
        .lte('start_ts', end)
        .order('start_ts', { ascending: false })

      if (data) setEvents(data as CareEvent[])
      setLoading(false)
    }
    load()
  }, [dateStr]) // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isToday = dateStr === todayStr
  const prevDate = getDateOffset(dateStr, -1)
  const nextDate = getDateOffset(dateStr, 1)
  const canGoNext = nextDate <= todayStr

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
    <div className="fixed inset-0 flex flex-col bg-[#f5f5f5] overflow-hidden">
      {/* 헤더 — 고정 */}
      <div className="shrink-0 sticky top-0 z-40 bg-[#f5f5f5] border-b border-[#E8E4DF] px-5 max-w-lg mx-auto w-full flex items-center justify-between h-12">
        <button onClick={() => router.back()} className="text-sm text-tertiary">뒤로</button>
        <h1 className="text-subtitle text-primary">기록 상세</h1>
        <div className="w-8" />
      </div>

      {/* 날짜 네비게이션 — 고정 */}
      <div className="shrink-0 max-w-lg mx-auto w-full flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.push(`/records/${prevDate}`)}
          className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronRightIcon className="w-4 h-4 text-tertiary rotate-180" />
        </button>
        <p className="text-sm font-semibold text-primary">
          {formatDateKr(dateStr)}
          {isToday && <span className="text-[var(--color-primary)] ml-1">오늘</span>}
        </p>
        <button
          onClick={() => canGoNext && router.push(`/records/${nextDate}`)}
          disabled={!canGoNext}
          className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
        >
          <ChevronRightIcon className="w-4 h-4 text-tertiary" />
        </button>
      </div>

      {/* 스크롤 바디 */}
      <div className="flex-1 overflow-y-auto overscroll-contain max-w-lg mx-auto w-full pb-4">
        {/* 요약 — 4칸 고정 균등 분배 */}
        <div className="mx-4 mb-3 grid grid-cols-4 gap-2">
          {[
            { label: '수유', value: feedCount > 0 ? `${feedCount}회` : '-', sub: feedTotal > 0 ? `${feedTotal}ml` : null, bg: 'bg-blue-50', border: 'border-blue-100', labelColor: 'text-blue-500', valueColor: feedCount > 0 ? 'text-blue-600' : 'text-muted' },
            { label: '수면', value: sleepCount > 0 ? `${sleepCount}회` : '-', sub: null, bg: 'bg-indigo-50', border: 'border-indigo-100', labelColor: 'text-indigo-500', valueColor: sleepCount > 0 ? 'text-indigo-600' : 'text-muted' },
            { label: '대변', value: poopCount > 0 ? `${poopCount}회` : '-', sub: null, bg: 'bg-amber-50', border: 'border-amber-100', labelColor: 'text-amber-600', valueColor: poopCount > 0 ? 'text-amber-700' : 'text-muted' },
            { label: '소변', value: peeCount > 0 ? `${peeCount}회` : '-', sub: null, bg: 'bg-cyan-50', border: 'border-cyan-100', labelColor: 'text-cyan-500', valueColor: peeCount > 0 ? 'text-cyan-600' : 'text-muted' },
          ].map((c) => (
            <div key={c.label} className={`py-2.5 rounded-xl ${c.bg} border ${c.border} text-center`}>
              <p className={`text-caption font-medium ${c.labelColor}`}>{c.label}</p>
              <p className={`text-body font-bold ${c.valueColor} mt-0.5`}>{c.value}</p>
              {c.sub && <p className="text-label text-tertiary mt-0.5">{c.sub}</p>}
            </div>
          ))}
        </div>

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
