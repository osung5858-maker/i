'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import InsightHub from '@/components/insight/InsightHub'
import FeedSheet from '@/components/quick-buttons/FeedSheet'
import PoopSheet from '@/components/quick-buttons/PoopSheet'
import TempSheet from '@/components/quick-buttons/TempSheet'
import Timeline from '@/components/timeline/Timeline'
import StreakBanner from '@/components/reward/StreakBanner'
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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '새벽이에요, 힘내세요'
  if (h < 12) return '좋은 아침이에요'
  if (h < 18) return '오후도 도담하게'
  return '오늘도 수고했어요'
}

function getTodayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

// --- 탭 타입 ---

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<CareEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; undoId?: string; action?: { label: string; href: string } } | null>(null)
  const [sleepActive, setSleepActive] = useState(false)
  const [feedSheetOpen, setFeedSheetOpen] = useState(false)
  const [poopSheetOpen, setPoopSheetOpen] = useState(false)
  const [tempSheetOpen, setTempSheetOpen] = useState(false)
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  const { isOnline, pendingCount, syncing } = useOfflineSync()

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      setUser(user)

      const { data: children, error: childError } = await supabase
        .from('children').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1)

      if (childError || !children || children.length === 0) {
        router.push('/settings/children/add'); return
      }

      const currentChild = children[0] as Child
      setChild(currentChild)

      const { start, end } = getTodayRange()
      const { data: todayEvents } = await supabase
        .from('events').select('*').eq('child_id', currentChild.id)
        .gte('start_ts', start).lte('start_ts', end)
        .order('start_ts', { ascending: false })

      if (todayEvents) setEvents(todayEvents as CareEvent[])
      const activeSleep = todayEvents?.find((e) => e.type === 'sleep' && !e.end_ts)
      if (activeSleep) setSleepActive(true)
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime
  useEffect(() => {
    if (!child) return
    const channel = supabase.channel('events-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `child_id=eq.${child.id}` },
        (payload) => {
          const n = payload.new as CareEvent
          setEvents((prev) => prev.some((e) => e.id === n.id) ? prev : [n, ...prev])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [child]) // eslint-disable-line react-hooks/exhaustive-deps

  // 기록 핸들러
  const handleRecord = useCallback(async (type: EventType) => {
    if (!user || !child) return
    if (type === 'sleep' && sleepActive) {
      const active = events.find((e) => e.type === 'sleep' && !e.end_ts)
      if (active) {
        const now = new Date().toISOString()
        await supabase.from('events').update({ end_ts: now }).eq('id', active.id)
        setEvents((prev) => prev.map((e) => e.id === active.id ? { ...e, end_ts: now } : e))
        setSleepActive(false)
        setToast({ message: '수면 종료!' })
      }
      return
    }
    if (type === 'sleep') {
      setSleepActive(true)
      const e = await insertEvent(type)
      if (e) setToast({ message: '수면 시작! 🌙 자장가 틀까요?', undoId: e.id, action: { label: '자장가 듣기', href: '/lullaby' } })
      return
    }
    if (type === 'feed') { const e = await insertEvent(type); if (e) { setPendingEventId(e.id); setFeedSheetOpen(true) }; return }
    if (type === 'poop') { const e = await insertEvent(type); if (e) { setPendingEventId(e.id); setPoopSheetOpen(true) }; return }
    if (type === 'temp') { setTempSheetOpen(true); return }
    if (type === 'memo') { const e = await insertEvent(type, { tags: { category: 'medication' } }); if (e) setToast({ message: '투약 기록 완료!', undoId: e.id }); return }
    const e = await insertEvent(type)
    if (e) setToast({ message: '소변 기록 완료!', undoId: e.id })
  }, [user, child, sleepActive, events, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // FAB 퀵버튼 이벤트 리스너 (BottomNav에서 dispatch)
  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent).detail?.type
      if (type) handleRecord(type as EventType)
    }
    window.addEventListener('dodam-record', handler)
    return () => window.removeEventListener('dodam-record', handler)
  }, [handleRecord])

  // Shake → 응급 모드
  useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0, lastTime = 0
    const THRESHOLD = 25
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc?.x || !acc?.y || !acc?.z) return
      const now = Date.now()
      if (now - lastTime < 200) return
      const dx = Math.abs(acc.x - lastX)
      const dy = Math.abs(acc.y - lastY)
      const dz = Math.abs(acc.z - lastZ)
      if (dx + dy + dz > THRESHOLD) {
        router.push('/emergency')
      }
      lastX = acc.x; lastY = acc.y; lastZ = acc.z; lastTime = now
    }
    window.addEventListener('devicemotion', handler)
    return () => window.removeEventListener('devicemotion', handler)
  }, [router])

  const insertEvent = async (type: EventType, extra?: Record<string, unknown>) => {
    if (!user || !child) return null
    const eventData = { child_id: child.id, recorder_id: user.id, type, start_ts: new Date().toISOString(), source: 'quick_button' as const, ...extra }
    if (navigator.vibrate) navigator.vibrate(30)
    if (!navigator.onLine) {
      const offline = { id: crypto.randomUUID(), ...eventData, synced: false, created_at: new Date().toISOString() }
      await savePendingEvent(offline)
      setEvents((prev) => [offline as CareEvent, ...prev])
      return offline as CareEvent
    }
    const { data, error } = await supabase.from('events').insert(eventData).select().single()
    if (error) {
      const offline = { id: crypto.randomUUID(), ...eventData, synced: false, created_at: new Date().toISOString() }
      await savePendingEvent(offline)
      setEvents((prev) => [offline as CareEvent, ...prev])
      return offline as CareEvent
    }
    setEvents((prev) => [data as CareEvent, ...prev])
    return data as CareEvent
  }

  const handleUndo = useCallback(async () => {
    if (!toast?.undoId) return
    await supabase.from('events').delete().eq('id', toast.undoId)
    setEvents((prev) => prev.filter((e) => e.id !== toast.undoId))
    setToast(null)
  }, [toast, supabase])

  const handleFeedSelect = async (ml: number | null) => {
    setFeedSheetOpen(false)
    if (ml && pendingEventId) {
      await supabase.from('events').update({ amount_ml: ml }).eq('id', pendingEventId)
      setEvents((prev) => prev.map((e) => e.id === pendingEventId ? { ...e, amount_ml: ml } : e))
    }
    setToast({ message: ml ? `수유 ${ml}ml 기록!` : '수유 기록 완료!', undoId: pendingEventId || undefined })
    setPendingEventId(null)
  }
  const handlePoopSelect = async (status: string | null) => {
    setPoopSheetOpen(false)
    if (status && pendingEventId) {
      await supabase.from('events').update({ tags: { status } }).eq('id', pendingEventId)
      setEvents((prev) => prev.map((e) => e.id === pendingEventId ? { ...e, tags: { status } } : e))
    }
    setToast({ message: '대변 기록 완료!', undoId: pendingEventId || undefined })
    setPendingEventId(null)
  }
  const handleTempSubmit = async (celsius: number) => {
    setTempSheetOpen(false)
    const e = await insertEvent('temp', { tags: { celsius } })
    if (e) {
      const msg = celsius >= 38.5 ? `체온 ${celsius}°C 🚨` : celsius >= 37.5 ? `체온 ${celsius}°C 미열` : `체온 ${celsius}°C`
      setToast({ message: msg, undoId: e.id })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#FF6F0F]/20 border-t-[#FF6F0F] rounded-full animate-spin" />
          <p className="text-[13px] text-[#868B94]">도담이가 준비 중이에요</p>
        </div>
      </div>
    )
  }

  const ageMonths = child ? getAgeMonths(child.birthdate) : 0
  const todayFeedCount = events.filter((e) => e.type === 'feed').length
  const todaySleepCount = events.filter((e) => e.type === 'sleep' && e.end_ts).length
  const todayPoopCount = events.filter((e) => e.type === 'poop').length

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white">
        <div className="px-5 pt-3 pb-2 max-w-lg mx-auto">
          {/* 상단: 인사 + 알림 */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[13px] text-[#868B94]">{getGreeting()} 👋</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[18px] font-bold text-[#212124]">{child?.name || '도담이'}</span>
                <span className="text-[13px] text-[#AEB1B9]">{ageMonths}개월</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(new Date().getHours() >= 20 || new Date().getHours() < 6) && (
                <Link href="/lullaby" className="w-9 h-9 rounded-full bg-[#1A1918] flex items-center justify-center active:opacity-80">
                  <span className="text-[14px]">🌙</span>
                </Link>
              )}
              <Link href="/settings" className="w-9 h-9 rounded-full bg-[#F7F8FA] flex items-center justify-center active:bg-[#ECECEC]">
                <BellIcon className="w-[18px] h-[18px] text-[#212124]" />
              </Link>
              <Link href="/settings/children" className="w-9 h-9 rounded-full bg-[#3D8A5A] flex items-center justify-center overflow-hidden active:opacity-80">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-[11px] font-bold">{child?.name?.charAt(0) || '도'}</span>
                )}
              </Link>
            </div>
          </div>

          {/* 오늘 요약 카드 */}
          <div className="flex gap-2 mb-1">
            {[
              { label: '수유', count: todayFeedCount, unit: '회', color: 'text-[#FF6F0F]', bg: 'bg-[#FFF8F3]' },
              { label: '수면', count: todaySleepCount, unit: '회', color: 'text-[#5B6DFF]', bg: 'bg-[#F0F2FF]' },
              { label: '대변', count: todayPoopCount, unit: '회', color: 'text-[#C68A2E]', bg: 'bg-[#FFF8F0]' },
            ].map((stat) => (
              <div key={stat.label} className={`flex-1 ${stat.bg} rounded-2xl px-3 py-2.5`}>
                <p className="text-[11px] text-[#868B94]">{stat.label}</p>
                <p className={`text-[18px] font-bold ${stat.color}`}>
                  {stat.count}<span className="text-[11px] font-normal text-[#AEB1B9] ml-0.5">{stat.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 스트릭 배너 */}
        <StreakBanner events={events} />

        {/* 구분선 */}
        <div className="border-b border-[#ECECEC]" />
      </header>

      {/* 배너 */}
      {!isOnline && (
        <div className="bg-[#FFF8F3] px-4 py-2">
          <p className="text-[11px] text-[#FF6F0F] text-center font-medium">
            📡 오프라인 · 기록은 저장돼요 {pendingCount > 0 && `(${pendingCount}건 대기)`}
          </p>
        </div>
      )}
      {syncing && (
        <div className="bg-[#F0F4FF] px-4 py-2">
          <p className="text-[11px] text-[#5B6DFF] text-center font-medium">↻ 동기화 중...</p>
        </div>
      )}

      {/* 콘텐츠 영역 */}
      {/* 콘텐츠 — 한 화면 스크롤 (인사이트 + 타임라인) */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-lg mx-auto pt-3 pb-44">
          {/* AI 인사이트 */}
          <InsightHub
            events={events}
            birthdate={child?.birthdate}
            childName={child?.name || '도담이'}
          />

          {/* 오늘의 기록 타임라인 */}
          <div className="mt-2">
            <div className="flex items-center justify-between px-5 pb-2">
              <p className="text-[14px] font-bold text-[#212124]">오늘의 기록</p>
              <Link
                href={`/records/${new Date().toISOString().split('T')[0]}`}
                className="flex items-center gap-0.5 text-[12px] font-medium text-[#3D8A5A]"
              >
                전체보기 <ChevronRightIcon className="w-3 h-3" />
              </Link>
            </div>
            <Timeline events={events} />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          action={
            toast.action
              ? { label: toast.action.label, onClick: () => router.push(toast.action!.href) }
              : toast.undoId
                ? { label: '되돌리기', onClick: handleUndo }
                : undefined
          }
          duration={toast.action ? 5000 : 1000}
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
