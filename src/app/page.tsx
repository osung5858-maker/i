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
import StreakCard from '@/components/engagement/StreakCard'
import CommunityTeaser from '@/components/engagement/CommunityTeaser'
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

        </div>
      </header>

      {/* 배너 */}
      {!isOnline && (
        <div className="bg-[#FFF8F3] px-4 py-2">
          <p className="text-[11px] text-[#FF6F0F] text-center font-medium">
            📡 오프라인 · 기록은 저장돼요 {pendingCount > 0 && `(${pendingCount}건 대기)`}
          </p>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto bg-[#F5F4F1]">
        <div className="max-w-lg mx-auto pt-4 pb-44 px-5 space-y-3">

          {/* ━━━ 1. AI 히어로 ━━━ */}
          <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[#C8F0D8] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">✨</span>
                <p className="text-[14px] font-bold text-[#1A1918]">AI 데일리 케어</p>
              </div>
              <button onClick={() => shareTodayRecord(child?.name || '아이', ageMonths, todayFeedCount, todaySleepCount, todayPoopCount)} className="text-[10px] text-[#3D8A5A]">카톡 공유</button>
            </div>

            {/* 오늘 요약 */}
            <div className="flex gap-2 mb-3">
              {[
                { emoji: '🍼', count: todayFeedCount, label: '수유' },
                { emoji: '💤', count: todaySleepCount, label: '수면' },
                { emoji: '🩲', count: todayPoopCount, label: '배변' },
              ].map((s) => (
                <div key={s.label} className="flex-1 bg-white/60 rounded-lg py-2 text-center">
                  <p className="text-[14px] font-bold text-[#1A1918]">{s.emoji} {s.count}</p>
                  <p className="text-[9px] text-[#AEB1B9]">{s.label}</p>
                </div>
              ))}
            </div>

            {/* AI 메시지 */}
            <p className="text-[12px] text-[#1A1918] leading-relaxed">
              {events.length === 0
                ? `${child?.name || '아이'}의 오늘 첫 기록을 남겨보세요. AI가 리듬을 분석해드려요.`
                : events.length < 3
                  ? `${child?.name || '아이'}가 오늘 ${events.length}건 기록. 조금 더 쌓이면 패턴을 분석할 수 있어요.`
                  : `수유 ${todayFeedCount}회${todaySleepCount > 0 ? ` · 수면 ${todaySleepCount}회` : ''}${todayPoopCount > 0 ? ` · 배변 ${todayPoopCount}회` : ''} — 안정적인 리듬이에요 💚`
              }
            </p>
          </div>

          {/* ━━━ 2. 최근 기록 ━━━ */}
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-bold text-[#1A1918]">최근 기록</p>
              <Link href={`/records/${new Date().toISOString().split('T')[0]}`} className="text-[11px] text-[#3D8A5A]">전체보기 →</Link>
            </div>
            {events.length === 0 ? (
              <p className="text-[12px] text-[#AEB1B9] text-center py-3">아직 기록이 없어요</p>
            ) : (
              <div className="space-y-1">
                {events.slice(0, 4).map((e) => {
                  const time = new Date(e.start_ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                  const icons: Record<string, string> = { feed: '🍼', sleep: '💤', poop: '💩', pee: '💧', temp: '🌡️', memo: '💊' }
                  const labels: Record<string, string> = { feed: '수유', sleep: '수면', poop: '대변', pee: '소변', temp: '체온', memo: '투약' }
                  const detail = e.amount_ml ? ` ${e.amount_ml}ml` : e.end_ts ? ` ${Math.round((new Date(e.end_ts).getTime() - new Date(e.start_ts).getTime()) / 60000)}분` : ''
                  return (
                    <div key={e.id} className="flex items-center gap-2 py-1">
                      <span className="text-[11px] w-10 text-[#AEB1B9] shrink-0">{time}</span>
                      <span className="text-[11px]">{icons[e.type] || '📝'}</span>
                      <span className="text-[11px] text-[#1A1918]">{labels[e.type] || e.type}{detail}</span>
                    </div>
                  )
                })}
                {events.length > 4 && <p className="text-[10px] text-[#AEB1B9] text-center pt-1">+ {events.length - 4}건 더</p>}
              </div>
            )}
          </div>

          {/* ━━━ 3. 상태 카드 3열 ━━━ */}
          <div className="grid grid-cols-3 gap-2">
            {/* 예방접종 */}
            <Link href="/us" className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
              <p className="text-[10px] text-[#868B94]">💉 예방접종</p>
              <p className="text-[12px] font-bold text-[#1A1918] mt-0.5">
                {(() => {
                  const VACCINES: Record<number, string> = { 0: 'BCG', 1: 'B형간염 2차', 2: 'DTaP 1차', 4: 'DTaP 2차', 6: 'DTaP 3차', 12: 'MMR', 15: '수두', 24: '일본뇌염' }
                  const next = Object.entries(VACCINES).find(([m]) => Number(m) >= ageMonths)
                  return next ? next[1] : '완료!'
                })()}
              </p>
              <p className="text-[9px] text-[#AEB1B9] mt-0.5">다음 접종</p>
            </Link>

            {/* 이유식 (6개월+) */}
            {ageMonths >= 5 ? (
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">🥣 이유식</p>
                <p className="text-[12px] font-bold text-[#1A1918] mt-0.5">
                  {ageMonths < 6 ? '초기' : ageMonths < 8 ? '중기' : ageMonths < 10 ? '후기' : '완료기'}
                </p>
                <p className="text-[9px] text-[#AEB1B9] mt-0.5">{ageMonths}개월 단계</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">📊 오늘</p>
                <p className="text-[20px] font-bold text-[#1A1918] mt-0.5">{events.length}</p>
                <p className="text-[9px] text-[#AEB1B9]">기록</p>
              </div>
            )}

            {/* 성장 */}
            <Link href="/memory" className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
              <p className="text-[10px] text-[#868B94]">📈 성장</p>
              <p className="text-[20px] font-bold text-[#3D8A5A] mt-0.5">{ageMonths}</p>
              <p className="text-[9px] text-[#AEB1B9]">개월</p>
            </Link>
          </div>

          {/* ━━━ 스트릭 + 커뮤니티 ━━━ */}
          <StreakCard mode="parenting" />
          <CommunityTeaser />

          {/* ━━━ 4. 더보기 ━━━ */}
          <div className="space-y-2">
            {/* 빠른 링크 */}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/lullaby" className="bg-white rounded-xl border border-[#f0f0f0] p-3 flex items-center gap-2">
                <span className="text-lg">🌙</span>
                <div>
                  <p className="text-[12px] font-semibold text-[#1A1918]">자장가 · 동요</p>
                  <p className="text-[9px] text-[#868B94]">120곡+</p>
                </div>
              </Link>
              <Link href="/health" className="bg-white rounded-xl border border-[#f0f0f0] p-3 flex items-center gap-2">
                <span className="text-lg">💚</span>
                <div>
                  <p className="text-[12px] font-semibold text-[#1A1918]">내 건강</p>
                  <p className="text-[9px] text-[#868B94]">Google Fit 연동</p>
                </div>
              </Link>
            </div>
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
