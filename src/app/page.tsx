'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FeedSheet from '@/components/quick-buttons/FeedSheet'
import PoopSheet from '@/components/quick-buttons/PoopSheet'
import TempSheet from '@/components/quick-buttons/TempSheet'
import Toast from '@/components/ui/Toast'
import { BellIcon, ChevronRightIcon } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'
import { shareTodayRecord } from '@/lib/kakao/share-parenting'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { savePendingEvent } from '@/lib/offline/db'
import type { CareEvent, EventType, Child } from '@/types'
import { useGestureInput, getGestureEnabled } from '@/hooks/useGestureInput'
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
      // FAB 월령별 구성을 위해 localStorage에 저장
      localStorage.setItem('dodam_child_birthdate', currentChild.birthdate)

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

  // FAB 이벤트 리스너는 insertEvent 선언 이후에 배치 (아래)

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

  // 오프라인 이벤트 재동기화
  useEffect(() => {
    const syncPending = async () => {
      if (!navigator.onLine || !user) return
      try {
        const { getPendingEvents, clearSyncedEvents } = await import('@/lib/offline/db')
        const pending = await getPendingEvents()
        if (pending.length === 0) return
        const toSync = pending.filter((e: any) => !e.synced)
        for (const evt of toSync) {
          const { id, synced, created_at, ...data } = evt as any
          const { error } = await supabase.from('events').insert(data)
          if (!error) evt.synced = true
        }
        await clearSyncedEvents()
        // 동기화 완료 후 이벤트 새로고침
        if (toSync.length > 0 && child) {
          const today = new Date().toISOString().split('T')[0]
          const { data } = await supabase.from('events').select('*').eq('child_id', child.id).gte('start_ts', today).order('start_ts', { ascending: false })
          if (data) setEvents(data as CareEvent[])
        }
      } catch { /* */ }
    }
    syncPending()
    window.addEventListener('online', syncPending)
    return () => window.removeEventListener('online', syncPending)
  }, [user, child, supabase])

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

  // FAB 퀵버튼 이벤트 리스너 (BottomNav에서 dispatch)
  // FAB에서 이미 상세 선택(tags/amount)을 완료한 경우 바텀시트를 건너뛰고 바로 기록
  const handleFabRecord = useCallback(async (detail: Record<string, unknown>) => {
    const type = detail.type as EventType
    if (!type) return
    const { type: _, ...extra } = detail
    const hasTags = extra.tags && Object.keys(extra.tags as object).length > 0
    const hasAmount = 'amount_ml' in extra

    // FAB에서 상세 정보가 이미 포함된 경우 → 바로 기록
    if (type === 'poop' && hasTags) {
      const e = await insertEvent(type, extra)
      if (e) setToast({ message: '배변 기록 완료!', undoId: e.id })
      return
    }
    if (type === 'feed' && (hasTags || hasAmount)) {
      const e = await insertEvent(type, extra)
      if (e) setToast({ message: '수유 기록 완료!', undoId: e.id })
      return
    }
    if (type === 'temp' && hasTags && (extra.tags as Record<string, unknown>).celsius) {
      const e = await insertEvent(type, extra)
      if (e) setToast({ message: `체온 ${(extra.tags as Record<string, unknown>).celsius}°C 기록 완료!`, undoId: e.id })
      return
    }
    // 상세 정보 없으면 기존 handleRecord 흐름 (바텀시트 열기)
    handleRecord(type)
  }, [handleRecord, insertEvent]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.type) handleFabRecord(detail)
    }
    window.addEventListener('dodam-record', handler)
    return () => window.removeEventListener('dodam-record', handler)
  }, [handleFabRecord])

  // 제스처 입력
  const gestureEnabled = typeof window !== 'undefined' ? getGestureEnabled() : false
  const { lastGesture, showFeedback } = useGestureInput({
    enabled: gestureEnabled,
    onGesture: handleRecord,
  })

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
          <p className="text-[13px] text-[#6B6966]">도담이가 준비 중이에요</p>
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
      {/* 제스처 피드백 오버레이 */}
      {showFeedback && lastGesture && (
        <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
          <div className="bg-black/70 text-white px-6 py-4 rounded-2xl text-center animate-[fadeIn_0.15s_ease-out]">
            <p className="text-3xl mb-1">
              {lastGesture.type === 'feed' ? '🍼' : lastGesture.type === 'sleep' ? '💤' : lastGesture.type === 'poop' ? '💩' : '💧'}
            </p>
            <p className="text-[14px] font-semibold">
              {lastGesture.type === 'feed' ? '수유' : lastGesture.type === 'sleep' ? '수면' : lastGesture.type === 'poop' ? '대변' : '소변'} 기록!
            </p>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white">
        <div className="px-5 pt-3 pb-2 max-w-lg mx-auto w-full">
          {/* 상단: 인사 + 알림 */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[13px] text-[#6B6966]">{getGreeting()} 👋</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[18px] font-bold text-[#212124]">{child?.name || '도담이'}</span>
                <span className="text-[13px] text-[#9E9A95]">{ageMonths}개월</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(new Date().getHours() >= 20 || new Date().getHours() < 6) && (
                <Link href="/lullaby" className="w-9 h-9 rounded-full bg-[#1A1918] flex items-center justify-center active:opacity-80">
                  <span className="text-[14px]">🌙</span>
                </Link>
              )}
              <Link href="/settings" className="relative w-9 h-9 rounded-full bg-[#F0EDE8] flex items-center justify-center active:bg-[#ECECEC]">
                <BellIcon className="w-[18px] h-[18px] text-[#212124]" />
                {events.length > 0 && events.length < 5 && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />}
              </Link>
              <Link href="/settings/children" className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center overflow-hidden active:opacity-80">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-[13px] font-bold">{child?.name?.charAt(0) || '도'}</span>
                )}
              </Link>
            </div>
          </div>

        </div>
      </header>

      {/* 배너 */}
      {!isOnline && (
        <div className="bg-[#FFF8F3] px-4 py-2">
          <p className="text-[13px] text-[#FF6F0F] text-center font-medium">
            📡 오프라인 · 기록은 저장돼요 {pendingCount > 0 && `(${pendingCount}건 대기)`}
          </p>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto bg-[#FFF9F5]">
        <div className="max-w-lg mx-auto w-full pt-4 pb-44 px-5 space-y-3">

          {/* ━━━ 1. AI 히어로 ━━━ */}
          <AiCareCard
            childName={child?.name || '아이'}
            ageMonths={ageMonths}
            events={events}
            todayFeedCount={todayFeedCount}
            todaySleepCount={todaySleepCount}
            todayPoopCount={todayPoopCount}
            onShare={() => shareTodayRecord(child?.name || '아이', ageMonths, todayFeedCount, todaySleepCount, todayPoopCount)}
          />

          {/* ━━━ 2. 최근 기록 (스크롤) ━━━ */}
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-bold text-[#1A1918]">최근 기록 {events.length > 0 && <span className="text-[13px] text-[#9E9A95] font-normal ml-1">{events.length}건</span>}</p>
              {events.length > 0 && (
                <Link href={`/records/${new Date().toISOString().split('T')[0]}`} className="text-[13px] text-[var(--color-primary)] font-medium">전체보기 →</Link>
              )}
            </div>
            {events.length === 0 ? (
              <p className="text-[14px] text-[#9E9A95] text-center py-3">아직 기록이 없어요. FAB(+)으로 첫 기록을 남겨보세요!</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto hide-scrollbar">
                {events.slice(0, 8).map((e) => {
                  const time = new Date(e.start_ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                  const icons: Record<string, string> = { feed: '🍼', sleep: '💤', poop: '💩', pee: '💧', temp: '🌡️', memo: '💊' }
                  const labels: Record<string, string> = { feed: '수유', sleep: '수면', poop: '대변', pee: '소변', temp: '체온', memo: '투약' }
                  const detail = e.amount_ml ? `${e.amount_ml}ml` :
                    e.end_ts ? `${Math.round((new Date(e.end_ts).getTime() - new Date(e.start_ts).getTime()) / 60000)}분` :
                    e.tags?.celsius ? `${e.tags.celsius}°C` :
                    e.tags?.status ? ({ normal: '정상', watery: '묽음', hard: '단단' }[e.tags.status as string] || '') : ''

                  return (
                    <div key={e.id} className="flex items-center gap-2 py-2 px-2.5 bg-[#F5F1EC] rounded-lg">
                      <span className="text-[14px]">{icons[e.type] || '📝'}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-[#1A1918]">{labels[e.type]}</span>
                        {detail && <span className="text-[12px] text-[var(--color-primary)] ml-1">{detail}</span>}
                        <p className="text-[11px] text-[#9E9A95]">{time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ━━━ 3. 상태 카드 2열 ━━━ */}
          <div className="grid grid-cols-2 gap-2">
            {/* 예방접종 */}
            <Link href="/vaccination" className="bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-2.5 active:bg-[#F5F1EC]">
              <span className="text-lg">💉</span>
              <div>
                <p className="text-[14px] font-semibold text-[#1A1918]">
                  {(() => {
                    const VACCINES: Record<number, string> = { 0: 'BCG', 1: 'B형간염 2차', 2: 'DTaP 1차', 4: 'DTaP 2차', 6: 'DTaP 3차', 12: 'MMR', 15: '수두', 24: '일본뇌염' }
                    const next = Object.entries(VACCINES).find(([m]) => Number(m) >= ageMonths)
                    return next ? next[1] : '완료!'
                  })()}
                </p>
                <p className="text-[13px] text-[#9E9A95]">다음 접종</p>
              </div>
            </Link>
            {/* 이유식 or 성장 */}
            {ageMonths >= 5 ? (
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-2.5">
                <span className="text-lg">🥣</span>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1918]">{ageMonths < 6 ? '초기' : ageMonths < 8 ? '중기' : ageMonths < 10 ? '후기' : '완료기'} 이유식</p>
                  <p className="text-[13px] text-[#9E9A95]">{ageMonths}개월 단계</p>
                </div>
              </div>
            ) : (
              <Link href="/record" className="bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-2.5 active:bg-[#F5F1EC]">
                <span className="text-lg">📈</span>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1918]">{ageMonths}개월</p>
                  <p className="text-[13px] text-[#9E9A95]">성장 기록</p>
                </div>
              </Link>
            )}
          </div>

          {/* 키즈노트·스트릭·커뮤니티·팁·퀵링크 → 성장탭/우리탭으로 이동 완료 */}

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

function KnImageViewer({ images, startIndex, onClose }: { images: { original: string; thumbnail: string }[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)
  const touchX = { current: 0 }
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <span className="text-[13px] text-white/70">{idx + 1} / {images.length}</span>
        <button onClick={onClose} className="text-white text-xl">✕</button>
      </div>
      <div className="flex-1 flex items-center justify-center px-2"
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          const d = e.changedTouches[0].clientX - touchX.current
          if (d < -50 && idx < images.length - 1) setIdx(p => p + 1)
          if (d > 50 && idx > 0) setIdx(p => p - 1)
        }}>
        <img src={images[idx].original} alt="" className="max-w-full max-h-[80vh] object-contain rounded-lg select-none" draggable={false} />
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-1 py-3">
          {images.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/30'}`} />)}
        </div>
      )}
    </div>
  )
}

function KidsnoteCard() {
  const [connected, setConnected] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [viewerImages, setViewerImages] = useState<{ original: string; thumbnail: string }[] | null>(null)
  const [viewerStart, setViewerStart] = useState(0)

  useEffect(() => {
    const hasCreds = !!localStorage.getItem('kn_credentials')
    setConnected(hasCreds)
    // 자동 로그인 → 최신 알림장 1건 가져오기
    if (hasCreds) {
      autoFetch()
    }
  }, [])

  const autoFetch = async () => {
    try {
      const creds = JSON.parse(localStorage.getItem('kn_credentials') || '{}')
      if (!creds.u || !creds.p) return
      setLoading(true)
      const loginRes = await fetch('/api/kidsnote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: creds.u, password: creds.p }),
      })
      const loginData = await loginRes.json()
      if (!loginData.success || !loginData.children?.length) { setLoading(false); return }
      const childId = loginData.children[0].id
      const reportRes = await fetch('/api/kidsnote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reports', sessionCookie: loginData.sessionCookie, childId }),
      })
      const reportData = await reportRes.json()
      setReports((reportData.results || []).slice(0, 2))
    } catch { /* */ }
    setLoading(false)
  }

  // 미연결: 유도 카드
  if (!connected) {
    return (
      <Link href="/kidsnote" className="block bg-gradient-to-r from-[#FFF8F0] to-[#F0FAF4] rounded-xl border border-[#E8E4DF] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏫</span>
            <div>
              <p className="text-[13px] font-bold text-[#1A1918]">키즈노트 연동</p>
              <p className="text-[13px] text-[#6B6966]">어린이집 알림장을 도담에서 확인해요</p>
            </div>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-[#9E9A95]" />
        </div>
      </Link>
    )
  }

  // 연결됨: 최신 알림장 + 사진
  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-3">
      <Link href="/kidsnote" className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🏫</span>
          <span className="text-[13px] font-bold text-[#1A1918]">오늘의 키즈노트</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[13px] text-[var(--color-primary)] bg-[#E8F5E9] px-1.5 py-0.5 rounded-full">연동됨</span>
          <ChevronRightIcon className="w-4 h-4 text-[#9E9A95]" />
        </div>
      </Link>

      {loading && <p className="text-[13px] text-[#9E9A95] py-2 text-center">알림장 확인 중...</p>}

      {!loading && reports.length === 0 && (
        <p className="text-[13px] text-[#9E9A95] py-2 text-center">새 알림장이 없어요</p>
      )}

      {/* 최근 사진 그리드 — 탭하면 확대 */}
      {(() => {
        const allImages = reports.flatMap((r: any) => (r.images || []).map((img: any) => ({ original: img.original, thumbnail: img.thumbnail })))
        if (allImages.length === 0) return null
        const recent = allImages.slice(0, 6)
        return (
          <>
            <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
              {recent.map((img: any, i: number) => (
                <div key={i} className="relative aspect-square cursor-pointer active:opacity-80"
                  onClick={() => { setViewerImages(allImages); setViewerStart(i) }}>
                  <img src={img.thumbnail} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 text-[13px] bg-black/50 text-white px-1 rounded">NEW</span>}
                </div>
              ))}
            </div>
            <p className="text-[14px] text-[#9E9A95] text-center mt-1.5">
              {reports[0]?.created ? new Date(reports[0].created).toLocaleDateString('ko-KR') : ''} · {reports[0]?.author || ''}
            </p>
          </>
        )
      })()}

      {/* 사진 뷰어 */}
      {viewerImages && <KnImageViewer images={viewerImages} startIndex={viewerStart} onClose={() => setViewerImages(null)} />}
    </div>
  )
}

// === AI 데일리 케어 카드 (Gemini) ===
function AiCareCard({ childName, ageMonths, events, todayFeedCount, todaySleepCount, todayPoopCount, onShare }: {
  childName: string; ageMonths: number; events: CareEvent[]; todayFeedCount: number; todaySleepCount: number; todayPoopCount: number; onShare: () => void
}) {
  const [ai, setAi] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // 캐시만 복원 (자동 호출 안 함)
    const cacheKey = `dodam_ai_care_${new Date().toISOString().split('T')[0]}_${events.length}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) { try { setAi(JSON.parse(cached)) } catch { /* */ } }
  }, [events.length])

  const handleAiCare = () => {
    if (events.length < 3) return
    const cacheKey = `dodam_ai_care_${new Date().toISOString().split('T')[0]}_${events.length}`
    fetchAi(cacheKey)
  }

  const fetchAi = async (cacheKey: string) => {
    setLoading(true)
    try {
      const lastFeed = events.find(e => e.type === 'feed')
      const lastSleep = events.find(e => e.type === 'sleep')
      const feedAmounts = events.filter(e => e.type === 'feed' && e.amount_ml).map(e => `${e.amount_ml}ml`).join(', ')
      const feedTimes = events.filter(e => e.type === 'feed').map(e => new Date(e.start_ts).getTime())
      const avgFeedGap = feedTimes.length >= 2 ? Math.round((feedTimes[0] - feedTimes[feedTimes.length - 1]) / (feedTimes.length - 1) / 60000) : null
      const sleepTotal = events.filter(e => e.type === 'sleep' && e.end_ts).reduce((sum, e) => sum + Math.round((new Date(e.end_ts!).getTime() - new Date(e.start_ts).getTime()) / 60000), 0)
      const feedTotal = events.filter(e => e.type === 'feed').reduce((sum, e) => sum + (e.amount_ml || 0), 0)

      const res = await fetch('/api/ai-parenting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily', childName, ageMonths,
          feedCount: todayFeedCount, sleepCount: todaySleepCount, poopCount: todayPoopCount,
          feedTotal: feedTotal || null, sleepTotal: sleepTotal || null,
          lastFeedMinAgo: lastFeed ? Math.round((Date.now() - new Date(lastFeed.start_ts).getTime()) / 60000) : null,
          lastSleepMinAgo: lastSleep ? Math.round((Date.now() - new Date(lastSleep.start_ts).getTime()) / 60000) : null,
          avgFeedGap, sleepingNow: !!events.find(e => e.type === 'sleep' && !e.end_ts),
          feedAmounts,
        }),
      })
      const data = await res.json()
      if (data.mainInsight || data.greeting) {
        setAi(data)
        localStorage.setItem(cacheKey, JSON.stringify(data))
      }
    } catch { /* */ }
    setLoading(false)
  }

  const statusColors: Record<string, string> = { '좋음': 'bg-[#E8F5E9] text-[#2E7D32]', '보통': 'bg-[#FFF8E1] text-[#F57F17]', '주의': 'bg-[#FFF0E6] text-[#D08068]' }

  return (
    <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">✨</span>
          <p className="text-[14px] font-bold text-[#1A1918]">AI 데일리 케어</p>
          {ai?.status && (
            <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[ai.status] || 'bg-[#E8E4DF] text-[#6B6966]'}`}>
              {ai.statusEmoji} {ai.status}
            </span>
          )}
        </div>
        <button onClick={onShare} className="text-[14px] text-[var(--color-primary)]">카톡 공유</button>
      </div>

      {/* 오늘 요약 */}
      <div className="flex gap-2 mb-3">
        {[
          { emoji: '🍼', count: todayFeedCount, label: '수유' },
          { emoji: '💤', count: todaySleepCount, label: '수면' },
          { emoji: '💩', count: todayPoopCount, label: '배변' },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-white/60 rounded-lg py-2 text-center">
            <p className="text-[14px] font-bold text-[#1A1918]">{s.emoji} {s.count}</p>
            <p className="text-[13px] text-[#9E9A95]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* AI 분석 결과 */}
      {loading && <p className="text-[13px] text-[#9E9A95] text-center py-2">AI가 기록을 분석하고 있어요...</p>}

      {!ai && !loading && (
        <button onClick={handleAiCare} disabled={events.length < 3}
          className="w-full py-2.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-40">
          {events.length < 3 ? `기록 ${3 - events.length}건 더 남기면 AI 케어 가능` : '✨ AI 케어받기'}
        </button>
      )}

      {ai && (
        <div className="space-y-2">
          {/* 핵심: 첫 문장 볼드 + 나머지 일반 */}
          {ai.mainInsight && (() => {
            const text = ai.mainInsight as string
            const firstDot = text.search(/[.!?]\s|[.!?]$/)
            const headline = firstDot > 0 ? text.slice(0, firstDot + 1) : text.slice(0, 50)
            const rest = firstDot > 0 ? text.slice(firstDot + 1).trim() : text.slice(50).trim()
            return (
              <div>
                <span className="text-[15px] font-bold text-[#1A1918]">{headline}</span>
                {rest && <span className="text-[14px] text-[#4A4744]"> {rest}</span>}
              </div>
            )
          })()}

          {/* 다음 행동 + 경고 (인라인) */}
          <div className="space-y-1.5">
            {ai.nextAction && (
              <p className="text-[13px] text-[#2E7D32] bg-[#E8F5E9] rounded-lg px-3 py-1.5">👉 {ai.nextAction}</p>
            )}
            {ai.warning && (
              <p className="text-[13px] text-[#D08068] bg-[#FFF0E6] rounded-lg px-3 py-1.5">⚠️ {ai.warning}</p>
            )}
          </div>

          {/* 상세 (접기) */}
          {(ai.feedAnalysis || ai.sleepAnalysis || ai.parentTip) && (
            !expanded ? (
              <button onClick={() => setExpanded(true)} className="text-[12px] text-[var(--color-primary)]">자세히 ▼</button>
            ) : (
              <div className="text-[12px] text-[#6B6966] space-y-1 pt-1.5 border-t border-[var(--color-accent-bg)]/40">
                {ai.feedAnalysis && <p>🍼 {ai.feedAnalysis}</p>}
                {ai.sleepAnalysis && <p>💤 {ai.sleepAnalysis}</p>}
                {ai.parentTip && <p className="text-[var(--color-primary)]">💚 {ai.parentTip}</p>}
                <button onClick={() => setExpanded(false)} className="text-[#9E9A95]">접기 ▲</button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
