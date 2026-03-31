'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FeedSheet from '@/components/quick-buttons/FeedSheet'
import PoopSheet from '@/components/quick-buttons/PoopSheet'
import TempSheet from '@/components/quick-buttons/TempSheet'
import Toast from '@/components/ui/Toast'
import { BellIcon, ChevronRightIcon, BottleIcon, MoonIcon, PoopIcon, DropletIcon, ThermometerIcon, PillIcon, NoteIcon, SyringeIcon, BowlIcon, ChartIcon, SparkleIcon, BuildingIcon, BabyIcon, BathIcon, PumpIcon, CookieIcon, RiceIcon, ActivityIcon, CompassIcon } from '@/components/ui/Icons'
import { decrypt } from '@/lib/security/crypto'
import { createClient } from '@/lib/supabase/client'
import { shareTodayRecord } from '@/lib/kakao/share-parenting'
import AIMealCard from '@/components/ai-cards/AIMealCard'
import TodayRecordSection from '@/components/ui/TodayRecordSection'
import type { RecordTile } from '@/components/ui/TodayRecordSection'
import SpotlightGuide from '@/components/onboarding/SpotlightGuide'
import PushPrompt from '@/components/push/PushPrompt'
import CareFlowCard from '@/components/care-flow/CareFlowCard'
import { evaluateCareFlow, scheduleReminder } from '@/lib/care-flow/engine'
import type { CareAction } from '@/lib/care-flow/engine'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { savePendingEvent } from '@/lib/offline/db'
import type { CareEvent, EventType, Child } from '@/types'
import { useGestureInput, getGestureEnabled } from '@/hooks/useGestureInput'
import type { User } from '@supabase/supabase-js'
import { setSecure } from '@/lib/secureStorage'

// Event display constants (module-level to avoid re-creation per render)
const EVENT_ICON_MAP: Record<string, { Icon: React.FC<{ className?: string }>; bg: string; color: string }> = {
  feed: { Icon: BottleIcon, bg: 'bg-[#FFF0E6]', color: 'text-[var(--color-primary)]' },
  sleep: { Icon: MoonIcon, bg: 'bg-[#E8E0F8]', color: 'text-[#7B6DB0]' },
  poop: { Icon: PoopIcon, bg: 'bg-[#FFF5E6]', color: 'text-[#C4913E]' },
  pee: { Icon: DropletIcon, bg: 'bg-[#E6F4FF]', color: 'text-[#5B9FD6]' },
  temp: { Icon: ThermometerIcon, bg: 'bg-[#FFE8E8]', color: 'text-[#D46A6A]' },
  memo: { Icon: NoteIcon, bg: 'bg-[#F0EDE8]', color: 'text-[#9E9A95]' },
  bath: { Icon: BathIcon, bg: 'bg-[#E6F4FF]', color: 'text-[#5B9FD6]' },
  pump: { Icon: PumpIcon, bg: 'bg-[#FFF0E6]', color: 'text-[var(--color-primary)]' },
  babyfood: { Icon: BowlIcon, bg: 'bg-[#FFF8F0]', color: 'text-[#C4913E]' },
  snack: { Icon: CookieIcon, bg: 'bg-[#FFF8F0]', color: 'text-[#C4913E]' },
  toddler_meal: { Icon: RiceIcon, bg: 'bg-[#FFF8F0]', color: 'text-[#C4913E]' },
  medication: { Icon: PillIcon, bg: 'bg-[#FFECDB]', color: 'text-[#C4783E]' },
}
const EVENT_ICON_DEFAULT = { Icon: NoteIcon, bg: 'bg-[#F0EDE8]', color: 'text-[#9E9A95]' }
const EVENT_LABELS: Record<string, string> = { feed: '수유', sleep: '수면', poop: '대변', pee: '소변', temp: '체온', memo: '메모', bath: '목욕', pump: '유축', babyfood: '이유식', snack: '간식', toddler_meal: '유아식', medication: '투약' }
function getEventLabel(e: { type: string; tags?: Record<string, unknown> | null }): string {
  if (e.type === 'feed' && e.tags?.side === 'left') return '모유(왼)'
  if (e.type === 'feed' && e.tags?.side === 'right') return '모유(오)'
  if (e.type === 'sleep' && e.tags?.sleepType === 'nap') return '낮잠'
  if (e.type === 'sleep' && e.tags?.sleepType === 'night') return '밤잠'
  if (e.type === 'poop' && e.tags?.status === 'normal') return '대변 정상'
  if (e.type === 'poop' && e.tags?.status === 'soft') return '대변 묽음'
  if (e.type === 'poop' && e.tags?.status === 'hard') return '대변 단단'
  if (e.type === 'medication' && e.tags?.medicine) return `투약 · ${e.tags.medicine}`
  return EVENT_LABELS[e.type] || e.type
}
const NEXT_VACCINES: Record<number, string> = { 0: 'BCG', 1: 'B형간염 2차', 2: 'DTaP 1차', 4: 'DTaP 2차', 6: 'DTaP 3차', 12: 'MMR', 15: '수두', 24: '일본뇌염' }

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
  const [showGuide, setShowGuide] = useState(false)
  const [careActions, setCareActions] = useState<CareAction[]>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      setUser(user)
      // 카카오/구글 프로필 정보 캐싱
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || ''
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || ''
      if (avatarUrl) localStorage.setItem('dodam_user_avatar', avatarUrl)
      if (userName) localStorage.setItem('dodam_user_name', userName)

      const { data: children, error: childError } = await supabase
        .from('children').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1)

      if (childError || !children || children.length === 0) {
        router.push('/settings/children/add'); return
      }

      const currentChild = children[0] as Child
      setChild(currentChild)
      // FAB 월령별 구성을 위해 localStorage에 저장
      await setSecure('dodam_child_birthdate', currentChild.birthdate)
      await setSecure('dodam_child_name', currentChild.name)
      if (currentChild.photo_url) localStorage.setItem('dodam_child_photo', currentChild.photo_url)

      const { start, end } = getTodayRange()
      const { data: todayEvents } = await supabase
        .from('events').select('id,child_id,recorder_id,type,start_ts,end_ts,amount_ml,tags,source').eq('child_id', currentChild.id)
        .gte('start_ts', start).lte('start_ts', end)
        .order('start_ts', { ascending: false })

      if (todayEvents) setEvents(todayEvents as CareEvent[])
      const activeSleep = todayEvents?.find((e: CareEvent) => e.type === 'sleep' && !e.end_ts)
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
        (payload: any) => {
          const n = payload.new as CareEvent
          setEvents((prev: CareEvent[]) => prev.some((e) => e.id === n.id) ? prev : [n, ...prev])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [child]) // eslint-disable-line react-hooks/exhaustive-deps

  // 스팟라이트 가이드
  useEffect(() => {
    if (!localStorage.getItem('dodam_guide_parenting')) {
      const t = setTimeout(() => setShowGuide(true), 1000)
      return () => clearTimeout(t)
    }
  }, [])

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
      if (e) setToast({ message: '수면 시작! 자장가 틀까요?', undoId: e.id, action: { label: '자장가 듣기', href: '/lullaby' } })
      return
    }
    if (type === 'feed') { const e = await insertEvent(type); if (e) { setPendingEventId(e.id); setFeedSheetOpen(true) }; return }
    if (type === 'poop') { const e = await insertEvent(type); if (e) { setPendingEventId(e.id); setPoopSheetOpen(true) }; return }
    if (type === 'temp') { setTempSheetOpen(true); return }
    if (type === 'medication' || type === 'memo') { const e = await insertEvent('medication'); if (e) setToast({ message: '투약 기록 완료!', undoId: e.id }); return }
    if (type === 'bath') { const e = await insertEvent('bath'); if (e) setToast({ message: '목욕 기록 완료!', undoId: e.id }); return }
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

  const triggerCareFlow = useCallback((newEvent: CareEvent, currentEvents: CareEvent[]) => {
    const actions = evaluateCareFlow(newEvent, currentEvents)
    if (actions.length === 0) return
    setCareActions(actions)
    // 리마인더가 있는 액션은 스케줄링
    actions.filter(a => a.remindAfterMin).forEach(a => scheduleReminder(a))
  }, [])

  // FAB 퀵버튼 이벤트 리스너 (BottomNav에서 dispatch)
  // FAB에서 이미 상세 선택(tags/amount)을 완료한 경우 바텀시트를 건너뛰고 바로 기록
  const handleFabRecord = useCallback(async (detail: Record<string, unknown>) => {
    const rawType = detail.type as string
    if (!rawType) return
    const { type: _, ...extra } = detail

    // 타입 매핑: FAB의 세부 타입 → DB 이벤트 타입
    const typeMap: Record<string, EventType> = {
      breast_left: 'feed', breast_right: 'feed',
      poop_normal: 'poop', poop_soft: 'poop', poop_hard: 'poop',
      night_sleep: 'sleep', nap: 'sleep',
      note: 'memo',
    }
    const eventType = (typeMap[rawType] || rawType) as EventType

    // 라벨 매핑
    const labelMap: Record<string, string> = {
      feed: '수유', poop: '배변', pee: '소변', sleep: '수면',
      temp: '체온', memo: '메모', bath: '목욕', pump: '유축',
      babyfood: '이유식', snack: '간식', toddler_meal: '유아식', medication: '투약',
    }

    // ===== Duration 종료 이벤트 (start_ts + end_ts 포함) =====
    if (extra.start_ts && extra.end_ts) {
      if (!user || !child) return
      const eventData = {
        child_id: child.id,
        recorder_id: user.id,
        type: eventType,
        start_ts: extra.start_ts as string,
        end_ts: extra.end_ts as string,
        tags: (extra.tags as Record<string, unknown>) || undefined,
        source: 'quick_button' as const,
      }
      if (navigator.vibrate) navigator.vibrate([30, 50, 30])
      const { data, error } = await supabase.from('events').insert(eventData).select().single()
      if (error) {
        const offline = { id: crypto.randomUUID(), ...eventData, synced: false, created_at: new Date().toISOString() }
        await savePendingEvent(offline)
        setEvents((prev) => [offline as CareEvent, ...prev])
        const mins = Math.round((new Date(extra.end_ts as string).getTime() - new Date(extra.start_ts as string).getTime()) / 60000)
        setToast({ message: `${labelMap[eventType] || eventType} ${mins}분 기록 완료!` })
      } else {
        setEvents((prev) => [data as CareEvent, ...prev])
        const mins = Math.round((new Date(extra.end_ts as string).getTime() - new Date(extra.start_ts as string).getTime()) / 60000)
        setToast({ message: `${labelMap[eventType] || eventType} ${mins}분 기록 완료!`, undoId: data.id })
      }
      return
    }

    // ===== 즉시 기록 (tags/amount 포함) =====
    const hasTags = extra.tags && Object.keys(extra.tags as object).length > 0
    const hasAmount = 'amount_ml' in extra

    if (hasTags || hasAmount) {
      const e = await insertEvent(eventType, extra)
      if (e) {
        const celsius = (extra.tags as Record<string, unknown>)?.celsius
        const msg = celsius ? `체온 ${celsius}°C 기록 완료!` : `${labelMap[eventType] || eventType} 기록 완료!`
        setToast({ message: msg, undoId: e.id })
        // 케어 플로우 평가 (체온 이상, 투약, 복합 증상)
        if (eventType === 'temp' || eventType === 'medication' || eventType === 'poop') {
          triggerCareFlow(e, events)
        }
      }
      return
    }

    // ===== 단순 즉시 기록 (추가 데이터 없음) =====
    if (eventType === 'pee') {
      const e = await insertEvent('pee'); if (e) setToast({ message: '소변 기록 완료!', undoId: e.id }); return
    }
    if (eventType === 'bath') {
      const e = await insertEvent('bath'); if (e) setToast({ message: '목욕 기록 완료!', undoId: e.id }); return
    }
    if (eventType === 'medication' || rawType === 'medication') {
      const e = await insertEvent('medication')
      if (e) { setToast({ message: '투약 기록 완료!', undoId: e.id }); triggerCareFlow(e, events) }
      return
    }
    if (eventType === 'snack') {
      const e = await insertEvent('snack'); if (e) setToast({ message: '간식 기록 완료!', undoId: e.id }); return
    }
    if (eventType === 'toddler_meal') {
      const e = await insertEvent('toddler_meal'); if (e) setToast({ message: '유아식 기록 완료!', undoId: e.id }); return
    }
    if (rawType === 'note' || eventType === 'memo') {
      const e = await insertEvent('memo'); if (e) setToast({ message: '메모 기록 완료!', undoId: e.id }); return
    }

    // 그 외 (수면 토글, 수유 바텀시트, 체온 바텀시트 등) → handleRecord로 위임
    handleRecord(eventType)
  }, [user, child, supabase, handleRecord, insertEvent]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) detail._handled = true // BottomNav에게 page.tsx가 처리함을 알림 (이중 저장 방지)
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
      const msg = celsius >= 38.5 ? `체온 ${celsius}°C 주의` : celsius >= 37.5 ? `체온 ${celsius}°C 미열` : `체온 ${celsius}°C`
      setToast({ message: msg, undoId: e.id })
      if (celsius >= 37.5) triggerCareFlow(e, events)
    }
  }

  const ageMonths = child ? getAgeMonths(child.birthdate) : 0
  const { todayFeedCount, todaySleepCount, todayPoopCount } = useMemo(() => ({
    todayFeedCount: events.filter((e) => e.type === 'feed').length,
    todaySleepCount: events.filter((e) => e.type === 'sleep' && e.end_ts).length,
    todayPoopCount: events.filter((e) => e.type === 'poop').length,
  }), [events])


  if (loading) {
    return (
      <div className="h-[100dvh] bg-white px-5 pt-14">
        <div className="h-5 w-32 bg-[#E8E4DF] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-48 bg-[#E8E4DF] rounded-lg animate-pulse mb-6" />
        <div className="flex gap-3 mb-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="w-14 h-14 bg-[#E8E4DF] rounded-2xl animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#E8E4DF] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      {/* 제스처 피드백 오버레이 */}
      {showFeedback && lastGesture && (
        <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
          <div className="bg-black/70 text-white px-6 py-4 rounded-2xl text-center animate-[fadeIn_0.15s_ease-out]">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-1">
              {lastGesture.type === 'feed' ? <BottleIcon className="w-6 h-6 text-white" /> : lastGesture.type === 'sleep' ? <MoonIcon className="w-6 h-6 text-white" /> : lastGesture.type === 'poop' ? <PoopIcon className="w-6 h-6 text-white" /> : <DropletIcon className="w-6 h-6 text-white" />}
            </div>
            <p className="text-[14px] font-semibold">
              {lastGesture.type === 'feed' ? '수유' : lastGesture.type === 'sleep' ? '수면' : lastGesture.type === 'poop' ? '대변' : '소변'} 기록!
            </p>
          </div>
        </div>
      )}

      {/* 헤더는 GlobalHeader (layout.tsx)에서 처리 */}

      {/* 배너 */}
      {!isOnline && (
        <div className="bg-[#FFF8F3] px-4 py-2">
          <p className="text-[13px] text-[var(--color-primary)] text-center font-medium">
            오프라인 · 기록은 저장돼요 {pendingCount > 0 && `(${pendingCount}건 대기)`}
          </p>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto bg-[var(--color-page-bg)]">
        <div className="max-w-lg mx-auto w-full pt-4 pb-44 px-5 space-y-3">

          {/* ━━━ 1. AI 히어로 ━━━ */}
          <div data-guide="ai-card">
          <AiCareCard
            childName={child?.name || '아이'}
            ageMonths={ageMonths}
            events={events}
            todayFeedCount={todayFeedCount}
            todaySleepCount={todaySleepCount}
            todayPoopCount={todayPoopCount}
            onShare={() => shareTodayRecord(child?.name || '아이', ageMonths, todayFeedCount, todaySleepCount, todayPoopCount)}
          />
          </div>

          {/* 푸시 알림 동의 (AI 결과 표시 후 자연스럽게) */}
          <PushPrompt show={events.length >= 3} />

          {/* 케어 플로우 — 기록 후 AI 제안/알림 */}
          {careActions.length > 0 && (
            <CareFlowCard
              actions={careActions}
              onDismiss={(id) => setCareActions(prev => prev.filter(a => a.id !== id))}
              onRecord={(type) => handleRecord(type as EventType)}
            />
          )}


          {/* ━━━ 2. 오늘 기록 ━━━ */}
          {(() => {
            const tiles: RecordTile[] = [
              { label: '수유', value: `${todayFeedCount}회`, color: todayFeedCount > 0 ? 'var(--color-primary)' : '#9E9A95' },
              { label: '수면', value: `${todaySleepCount}회`, color: todaySleepCount > 0 ? '#7B6DB0' : '#9E9A95' },
              { label: '대변', value: `${todayPoopCount}회`, color: todayPoopCount > 0 ? '#C4913E' : '#9E9A95' },
            ]
            const eventList = events.length > 0 ? (
              <>
                <Link href={`/records/${new Date().toISOString().split('T')[0]}`} className="flex justify-end mb-2">
                  <span className="text-[13px] text-[var(--color-primary)] font-medium">전체보기 →</span>
                </Link>
                <div className="max-h-[200px] overflow-y-auto hide-scrollbar">
                  {events.slice(0, 10).map((e) => {
                    const time = new Date(e.start_ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                    const iconInfo = EVENT_ICON_MAP[e.type] || EVENT_ICON_DEFAULT
                    const detail = e.amount_ml ? `${e.amount_ml}ml` :
                      e.end_ts ? `${Math.round((new Date(e.end_ts).getTime() - new Date(e.start_ts).getTime()) / 60000)}분` :
                      e.tags?.celsius ? `${e.tags.celsius}°C` :
                      e.tags?.status ? ({ normal: '정상', soft: '묽음', hard: '단단' }[e.tags.status as string] || '') : ''
                    const isAlert = e.type === 'temp' && Number(e.tags?.celsius) >= 37.5
                    return (
                      <div key={e.id} className="flex items-center gap-2.5 py-2 border-b border-[#F0EDE8] last:border-0">
                        <span className="text-[12px] text-[#9E9A95] w-10 shrink-0 text-right font-mono">{time}</span>
                        <div className={`w-7 h-7 rounded-full ${iconInfo.bg} flex items-center justify-center shrink-0`}>
                          <iconInfo.Icon className={`w-3.5 h-3.5 ${iconInfo.color}`} />
                        </div>
                        <span className="text-[13px] font-semibold text-[#1A1918]">{getEventLabel(e)}</span>
                        {detail && <span className={`text-[12px] font-medium ${isAlert ? 'text-red-500' : 'text-[var(--color-primary)]'}`}>{detail}</span>}
                        {isAlert && <span className="text-[10px] bg-red-50 text-red-500 px-1 py-0.5 rounded font-bold">주의</span>}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : null
            return (
              <TodayRecordSection
                count={events.length}
                tiles={tiles}
                emptyMessage="아직 기록이 없어요. 펜 버튼으로 첫 기록을 남겨보세요!"
                footer={eventList}
              />
            )
          })()}

          {/* ━━━ 3. 상태 카드 2열 ━━━ */}
          <div className="grid grid-cols-2 gap-2">
            {/* 예방접종 */}
            <Link href="/vaccination" className="bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-2.5 active:bg-[#F5F1EC]">
              <div className="w-9 h-9 rounded-full bg-[#E6F4FF] flex items-center justify-center shrink-0">
                <SyringeIcon className="w-4.5 h-4.5 text-[#5B9FD6]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1A1918]">
                  {(() => {
                    const next = Object.entries(NEXT_VACCINES).find(([m]) => Number(m) >= ageMonths)
                    return next ? next[1] : '완료!'
                  })()}
                </p>
                <p className="text-[13px] text-[#9E9A95]">다음 접종</p>
              </div>
            </Link>
            {/* 성장 기록 */}
            <Link href="/record" className="bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-2.5 active:bg-[#F5F1EC]">
              <div className="w-9 h-9 rounded-full bg-[#E8F5E9] flex items-center justify-center shrink-0">
                <ChartIcon className="w-4.5 h-4.5 text-[#4A9B6E]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1A1918]">{ageMonths}개월</p>
                <p className="text-[13px] text-[#9E9A95]">성장 기록</p>
              </div>
            </Link>
          </div>

          {/* AI 식단 추천 (풀 너비) */}
          <AIMealCard mode="parenting" value={ageMonths} />

          {/* 키즈노트 — 조건부 노출 */}
          <KidsnoteCard ageMonths={ageMonths} />

          {/* 재미 콘텐츠 */}
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <div className="grid grid-cols-3 gap-2">
              <Link href="/fortune" className="block bg-[var(--color-page-bg)] rounded-lg p-3 text-center active:opacity-80">
                <ActivityIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
                <p className="text-[12px] font-semibold text-[#1A1918]">바이오리듬</p>
              </Link>
              <Link href="/fortune?tab=zodiac" className="block bg-[var(--color-page-bg)] rounded-lg p-3 text-center active:opacity-80">
                <CompassIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
                <p className="text-[12px] font-semibold text-[#1A1918]">띠 · 별자리</p>
              </Link>
              <Link href="/fortune?tab=fortune" className="block bg-[var(--color-page-bg)] rounded-lg p-3 text-center active:opacity-80">
                <SparkleIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
                <p className="text-[12px] font-semibold text-[#1A1918]">오늘의 운세</p>
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

      {showGuide && <SpotlightGuide mode="parenting" onComplete={() => { localStorage.setItem('dodam_guide_parenting', '1'); setShowGuide(false) }} />}
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

function KidsnoteCard({ ageMonths }: { ageMonths: number }) {
  const [connected, setConnected] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [knError, setKnError] = useState<string | null>(null)
  const [viewerImages, setViewerImages] = useState<{ original: string; thumbnail: string }[] | null>(null)
  const [viewerStart, setViewerStart] = useState(0)
  const [daycare, setDaycare] = useState(false)

  const autoFetch = async () => {
    try {
      // credential 읽기 (암호화 → 레거시 평문 폴백)
      let creds: { u?: string; p?: string } = {}
      const encData = localStorage.getItem('kn_credentials_enc')
      if (encData) {
        try {
          const decrypted = await decrypt(encData, 'dodam-kn-local-key')
          if (decrypted) creds = JSON.parse(decrypted)
        } catch { /* 복호화 실패 */ }
      }
      // 암호화 실패 시 레거시 평문 폴백
      if (!creds.u || !creds.p) {
        const legacy = localStorage.getItem('kn_credentials')
        if (legacy) {
          try { creds = JSON.parse(legacy) } catch { /* */ }
        }
      }
      if (!creds.u || !creds.p) { setKnError(null); return }
      setLoading(true)
      const loginRes = await fetch('/api/kidsnote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: creds.u, password: creds.p }),
      })
      const loginData = await loginRes.json()
      if (!loginData.success || !loginData.children?.length) {
        // 캐시된 데이터가 있으면 그걸로 표시, 없으면 에러
        const cached = localStorage.getItem('kn_cache_reports')
        if (cached) { try { setReports(JSON.parse(cached).slice(0, 2)) } catch { /* */ } }
        else { setKnError('키즈노트 계정을 확인해주세요') }
        setLoading(false); return
      }
      setKnError(null) // 로그인 성공 시 에러 초기화
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const hasCreds = !!localStorage.getItem('kn_credentials_enc') || !!localStorage.getItem('kn_credentials')
    const hasDaycare = localStorage.getItem('dodam_daycare') === 'true'
    setConnected(hasCreds)
    setDaycare(hasDaycare)
    if (hasCreds) autoFetch()
  }, [])

  // 노출 조건: 연동됨 OR 어린이집 등록 OR 12개월+
  if (!connected && !daycare && ageMonths < 12) return null

  // 미연결: 유도 카드
  if (!connected) {
    const hour = new Date().getHours()
    const isPickupTime = hour >= 16 && hour <= 19 // 하원 시간
    return (
      <div className="bg-gradient-to-r from-[#FFF8F0] to-[#F0FAF4] rounded-xl border border-[#E8E4DF] p-4">
        <Link href="/kidsnote" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BuildingIcon className="w-6 h-6 text-[var(--color-primary)]" />
            <div>
              <p className="text-[13px] font-bold text-[#1A1918]">
                {isPickupTime ? '오늘 알림장 확인하셨나요?' : '키즈노트 연동'}
              </p>
              <p className="text-[13px] text-[#6B6966]">어린이집 알림장을 도담에서 확인해요</p>
            </div>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-[#9E9A95]" />
        </Link>
        {/* 어린이집 등록 토글 */}
        {!daycare && ageMonths >= 12 && (
          <button
            onClick={() => { localStorage.setItem('dodam_daycare', 'true'); setDaycare(true) }}
            className="mt-2.5 w-full text-center text-[12px] text-[#6B6966] py-1.5 bg-white/60 rounded-lg active:bg-white"
          >
            우리 아이 어린이집 다녀요
          </button>
        )}
      </div>
    )
  }

  // 연결됨: 최신 알림장 + 사진
  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-3">
      <Link href="/kidsnote" className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BuildingIcon className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-[13px] font-bold text-[#1A1918]">오늘의 키즈노트</span>
          {reports.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#D05050]" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[var(--color-primary)] bg-[#E8F5E9] px-1.5 py-0.5 rounded-full">연동됨</span>
          <ChevronRightIcon className="w-4 h-4 text-[#9E9A95]" />
        </div>
      </Link>

      {loading && <p className="text-[13px] text-[#9E9A95] py-2 text-center">알림장 확인 중...</p>}

      {!loading && knError && (
        <p className="text-[13px] text-[#D05050] py-2 text-center">{knError}</p>
      )}

      {!loading && !knError && reports.length === 0 && (
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
              {reports[0]?.created ? new Date(reports[0].created).toLocaleDateString('ko-KR') : ''}
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
          <SparkleIcon className="w-4 h-4 text-[#C4913E]" />
          <p className="text-[14px] font-bold text-[#1A1918]">AI 데일리 케어</p>
          {ai?.status && (
            <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[ai.status] || 'bg-[#E8E4DF] text-[#6B6966]'}`}>
              {ai.statusEmoji} {ai.status}
            </span>
          )}
        </div>
        <button data-guide="share-btn" onClick={onShare} className="text-[14px] text-[var(--color-primary)]">카톡 공유</button>
      </div>

      {/* 오늘 요약 */}
      <div className="flex gap-2 mb-3">
        {[
          { label: '수유', count: todayFeedCount, Icon: BottleIcon },
          { label: '수면', count: todaySleepCount, Icon: MoonIcon },
          { label: '배변', count: todayPoopCount, Icon: PoopIcon },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-white/60 rounded-lg py-2 text-center">
            <p className="text-[14px] font-bold text-[#1A1918] flex items-center justify-center gap-1"><s.Icon className="w-4 h-4" /> {s.count}</p>
            <p className="text-[13px] text-[#9E9A95]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* AI 분석 결과 */}
      {loading && <p className="text-[13px] text-[#9E9A95] text-center py-2">AI가 기록을 분석하고 있어요...</p>}

      {!ai && !loading && (
        <button onClick={handleAiCare} disabled={events.length < 3}
          className="w-full py-2.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-40">
          {events.length < 3 ? `기록 ${3 - events.length}건 더 남기면 AI 케어 가능` : 'AI 케어받기'}
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
              <p className="text-[13px] text-[#2E7D32] bg-[#E8F5E9] rounded-lg px-3 py-1.5">{ai.nextAction}</p>
            )}
            {ai.warning && (
              <p className="text-[13px] text-[#D08068] bg-[#FFF0E6] rounded-lg px-3 py-1.5">{ai.warning}</p>
            )}
          </div>

          {/* 상세 (접기) */}
          {(ai.feedAnalysis || ai.sleepAnalysis || ai.parentTip) && (
            !expanded ? (
              <button onClick={() => setExpanded(true)} className="text-[12px] text-[var(--color-primary)]">자세히 ▼</button>
            ) : (
              <div className="text-[12px] text-[#6B6966] space-y-1 pt-1.5 border-t border-[var(--color-accent-bg)]/40">
                {ai.feedAnalysis && <p>{ai.feedAnalysis}</p>}
                {ai.sleepAnalysis && <p>{ai.sleepAnalysis}</p>}
                {ai.parentTip && <p className="text-[var(--color-primary)]">{ai.parentTip}</p>}
                <button onClick={() => setExpanded(false)} className="text-[#9E9A95]">접기 ▲</button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
