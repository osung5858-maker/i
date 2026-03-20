'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QuickButtons from '@/components/quick-buttons/QuickButtons'
import AICardFeed from '@/components/ai-cards/AICardFeed'
import CheckupBanner from '@/components/ai-cards/CheckupBanner'
import FeedSheet from '@/components/quick-buttons/FeedSheet'
import PoopSheet from '@/components/quick-buttons/PoopSheet'
import TempSheet from '@/components/quick-buttons/TempSheet'
import Timeline from '@/components/timeline/Timeline'
import Toast from '@/components/ui/Toast'
import { BellIcon, ChevronRightIcon } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { savePendingEvent } from '@/lib/offline/db'
import type { CareEvent, EventType, Child } from '@/types'
import type { User } from '@supabase/supabase-js'

function getAgeMonths(birthdate: string): number {
  const birth = new Date(birthdate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<CareEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; undoId?: string } | null>(null)
  const [sleepActive, setSleepActive] = useState(false)
  const [feedSheetOpen, setFeedSheetOpen] = useState(false)
  const [poopSheetOpen, setPoopSheetOpen] = useState(false)
  const [tempSheetOpen, setTempSheetOpen] = useState(false)
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  const { isOnline, pendingCount, syncing } = useOfflineSync()

  const router = useRouter()
  const supabase = createClient()

  // 초기 데이터 로딩
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/onboarding')
        return
      }
      setUser(user)

      // 아기 프로필 조회
      const { data: children, error: childError } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (childError || !children || children.length === 0) {
        router.push('/settings/children/add')
        return
      }

      const currentChild = children[0] as Child
      setChild(currentChild)

      // 오늘의 이벤트 조회
      const { start, end } = getTodayRange()
      const { data: todayEvents } = await supabase
        .from('events')
        .select('*')
        .eq('child_id', currentChild.id)
        .gte('start_ts', start)
        .lte('start_ts', end)
        .order('start_ts', { ascending: false })

      if (todayEvents) {
        setEvents(todayEvents as CareEvent[])
      }

      // 진행 중인 수면 확인
      const activeSleep = todayEvents?.find(
        (e) => e.type === 'sleep' && !e.end_ts
      )
      if (activeSleep) setSleepActive(true)

      setLoading(false)
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime 구독 (공동양육자 동기화)
  useEffect(() => {
    if (!child) return

    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `child_id=eq.${child.id}`,
        },
        (payload) => {
          const newEvent = payload.new as CareEvent
          // 본인이 방금 추가한 건 제외 (이미 로컬에 있음)
          setEvents((prev) => {
            if (prev.some((e) => e.id === newEvent.id)) return prev
            return [newEvent, ...prev]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [child]) // eslint-disable-line react-hooks/exhaustive-deps

  // 기록 핸들러
  const handleRecord = useCallback(
    async (type: EventType) => {
      if (!user || !child) return

      // 수면 종료
      if (type === 'sleep' && sleepActive) {
        const activeSleep = events.find((e) => e.type === 'sleep' && !e.end_ts)
        if (activeSleep) {
          const now = new Date().toISOString()
          await supabase
            .from('events')
            .update({ end_ts: now })
            .eq('id', activeSleep.id)

          setEvents((prev) =>
            prev.map((e) => (e.id === activeSleep.id ? { ...e, end_ts: now } : e))
          )
          setSleepActive(false)
          setToast({ message: '수면 종료!' })
        }
        return
      }

      if (type === 'sleep') setSleepActive(true)

      // 수유/대변/체온은 바텀시트로 보조 입력
      if (type === 'feed') {
        const event = await insertEvent(type)
        if (event) { setPendingEventId(event.id); setFeedSheetOpen(true) }
        return
      }
      if (type === 'poop') {
        const event = await insertEvent(type)
        if (event) { setPendingEventId(event.id); setPoopSheetOpen(true) }
        return
      }
      if (type === 'temp') {
        setTempSheetOpen(true)
        return
      }

      // 소변/수면은 바로 저장
      const event = await insertEvent(type)
      if (event) {
        const labels: Record<string, string> = { sleep: '수면 시작!', pee: '소변 기록 완료!' }
        setToast({ message: labels[type] || '기록 완료!', undoId: event.id })
      }
    },
    [user, child, sleepActive, events, supabase] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // 이벤트 INSERT 공통 함수 (오프라인 지원)
  const insertEvent = async (type: EventType, extra?: Record<string, unknown>) => {
    if (!user || !child) return null

    const eventData = {
      child_id: child.id,
      recorder_id: user.id,
      type,
      start_ts: new Date().toISOString(),
      source: 'quick_button' as const,
      ...extra,
    }

    if (navigator.vibrate) navigator.vibrate(30)

    // 오프라인이면 IndexedDB에 저장
    if (!navigator.onLine) {
      const offlineEvent = { id: crypto.randomUUID(), ...eventData, synced: false, created_at: new Date().toISOString() }
      await savePendingEvent(offlineEvent)
      setEvents((prev) => [offlineEvent as CareEvent, ...prev])
      return offlineEvent as CareEvent
    }

    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()

    if (error) {
      // 네트워크 에러 시 오프라인 저장 폴백
      const offlineEvent = { id: crypto.randomUUID(), ...eventData, synced: false, created_at: new Date().toISOString() }
      await savePendingEvent(offlineEvent)
      setEvents((prev) => [offlineEvent as CareEvent, ...prev])
      setToast({ message: '오프라인으로 저장했어요.', undoId: offlineEvent.id })
      return offlineEvent as CareEvent
    }

    setEvents((prev) => [data as CareEvent, ...prev])
    return data as CareEvent
  }

  // 수유량 선택 핸들러
  const handleFeedSelect = async (ml: number | null) => {
    setFeedSheetOpen(false)
    if (ml && pendingEventId) {
      await supabase.from('events').update({ amount_ml: ml }).eq('id', pendingEventId)
      setEvents((prev) => prev.map((e) => e.id === pendingEventId ? { ...e, amount_ml: ml } : e))
    }
    setToast({ message: ml ? `수유 ${ml}ml 기록 완료!` : '수유 기록 완료!', undoId: pendingEventId || undefined })
    setPendingEventId(null)
  }

  // 대변 상태 선택 핸들러
  const handlePoopSelect = async (status: string | null) => {
    setPoopSheetOpen(false)
    if (status && pendingEventId) {
      await supabase.from('events').update({ tags: { status } }).eq('id', pendingEventId)
      setEvents((prev) => prev.map((e) => e.id === pendingEventId ? { ...e, tags: { status } } : e))
    }
    setToast({ message: '대변 기록 완료!', undoId: pendingEventId || undefined })
    setPendingEventId(null)
  }

  // 체온 입력 핸들러
  const handleTempSubmit = async (celsius: number) => {
    setTempSheetOpen(false)
    const event = await insertEvent('temp', { tags: { celsius } })
    if (event) {
      const msg = celsius >= 38.5 ? `체온 ${celsius}°C 🚨 고열!` : celsius >= 37.5 ? `체온 ${celsius}°C 미열` : `체온 ${celsius}°C 기록 완료!`
      setToast({ message: msg, undoId: event.id })
    }
  }

  // 되돌리기
  const handleUndo = useCallback(async () => {
    if (!toast?.undoId) return

    await supabase.from('events').delete().eq('id', toast.undoId)
    setEvents((prev) => prev.filter((e) => e.id !== toast.undoId))
    setToast(null)
  }, [toast, supabase])

  // 로딩
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#0052FF]/20 border-t-[#0052FF] rounded-full animate-spin" />
          <p className="text-sm text-[#9B9B9B]">도담이가 준비 중이에요</p>
        </div>
      </div>
    )
  }

  const ageMonths = child ? getAgeMonths(child.birthdate) : 0

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <Link href="/settings/children" className="flex items-center gap-2.5 active:opacity-70 transition-opacity">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0052FF] to-[#4A90D9] flex items-center justify-center overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">
                  {child?.name?.charAt(0) || '도'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">
                {child?.name || '도담이'}
              </span>
              <span className="text-xs text-[#9B9B9B] font-medium">{ageMonths}개월</span>
              <ChevronRightIcon className="w-3.5 h-3.5 text-[#9B9B9B]" />
            </div>
          </Link>
          <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors active:scale-95">
            <BellIcon className="w-5 h-5 text-[#0A0B0D] dark:text-white" />
          </button>
        </div>
      </header>

      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-300 text-center font-medium">
            📡 오프라인이에요. 기록은 저장되니 걱정 마세요.
            {pendingCount > 0 && ` (${pendingCount}건 동기화 대기)`}
          </p>
        </div>
      )}
      {syncing && (
        <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center font-medium">
            ↻ 기록을 동기화하는 중이에요...
          </p>
        </div>
      )}

      {/* 타임라인 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {/* 검진/접종 일정 */}
          {child && <CheckupBanner birthdate={child.birthdate} />}

          {/* AI 제안 카드 */}
          <AICardFeed events={events} />

          <div className="flex items-center justify-between px-4 py-4">
            <h2 className="text-lg font-bold text-[#0A0B0D] dark:text-white">오늘의 기록</h2>
            <Link
              href={`/records/${new Date().toISOString().split('T')[0]}`}
              className="flex items-center gap-0.5 text-xs font-semibold text-[#0052FF] active:opacity-70"
            >
              전체보기
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
          <Timeline events={events} />
        </div>
      </div>

      {/* 퀵 버튼 */}
      <div className="sticky bottom-16 z-30">
        <div className="max-w-lg mx-auto">
          <QuickButtons onRecord={handleRecord} sleepActive={sleepActive} />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          action={toast.undoId ? { label: '되돌리기', onClick: handleUndo } : undefined}
          duration={5000}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* 바텀시트 */}
      <FeedSheet open={feedSheetOpen} onClose={() => { setFeedSheetOpen(false); handleFeedSelect(null) }} onSelect={handleFeedSelect} />
      <PoopSheet open={poopSheetOpen} onClose={() => { setPoopSheetOpen(false); handlePoopSelect(null) }} onSelect={handlePoopSelect} />
      <TempSheet open={tempSheetOpen} onClose={() => setTempSheetOpen(false)} onSubmit={handleTempSubmit} />
    </div>
  )
}
