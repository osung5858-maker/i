'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Toast from '@/components/ui/Toast'
import { BellIcon, ChevronRightIcon, BottleIcon, MoonIcon, PoopIcon, DropletIcon, ThermometerIcon, PillIcon, NoteIcon, SyringeIcon, BowlIcon, ChartIcon, SparkleIcon, BuildingIcon, BabyIcon, BathIcon, PumpIcon, CookieIcon, RiceIcon, ActivityIcon, CompassIcon, HeartFilledIcon, WalkIcon, StretchIcon, YogaIcon, ScaleIcon } from '@/components/ui/Icons'
import { decrypt } from '@/lib/security/crypto'
import { createClient } from '@/lib/supabase/client'
import { fetchUserRecords, upsertUserRecord } from '@/lib/supabase/userRecord'
import { getProfile, upsertProfile } from '@/lib/supabase/userProfile'
import { shareTodayRecord } from '@/lib/kakao/share-parenting'
import { trackEvent } from '@/lib/analytics'
import AIMealCard from '@/components/ai-cards/AIMealCard'
import MissionCard from '@/components/ui/MissionCard'
import TodayRecordSection from '@/components/ui/TodayRecordSection'
import type { RecordTile } from '@/components/ui/TodayRecordSection'
import PushPrompt from '@/components/push/PushPrompt'
import CareFlowCard from '@/components/care-flow/CareFlowCard'
import ReviewPrompt from '@/components/review/ReviewPrompt'
import DynamicAd from '@/components/ads/DynamicAd'

const FeedSheet = dynamic(() => import('@/components/quick-buttons/FeedSheet'), { ssr: false })
const PoopSheet = dynamic(() => import('@/components/quick-buttons/PoopSheet'), { ssr: false })
const TempSheet = dynamic(() => import('@/components/quick-buttons/TempSheet'), { ssr: false })
const FormulaModal = dynamic(() => import('@/components/quick-buttons/FormulaModal'), { ssr: false })
const SpotlightGuide = dynamic(() => import('@/components/onboarding/SpotlightGuide'), { ssr: false })
import { evaluateCareFlow, scheduleReminder } from '@/lib/care-flow/engine'
import type { CareAction } from '@/lib/care-flow/engine'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { savePendingEvent } from '@/lib/offline/db'
import type { CareEvent, EventType, Child } from '@/types'
import type { User } from '@supabase/supabase-js'
import { setSecure } from '@/lib/secureStorage'

// Event display constants (module-level to avoid re-creation per render)
const EVENT_ICON_MAP: Record<string, { Icon: React.FC<{ className?: string }>; bg: string; color: string }> = {
  // 육아 모드
  feed: { Icon: BottleIcon, bg: 'bg-[#FFF0E6]', color: 'text-[var(--color-primary)]' },
  sleep: { Icon: MoonIcon, bg: 'bg-[#E8E0F8]', color: 'text-[#7B6DB0]' },
  poop: { Icon: PoopIcon, bg: 'bg-[#FFF5E6]', color: 'text-[#C4913E]' },
  pee: { Icon: DropletIcon, bg: 'bg-[#E6F4FF]', color: 'text-[#5B9FD6]' },
  temp: { Icon: ThermometerIcon, bg: 'bg-[#FFE8E8]', color: 'text-[#D46A6A]' },
  memo: { Icon: NoteIcon, bg: 'bg-[#F0EDE8]', color: 'text-tertiary' },
  bath: { Icon: BathIcon, bg: 'bg-[#E6F4FF]', color: 'text-[#5B9FD6]' },
  pump: { Icon: PumpIcon, bg: 'bg-[#FFF0E6]', color: 'text-[var(--color-primary)]' },
  pump_left: { Icon: PumpIcon, bg: 'bg-[#FFF0E6]', color: 'text-[var(--color-primary)]' },
  pump_right: { Icon: PumpIcon, bg: 'bg-[#FFF0E6]', color: 'text-[var(--color-primary)]' },
  babyfood: { Icon: BowlIcon, bg: 'bg-[#FFF8F0]', color: 'text-[#C4913E]' },
  snack: { Icon: CookieIcon, bg: 'bg-[#FFF8F0]', color: 'text-[#C4913E]' },
  toddler_meal: { Icon: RiceIcon, bg: 'bg-[#FFF8F0]', color: 'text-[#C4913E]' },
  medication: { Icon: PillIcon, bg: 'bg-[#FFECDB]', color: 'text-[#C4783E]' },

  // 임신 모드
  preg_mood: { Icon: HeartFilledIcon, bg: 'bg-[#FFE4F2]', color: 'text-[#FF8FAB]' },
  preg_fetal_move: { Icon: BabyIcon, bg: 'bg-[#E8F5EF]', color: 'text-[#5BA882]' },
  preg_weight: { Icon: ScaleIcon, bg: 'bg-[#FFF0E6]', color: 'text-[#D08068]' },
  preg_stretch: { Icon: StretchIcon, bg: 'bg-[#F3E8FF]', color: 'text-[#8B5CF6]' },
  preg_meditate: { Icon: YogaIcon, bg: 'bg-[#F3E8FF]', color: 'text-[#8B5CF6]' },
  preg_edema: { Icon: DropletIcon, bg: 'bg-[#E6F4FF]', color: 'text-[#5B9FD6]' },
  preg_folic: { Icon: PillIcon, bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]' },
  preg_iron: { Icon: PillIcon, bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]' },
  preg_dha: { Icon: PillIcon, bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]' },
  preg_calcium: { Icon: PillIcon, bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]' },
  preg_vitd: { Icon: PillIcon, bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]' },
  preg_journal: { Icon: NoteIcon, bg: 'bg-[#EDE9FE]', color: 'text-[#A78BFA]' },

  // 임신 준비 모드
  prep_mood: { Icon: HeartFilledIcon, bg: 'bg-[#FFE4F2]', color: 'text-[#F472B6]' },
  prep_walk: { Icon: WalkIcon, bg: 'bg-[#FFF7ED]', color: 'text-[#F59E0B]' },
  prep_stretch: { Icon: StretchIcon, bg: 'bg-[#FFF7ED]', color: 'text-[#F59E0B]' },
  prep_yoga: { Icon: YogaIcon, bg: 'bg-[#FFF7ED]', color: 'text-[#F59E0B]' },
  prep_folic: { Icon: PillIcon, bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]' },
  prep_iron: { Icon: PillIcon, bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]' },
  prep_vitd: { Icon: PillIcon, bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]' },
  prep_omega: { Icon: PillIcon, bg: 'bg-[#ECFDF5]', color: 'text-[#10B981]' },
  prep_journal: { Icon: NoteIcon, bg: 'bg-[#EDE9FE]', color: 'text-[#A78BFA]' },
}
const EVENT_ICON_DEFAULT = { Icon: NoteIcon, bg: 'bg-[#F0EDE8]', color: 'text-tertiary' }
const EVENT_LABELS: Record<string, string> = {
  // 육아 모드
  feed: '분유', sleep: '수면', poop: '대변', pee: '소변', temp: '체온', memo: '메모', bath: '목욕', pump: '유축',
  babyfood: '이유식', snack: '간식', toddler_meal: '유아식', medication: '투약',
  night_sleep: '밤잠', nap: '낮잠', poop_normal: '대변 정상', poop_soft: '대변 묽음', poop_hard: '대변 단단',

  // 임신 모드
  preg_mood: '기분', preg_fetal_move: '태동', preg_weight: '체중', preg_stretch: '스트레칭',
  preg_meditate: '명상', preg_edema: '부종', preg_folic: '엽산', preg_iron: '철분',
  preg_dha: 'DHA', preg_calcium: '칼슘', preg_vitd: '비타민D', preg_journal: '기다림 일기',

  // 임신 준비 모드
  prep_mood: '기분', prep_walk: '걷기', prep_stretch: '스트레칭', prep_yoga: '요가',
  prep_folic: '엽산', prep_iron: '철분', prep_vitd: '비타민D', prep_omega: '오메가3', prep_journal: '기다림 일기',
}
const BABYFOOD_LABELS: Record<string, string> = { rice: '쌀미음', veggie: '야채죽', meat: '고기죽', fruit: '과일', etc: '기타' }
function getEventLabel(e: { type: string; tags?: Record<string, unknown> | null }): string {
  // 육아 모드
  if (e.type === 'feed' && e.tags?.side === 'left') return '모유 왼쪽'
  if (e.type === 'feed' && e.tags?.side === 'right') return '모유 오른쪽'
  if (e.type === 'feed' && e.tags?.amount_ml) return `분유 ${e.tags.amount_ml}ml`
  if (e.type === 'pump_left') return '유축 왼쪽'
  if (e.type === 'pump_right') return '유축 오른쪽'
  if (e.type === 'pump' && e.tags?.side === 'left') return '유축 왼쪽'
  if (e.type === 'pump' && e.tags?.side === 'right') return '유축 오른쪽'
  if (e.type === 'sleep' && e.tags?.sleepType === 'nap') return '낮잠'
  if (e.type === 'sleep' && e.tags?.sleepType === 'night') return '밤잠'
  if (e.type === 'poop' && e.tags?.status === 'normal') return '대변 정상'
  if (e.type === 'poop' && e.tags?.status === 'soft') return '대변 묽음'
  if (e.type === 'poop' && e.tags?.status === 'hard') return '대변 단단'
  if (e.type === 'babyfood' && e.tags?.subtype) return `이유식 · ${BABYFOOD_LABELS[e.tags.subtype as string] || e.tags.subtype}`
  if (e.type === 'medication' && e.tags?.medicine) return `투약 · ${e.tags.medicine}`

  // 임신 모드 - 기분
  if (e.type === 'preg_mood' && e.tags?.mood === 'happy') return '행복'
  if (e.type === 'preg_mood' && e.tags?.mood === 'excited') return '설렘'
  if (e.type === 'preg_mood' && e.tags?.mood === 'calm') return '평온'
  if (e.type === 'preg_mood' && e.tags?.mood === 'tired') return '피곤'
  if (e.type === 'preg_mood' && e.tags?.mood === 'anxious') return '불안'
  if (e.type === 'preg_mood' && e.tags?.mood === 'sick') return '아픔'

  // 임신 모드 - 부종
  if (e.type === 'preg_edema' && e.tags?.level === 'mild') return '부종'
  if (e.type === 'preg_edema' && e.tags?.level === 'severe') return '부종 심함'

  // 임신 준비 모드 - 기분
  if (e.type === 'prep_mood' && e.tags?.mood === 'happy') return '행복'
  if (e.type === 'prep_mood' && e.tags?.mood === 'excited') return '설렘'
  if (e.type === 'prep_mood' && e.tags?.mood === 'calm') return '평온'
  if (e.type === 'prep_mood' && e.tags?.mood === 'tired') return '피곤'
  if (e.type === 'prep_mood' && e.tags?.mood === 'anxious') return '불안'

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
  const [toast, setToast] = useState<{ message: string; undoId?: string; action?: { label: string; href?: string; onClick?: () => void } } | null>(null)
  const [sleepActive, setSleepActive] = useState(false)
  const [feedSheetOpen, setFeedSheetOpen] = useState(false)
  const [poopSheetOpen, setPoopSheetOpen] = useState(false)
  const [tempSheetOpen, setTempSheetOpen] = useState(false)
  const [formulaModalOpen, setFormulaModalOpen] = useState(false)
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  const { isOnline, pendingCount, syncing } = useOfflineSync()
  const [showGuide, setShowGuide] = useState(false)
  const [careActions, setCareActions] = useState<CareAction[]>([])

  const router = useRouter()

  // ?demo=parenting 파라미터로 데모 모드 설정 (콘솔 접근 불필요)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const demo = params.get('demo')
    if (demo === 'parenting' || demo === 'pregnant' || demo === 'preparing') {
      localStorage.setItem('dodam_mode', demo)
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_guide_pregnant', '1')
      localStorage.setItem('dodam_guide_preparing', '1')
      localStorage.setItem('dodam_splash_shown', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      window.location.href = '/'
      return
    }
  }, [])

  // 모드별 리디렉트: preparing/pregnant 모드인데 / 에 접근하면 해당 모드 홈으로
  useEffect(() => {
    const mode = localStorage.getItem('dodam_mode')
    if (mode === 'preparing') { router.replace('/preparing'); return }
    if (mode === 'pregnant') { router.replace('/pregnant'); return }
  }, [router])
  const supabase = createClient()

  useEffect(() => {
    // 안전장치: 15초 후에도 로딩 중이면 강제 해제 (Capacitor 웹뷰 + 네트워크 지연 고려)
    const safetyTimer = setTimeout(() => {
      setLoading(prev => {
        if (prev) router.push('/onboarding')
        return false
      })
    }, 15000)

    async function init() {
      try {
        // Capacitor에서는 middleware가 실행되지 않아 세션이 자동 갱신되지 않음
        // getSession()으로 localStorage에서 세션을 먼저 복원 후 getUser() 호출
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.refresh_token) {
          const expiresAt = session.expires_at ?? 0
          if (expiresAt * 1000 < Date.now()) {
            try {
              await supabase.auth.refreshSession()
            } catch {
              // 네트워크 오류 시 기존 세션으로 계속 시도
            }
          }
        }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/onboarding'); return }
        setUser(user)

        const { data: children, error: childError } = await supabase
          .from('children').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: true }).limit(1)

        if (childError || !children || children.length === 0) {
          return
        }

        const currentChild = children[0] as Child
        setChild(currentChild)
        // FAB 월령별 구성을 위해 localStorage에 저장
        await setSecure('dodam_child_birthdate', currentChild.birthdate)
        await setSecure('dodam_child_name', currentChild.name)

        const { start, end } = getTodayRange()
        const { data: todayEvents } = await supabase
          .from('events').select('id,child_id,recorder_id,type,start_ts,end_ts,amount_ml,tags,source').eq('child_id', currentChild.id)
          .gte('start_ts', start).lte('start_ts', end)
          .order('start_ts', { ascending: false })

        if (todayEvents) setEvents(todayEvents as CareEvent[])
        const activeSleep = todayEvents?.find((e: CareEvent) => e.type === 'sleep' && !e.end_ts)
        if (activeSleep) setSleepActive(true)
      } catch {
        // Supabase 연결 실패 시에도 로딩 해제
      } finally {
        clearTimeout(safetyTimer)
        setLoading(false)
      }
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

  // 스팟라이트 가이드 (localStorage + DB 이중 확인)
  useEffect(() => {
    if (localStorage.getItem('dodam_guide_parenting') === '1') return
    getProfile().then(p => {
      if (p?.tutorial_parenting) {
        localStorage.setItem('dodam_guide_parenting', '1')
      } else {
        setTimeout(() => setShowGuide(true), 1000)
      }
    }).catch(() => {})
  }, [])

  // 기록 핸들러
  const handleRecord = useCallback(async (type: EventType) => {
    trackEvent('record_created', { type })
    if (!user || !child) {
      setToast({ message: '아이 정보를 먼저 입력해주세요', action: { label: '입력하기', onClick: () => router.push('/settings/children/add') } })
      return
    }
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

  // 오프라인 이벤트 재동기화 — user & child 준비 후에만 실행
  useEffect(() => {
    const syncPending = async () => {
      if (!navigator.onLine || !user || !child) return
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
          const _n = new Date(); const today = `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}`
          const { data } = await supabase.from('events').select('*').eq('child_id', child.id).gte('start_ts', new Date(today + 'T00:00:00').toISOString()).order('start_ts', { ascending: false })
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

    // 분유(feed) → 모달 열기 (체온처럼 처리)
    if (rawType === 'feed' && !extra.amount_ml && !extra.tags) {
      setFormulaModalOpen(true)
      return
    }

    // 타입 매핑: FAB의 세부 타입 → DB 이벤트 타입
    const typeMap: Record<string, EventType> = {
      // 육아 모드
      breast_left: 'feed', breast_right: 'feed',
      pump_left: 'pump', pump_right: 'pump',
      poop_normal: 'poop', poop_soft: 'poop', poop_hard: 'poop',
      night_sleep: 'sleep', nap: 'sleep',
      note: 'memo',

      // 임신 모드
      preg_mood_happy: 'preg_mood', preg_mood_excited: 'preg_mood', preg_mood_calm: 'preg_mood',
      preg_mood_tired: 'preg_mood', preg_mood_anxious: 'preg_mood', preg_mood_sick: 'preg_mood',
      preg_edema_mild: 'preg_edema', preg_edema_severe: 'preg_edema',

      // 임신 준비 모드
      prep_mood_happy: 'prep_mood', prep_mood_excited: 'prep_mood', prep_mood_calm: 'prep_mood',
      prep_mood_tired: 'prep_mood', prep_mood_anxious: 'prep_mood',
    }
    const eventType = (typeMap[rawType] || rawType) as EventType

    // 라벨 매핑 (세부 타입 우선)
    const labelMap: Record<string, string> = {
      breast_left: '모유 왼쪽', breast_right: '모유 오른쪽',
      pump_left: '유축 왼쪽', pump_right: '유축 오른쪽',
      feed: '분유', poop: '배변', pee: '소변', sleep: '수면',
      temp: '체온', memo: '메모', bath: '목욕', pump: '유축',
      babyfood: '이유식', snack: '간식', toddler_meal: '유아식', medication: '투약',
    }
    const BABYFOOD_SUB: Record<string, string> = { rice: '쌀미음', veggie: '야채죽', meat: '고기죽', fruit: '과일', etc: '기타' }

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
      let durationLabel = labelMap[rawType] || labelMap[eventType] || eventType
      // pump/feed의 경우 side 태그 반영
      if ((eventType === 'pump' || eventType === 'feed') && extra.tags) {
        const tags = extra.tags as Record<string, unknown>
        if (tags.side === 'left') durationLabel = eventType === 'pump' ? '유축 왼쪽' : '모유 왼쪽'
        else if (tags.side === 'right') durationLabel = eventType === 'pump' ? '유축 오른쪽' : '모유 오른쪽'
      }
      const mins = Math.round((new Date(extra.end_ts as string).getTime() - new Date(extra.start_ts as string).getTime()) / 60000)
      if (error) {
        const offline = { id: crypto.randomUUID(), ...eventData, synced: false, created_at: new Date().toISOString() }
        await savePendingEvent(offline)
        setEvents((prev) => [offline as CareEvent, ...prev])
        setToast({ message: `${durationLabel} ${mins}분 기록 완료!` })
      } else {
        setEvents((prev) => [data as CareEvent, ...prev])
        setToast({ message: `${durationLabel} ${mins}분 기록 완료!`, undoId: data.id })
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
        const subtype = (extra.tags as Record<string, unknown>)?.subtype as string | undefined
        const amount = extra.amount_ml as number | undefined
        let detailLabel = labelMap[rawType] || labelMap[eventType] || eventType
        // pump/feed의 경우 side 태그 반영
        if ((eventType === 'pump' || eventType === 'feed') && extra.tags) {
          const tags = extra.tags as Record<string, unknown>
          if (tags.side === 'left') detailLabel = eventType === 'pump' ? '유축 왼쪽' : '모유 왼쪽'
          else if (tags.side === 'right') detailLabel = eventType === 'pump' ? '유축 오른쪽' : '모유 오른쪽'
        }
        const msg = celsius ? `체온 ${celsius}°C 기록 완료!`
          : subtype && eventType === 'babyfood' ? `이유식 ${BABYFOOD_SUB[subtype] || subtype} 기록 완료!`
          : amount ? `${detailLabel} ${amount}ml 기록 완료!`
          : `${detailLabel} 기록 완료!`
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
  const handleFormulaSubmit = async (ml: number) => {
    setFormulaModalOpen(false)
    const e = await insertEvent('feed', { amount_ml: ml })
    if (e) {
      setToast({ message: `분유 ${ml}ml 기록 완료!`, undoId: e.id })
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
        <div className="h-5 w-32 shimmer rounded-lg mb-2" />
        <div className="h-4 w-48 shimmer rounded-lg mb-6" />
        <div className="flex gap-3 mb-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="w-14 h-14 shimmer rounded-2xl" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 shimmer rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-page-bg)]">

      {/* 배너 */}
      {!isOnline && (
        <div className="bg-[#FFF8F3] px-4 py-2">
          <p className="text-body text-[var(--color-primary)] text-center font-medium">
            오프라인 · 기록은 저장돼요 {pendingCount > 0 && `(${pendingCount}건 대기)`}
          </p>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="bg-[var(--color-page-bg)]">
        <div className="max-w-lg mx-auto w-full pt-4 pb-24 px-5 space-y-3">

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

          {/* 앱 리뷰 유도 (3일 + 10건 이상 기록 시) */}
          <ReviewPrompt eventCount={events.length} />

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
            const tiles: RecordTile[] = []
            const headerRight = events.length > 0 ? (
              <Link href={`/records/${(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()}`}>
                <span className="text-body text-[var(--color-primary)] font-medium">전체보기 →</span>
              </Link>
            ) : null
            const getEventCatLabel = (e: typeof events[0]): { cat: string; label: string } => {
              if (e.type === 'poop') {
                const s = e.tags?.status as string
                return { cat: '대변', label: ({ normal: '정상', soft: '묽음', hard: '단단' }[s] || '') }
              }
              if (e.type === 'feed') {
                const side = e.tags?.side as string
                if (side === 'left') return { cat: '모유 왼쪽', label: '' }
                if (side === 'right') return { cat: '모유 오른쪽', label: '' }
                if (e.amount_ml) return { cat: '분유', label: `${e.amount_ml}ml` }
                return { cat: '수유', label: '' }
              }
              if (e.type === 'sleep') {
                const st = e.tags?.sleepType as string
                if (st === 'nap') return { cat: '수면', label: '낮잠' }
                if (st === 'night') return { cat: '수면', label: '밤잠' }
                const mins = e.end_ts ? Math.round((new Date(e.end_ts).getTime() - new Date(e.start_ts).getTime()) / 60000) : 0
                return { cat: '수면', label: mins ? `${mins}분` : '' }
              }
              if (e.type === 'temp') return { cat: '체온', label: e.tags?.celsius ? `${e.tags.celsius}°C` : '' }
              if (e.type === 'pump_left') return { cat: '유축', label: '왼쪽' }
              if (e.type === 'pump_right') return { cat: '유축', label: '오른쪽' }
              if (e.type === 'pump') {
                const side = e.tags?.side as string
                const mins = e.end_ts ? Math.round((new Date(e.end_ts).getTime() - new Date(e.start_ts).getTime()) / 60000) : 0
                if (side === 'left') return { cat: '유축', label: mins ? `왼쪽 ${mins}분` : '왼쪽' }
                if (side === 'right') return { cat: '유축', label: mins ? `오른쪽 ${mins}분` : '오른쪽' }
                if (e.amount_ml) return { cat: '유축', label: `${e.amount_ml}ml` }
                return { cat: '유축', label: mins ? `${mins}분` : '' }
              }
              if (e.type === 'medication') return { cat: '투약', label: (e.tags?.medicine as string) || '' }
              if (e.type === 'babyfood') return { cat: '이유식', label: e.amount_ml ? `${e.amount_ml}ml` : '' }
              const base = EVENT_LABELS[e.type] || e.type
              return { cat: base, label: '' }
            }
            const eventList = events.length > 0 ? (
              <div className="max-h-[200px] overflow-y-auto overflow-x-hidden hide-scrollbar">
                {events.slice(0, 10).map((e) => {
                  const time = new Date(e.start_ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                  const iconInfo = EVENT_ICON_MAP[e.type] || EVENT_ICON_DEFAULT
                  const isAlert = e.type === 'temp' && Number(e.tags?.celsius) >= 37.5
                  const { cat, label } = getEventCatLabel(e)
                  return (
                    <div key={e.id} className="flex items-center gap-2.5 py-2 border-b border-[#F0EDE8] last:border-0">
                      <span className="text-caption text-tertiary w-10 shrink-0 text-right font-mono">{time}</span>
                      <div className={`w-7 h-7 rounded-full ${iconInfo.bg} flex items-center justify-center shrink-0`}>
                        <iconInfo.Icon className={`w-3.5 h-3.5 ${iconInfo.color}`} />
                      </div>
                      <span className="text-body text-primary flex-1 min-w-0 truncate">
                        {label && <span className="text-tertiary font-normal mr-1">{cat}</span>}
                        <span className={`font-bold${isAlert ? ' text-red-500' : ''}`}>{label || cat}</span>
                      </span>
                      {isAlert && <span className="text-label bg-red-50 text-red-500 px-1 py-0.5 rounded font-bold shrink-0">주의</span>}
                    </div>
                  )
                })}
              </div>
            ) : null
            return (
              <TodayRecordSection
                count={events.length}
                tiles={tiles}
                emptyMessage="아직 기록이 없어요. 펜 버튼으로 첫 기록을 남겨보세요!"
                headerRight={headerRight}
                footer={eventList}
              />
            )
          })()}

          {/* ━━━ 3. 상태 카드 2열 ━━━ */}
          <div className="grid grid-cols-2 gap-2">
            {/* 예방접종 */}
            {(() => {
              const next = Object.entries(NEXT_VACCINES).find(([m]) => Number(m) >= ageMonths)
              const dDay = (() => {
                if (!next || !child?.birthdate) return null
                const birth = new Date(child.birthdate)
                const due = new Date(birth)
                due.setMonth(due.getMonth() + Number(next[0]))
                const diff = Math.ceil((due.getTime() - Date.now()) / 86400000)
                return diff
              })()
              const urgent = dDay !== null && dDay <= 7
              return (
                <Link href="/vaccination" className={`bg-white rounded-xl border p-3 flex items-center gap-2.5 hover-lift press-feedback ${urgent ? 'border-[#5B9FD6]/40 bg-[#E6F4FF]/30' : 'border-[#E8E4DF]'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${urgent ? 'bg-[#5B9FD6]' : 'bg-[#E6F4FF]'}`}>
                    <SyringeIcon className={`w-4.5 h-4.5 ${urgent ? 'text-white' : 'text-[#5B9FD6]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-primary truncate">{next ? next[1] : '접종 완료!'}</p>
                    <p className="text-caption text-tertiary">
                      {dDay === null ? '다음 접종' : dDay < 0 ? `D+${Math.abs(dDay)} 지남` : dDay === 0 ? '오늘 접종일!' : `D-${dDay}`}
                    </p>
                  </div>
                </Link>
              )
            })()}
            {/* 성장 기록 */}
            <Link href="/record" className="bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-2.5 hover-lift press-feedback">
              <div className="w-9 h-9 rounded-full bg-[#E8F5E9] flex items-center justify-center shrink-0">
                <ChartIcon className="w-4.5 h-4.5 text-[#4A9B6E]" />
              </div>
              <div>
                <p className="text-body-emphasis text-primary">{ageMonths}개월</p>
                <p className="text-body text-tertiary">성장 기록</p>
              </div>
            </Link>
          </div>

          {/* AI 식단 추천 (풀 너비) */}
          <AIMealCard mode="parenting" value={ageMonths} />

          {/* 부부 미션 카드 */}
          <MissionCard mode="parenting" />

          {/* 키즈노트 — 조건부 노출 */}
          <KidsnoteCard ageMonths={ageMonths} userId={user?.id} />

          {/* 광고 배너 — 어드민에서 켜고 끌 수 있음 */}
          <DynamicAd slotId="home_banner" className="mx-auto" />

          {/* 심심풀이 */}
          <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden hover-lift">
            <div className="grid grid-cols-3 divide-x divide-[#E8E4DF]">
              {([
                { href: '/fortune', Icon: ActivityIcon, title: '바이오리듬' },
                { href: '/fortune?tab=zodiac', Icon: CompassIcon, title: '띠 · 별자리' },
                { href: '/fortune?tab=fortune', Icon: SparkleIcon, title: '오늘의 운세' },
              ] as const).map((item) => (
                <Link key={item.href} href={item.href}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 press-feedback">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-page-bg)]">
                    <item.Icon className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <p className="text-caption font-semibold text-primary text-center leading-tight">{item.title}</p>
                </Link>
              ))}
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
              ? { label: toast.action.label, onClick: toast.action.onClick ?? (() => router.push(toast.action!.href!)) }
              : toast.undoId
                ? { label: '되돌리기', onClick: handleUndo }
                : undefined
          }
          duration={toast.action ? 5000 : 1000}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* 바텀시트 & 모달 */}
      <FeedSheet open={feedSheetOpen} onClose={() => { setFeedSheetOpen(false); handleFeedSelect(null) }} onSelect={handleFeedSelect} />
      <PoopSheet open={poopSheetOpen} onClose={() => { setPoopSheetOpen(false); handlePoopSelect(null) }} onSelect={handlePoopSelect} />
      <TempSheet open={tempSheetOpen} onClose={() => setTempSheetOpen(false)} onSubmit={handleTempSubmit} />
      <FormulaModal open={formulaModalOpen} onClose={() => setFormulaModalOpen(false)} onSubmit={handleFormulaSubmit} />

      {showGuide && <SpotlightGuide mode="parenting" onComplete={() => { localStorage.setItem('dodam_guide_parenting', '1'); upsertProfile({ tutorial_parenting: true }); setShowGuide(false) }} />}
    </div>
  )
}

function KnImageViewer({ images, startIndex, onClose }: { images: { original: string; thumbnail: string }[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)
  const touchX = { current: 0 }
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <span className="text-body text-white/70">{idx + 1} / {images.length}</span>
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
        <div className="relative w-full" style={{ maxHeight: '80vh', aspectRatio: '1 / 1' }}>
          <Image src={images[idx].original} alt="키즈노트 사진" fill className="object-contain rounded-lg select-none" draggable={false} />
        </div>
      </div>
      {images.length > 1 && (
        <>
          <div className="flex justify-center gap-1 py-2">
            {images.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/30'}`} />)}
          </div>
          <div className="flex items-center justify-center gap-6 pb-4">
            <button onClick={(e) => { e.stopPropagation(); setIdx(p => Math.max(0, p - 1)) }}
              disabled={idx === 0}
              className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white disabled:opacity-30 active:bg-white/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIdx(p => Math.min(images.length - 1, p + 1)) }}
              disabled={idx === images.length - 1}
              className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white disabled:opacity-30 active:bg-white/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function KidsnoteCard({ ageMonths, userId }: { ageMonths: number; userId?: string }) {
  const [connected, setConnected] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [knError, setKnError] = useState<string | null>(null)
  const [viewerImages, setViewerImages] = useState<{ original: string; thumbnail: string }[] | null>(null)
  const [viewerStart, setViewerStart] = useState(0)
  const [daycare, setDaycare] = useState(false)
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [cacheIsToday, setCacheIsToday] = useState(true)

  const fetchReports = async () => {
    if (loading) return
    // credential 읽기 (암호화 → 레거시 평문 폴백)
    let creds: { u?: string; p?: string } = {}
    const encData = localStorage.getItem('kn_credentials_enc')
    if (encData) {
      try {
        const decrypted = await decrypt(encData, 'dodam-kn-local-key')
        if (decrypted) creds = JSON.parse(decrypted)
      } catch { /* 복호화 실패 */ }
    }
    if (!creds.u || !creds.p) {
      const legacy = localStorage.getItem('kn_credentials')
      if (legacy) { try { creds = JSON.parse(legacy) } catch { /* */ } }
    }
    if (!creds.u || !creds.p) { setKnError('저장된 계정 정보가 없어요'); return }
    setLoading(true); setKnError(null)
    try {
      const loginRes = await fetch('/api/kidsnote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: creds.u, password: creds.p }),
      })
      const loginData = await loginRes.json()
      if (!loginData.success || !loginData.children?.length) {
        setKnError('키즈노트 계정을 확인해주세요')
        setLoading(false); return
      }
      const childId = loginData.children[0].id
      const reportRes = await fetch('/api/kidsnote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reports', sessionCookie: loginData.sessionCookie, childId }),
      })
      const reportData = await reportRes.json()
      const fetched = (reportData.results || []).slice(0, 3)
      const now = new Date().toISOString()
      setLastFetched(now)
      setCacheIsToday(true)
      if (fetched.length > 0) {
        setReports(fetched)
        localStorage.setItem('kn_cache_reports', JSON.stringify(fetched))
      }
      // 오늘 데이터가 없어도 이전 캐시는 유지 (setReports 호출 안 함)
    } catch { setKnError('불러오기에 실패했어요') }
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) return
    const hasCreds = !!localStorage.getItem('kn_credentials_enc') || !!localStorage.getItem('kn_credentials')
    setConnected(hasCreds)
    // daycare flag from DB
    fetchUserRecords(['daycare']).then(rows => {
      if (rows.length && (rows[0].value as any).enabled) setDaycare(true)
    }).catch(() => {})
    if (hasCreds) {
      const cached = localStorage.getItem('kn_cache_reports')
      const fetchedAt = localStorage.getItem('kn_cache_fetched_at')
      if (cached) { try { setReports(JSON.parse(cached).slice(0, 3)) } catch { /* */ } }
      if (fetchedAt) {
        setLastFetched(fetchedAt)
        setCacheIsToday(new Date(fetchedAt).toDateString() === new Date().toDateString())
      }
      // 오늘 아직 시도 안 했으면 딱 한 번 fetch
      const today = new Date().toDateString()
      const cacheDay = fetchedAt ? new Date(fetchedAt).toDateString() : null
      if (cacheDay !== today) {
        // 마킹 먼저 → 재마운트해도 중복 fetch 방지
        localStorage.setItem('kn_cache_fetched_at', new Date().toISOString())
        fetchReports()
      }
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

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
              <p className="text-body font-bold text-primary">
                {isPickupTime ? '오늘 알림장 확인하셨나요?' : '키즈노트 연동'}
              </p>
              <p className="text-body text-secondary">어린이집 알림장을 도담에서 확인해요</p>
            </div>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-tertiary" />
        </Link>
        {/* 어린이집 등록 토글 */}
        {!daycare && ageMonths >= 12 && (
          <button
            onClick={() => { const today = new Date().toISOString().split('T')[0]; upsertUserRecord(today, 'daycare', { enabled: true }).catch(() => {}); setDaycare(true) }}
            className="mt-2.5 w-full text-center text-caption text-secondary py-1.5 bg-white/60 rounded-lg active:bg-white"
          >
            우리 아이 어린이집 다녀요
          </button>
        )}
      </div>
    )
  }

  // 연결됨: 최신 알림장 + 사진
  const fetchedLabel = (() => {
    if (!lastFetched) return null
    const d = new Date(lastFetched)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diffMin < 1) return '방금 업데이트'
    if (diffMin < 60) return `${diffMin}분 전 업데이트`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}시간 전 업데이트`
    return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' 업데이트'
  })()

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-3">
      <div className="flex items-center justify-between mb-2">
        <Link href="/kidsnote" className="flex items-center gap-1.5 flex-1 min-w-0">
          <BuildingIcon className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
          <span className="text-body font-bold text-primary">오늘의 키즈노트</span>
          {reports.length > 0 && !cacheIsToday && (
            <span className="text-label text-tertiary bg-[#F0EDE8] px-1.5 py-0.5 rounded-full shrink-0">이전 기록</span>
          )}
          {reports.length > 0 && cacheIsToday && <span className="w-2 h-2 rounded-full bg-[#D05050] shrink-0" />}
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          {fetchedLabel && <span className="text-label text-tertiary">{fetchedLabel}</span>}
          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center gap-0.5 text-label text-[var(--color-primary)] bg-[#E8F5E9] px-2 py-1 rounded-full active:opacity-60 disabled:opacity-40">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
              <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
            {loading ? '불러오는 중' : '새로고침'}
          </button>
          <Link href="/kidsnote"><ChevronRightIcon className="w-4 h-4 text-tertiary" /></Link>
        </div>
      </div>

      {!loading && knError && (
        <p className="text-body text-[#D05050] py-2 text-center">{knError}</p>
      )}

      {!loading && !knError && reports.length === 0 && (
        <p className="text-body text-tertiary py-2 text-center">
          {lastFetched ? '오늘 알림장이 아직 없어요' : '새로고침을 눌러 확인해요'}
        </p>
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
                <div key={i} className="relative aspect-square cursor-pointer active:opacity-80 overflow-hidden"
                  onClick={() => { setViewerImages(allImages); setViewerStart(i) }}>
                  <Image src={img.thumbnail} alt="키즈노트 사진 썸네일" fill className="object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 text-body bg-black/50 text-white px-1 rounded">NEW</span>}
                </div>
              ))}
            </div>
            <p className="text-body-emphasis text-tertiary text-center mt-1.5">
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

// AI 응답 후처리: 모순·중복 제거
function sanitizeAiResponse(d: Record<string, unknown>) {
  const r = { ...d }
  const mi = (r.mainInsight as string) || ''
  const fa = (r.feedAnalysis as string) || ''
  const sa = (r.sleepAnalysis as string) || ''
  const wa = (r.warning as string) || ''
  const na = (r.nextAction as string) || ''

  // 1) mainInsight에서 수유/수면 수치 제거 (feedAnalysis/sleepAnalysis와 중복)
  //    "수유량 양호, 수면 부족" 같은 패턴 → feedAnalysis/sleepAnalysis가 이미 커버
  const feedSleepPattern = /수유[량\s]*(양호|과다|부족|많|적|높|낮|정상)[^,.]*/gi
  const sleepPattern = /수면[시간\s]*(양호|부족|과다|많|적|높|낮|정상|충분)[^,.]*/gi
  let cleanInsight = mi.replace(feedSleepPattern, '').replace(sleepPattern, '').replace(/^[,\s·]+|[,\s·]+$/g, '').trim()
  if (!cleanInsight || cleanInsight.length < 3) {
    // mainInsight가 비어버리면 status 기반 기본값
    const status = r.status as string
    cleanInsight = status === '주의' ? '리듬 조절이 필요해요' : status === '보통' ? '대체로 괜찮아요' : '오늘 하루 잘 진행 중'
  }
  r.mainInsight = cleanInsight

  // 2) feedAnalysis/sleepAnalysis에서 판단어 제거 (숫자만 남기기)
  const judgmentWords = /\s*(양호|과다|부족|많음|적음|높은 편|낮은 편|정상|충분|불충분|넘침|미달)[^0-9]*/gi
  if (fa) r.feedAnalysis = fa.replace(judgmentWords, '').replace(/[,\s]+$/, '').trim() || fa
  if (sa) r.sleepAnalysis = sa.replace(judgmentWords, '').replace(/[,\s]+$/, '').trim() || sa

  // 3) warning이 feedAnalysis/sleepAnalysis 수치와 거의 같은 내용이면 null로
  if (wa && fa) {
    // warning이 수유 수치를 그대로 반복하는지 확인
    const faNumbers = fa.match(/\d+/g)?.join('') || ''
    const waNumbers = wa.match(/\d+/g)?.join('') || ''
    if (faNumbers && waNumbers && faNumbers === waNumbers) {
      r.warning = null
    }
  }

  // 4) mainInsight와 warning 사이 모순 방지
  //    mainInsight에 "양호"가 있는데 warning이 있으면 → mainInsight 톤 조정
  if (r.warning && mi.includes('양호')) {
    r.mainInsight = cleanInsight.replace(/양호/g, '').trim() || '리듬 점검이 필요해요'
  }

  // 5) nextAction이 상태 설명이면 정리
  if (na && !/[해하가]/.test(na.slice(-3))) {
    // 동사로 끝나지 않으면 그냥 유지 (완벽하진 않지만 AI가 대부분 동사로 씀)
  }

  return r
}

// === AI 데일리 케어 카드 (Gemini) ===
function AiCareCard({ childName, ageMonths, events, todayFeedCount, todaySleepCount, todayPoopCount, onShare }: {
  childName: string; ageMonths: number; events: CareEvent[]; todayFeedCount: number; todaySleepCount: number; todayPoopCount: number; onShare: () => void
}) {
  const [ai, setAi] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchAi = useCallback(async (cacheKey: string) => {
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
        // 후처리: AI가 규칙을 어기면 모순 제거
        const clean = sanitizeAiResponse(data)
        setAi(clean)
        localStorage.setItem(cacheKey, JSON.stringify(clean))
      }
    } catch { /* */ }
    setLoading(false)
  }, [events, childName, ageMonths, todayFeedCount, todaySleepCount, todayPoopCount])

  useEffect(() => {
    // 캐시 복원 + 자동 트리거
    const cacheKey = `dodam_ai_care_${new Date().toISOString().split('T')[0]}_${events.length}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try { setAi(sanitizeAiResponse(JSON.parse(cached))) } catch { /* */ }
    } else if (events.length >= 5) {
      // 기록 5건 이상 + 캐시 없음 → 2초 후 자동 분석
      const timer = setTimeout(() => {
        fetchAi(cacheKey)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [events.length, fetchAi])

  const handleAiCare = () => {
    if (events.length < 3) return
    const cacheKey = `dodam_ai_care_${new Date().toISOString().split('T')[0]}_${events.length}`
    fetchAi(cacheKey)
  }

  const statusColors: Record<string, string> = {
    '좋음': 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]',
    '보통': 'bg-orange-50 text-orange-600',
    '주의': 'bg-red-50 text-red-600'
  }

  return (
    <div className="dodam-card-accent bg-gradient-to-br from-white via-[var(--color-primary-bg)] to-[var(--color-primary-bg)]">
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-2)' }}>
        <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
          <SparkleIcon className="w-4 h-4 text-[var(--color-primary)]" />
          <p className="text-body-emphasis">AI 데일리 케어</p>
          {ai?.status && (
            <span
              className={`text-body rounded-full font-medium ${statusColors[ai.status] || 'bg-[var(--neutral-200)] text-[var(--color-text-secondary)]'}`}
              style={{ padding: '2px var(--spacing-2)' }}
            >
              {ai.statusEmoji} {ai.status}
            </span>
          )}
        </div>
        <button
          data-guide="share-btn"
          onClick={onShare}
          className="text-body-emphasis text-[var(--color-primary)]"
          aria-label="오늘 기록을 카카오톡으로 공유하기"
        >
          카톡 공유
        </button>
      </div>

      {/* 오늘 요약 */}
      <div className="flex mb-3" style={{ gap: 'var(--spacing-2)' }}>
        {[
          { label: '수유', count: todayFeedCount, Icon: BottleIcon, color: 'var(--color-primary)' },
          { label: '수면', count: todaySleepCount, Icon: MoonIcon, color: '#5B6DFF' },
          { label: '배변', count: todayPoopCount, Icon: PoopIcon, color: '#C68A2E' },
        ].map((s) => (
          <div
            key={s.label}
            className="flex-1 rounded-lg text-center border border-white/80"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              padding: 'var(--spacing-2) 0'
            }}
          >
            <p className="text-body-emphasis flex items-center justify-center" style={{ color: s.color, gap: 'var(--spacing-1)' }}>
              <s.Icon className="w-4 h-4" /> {s.count}
            </p>
            <p className="text-body text-tertiary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* AI 분석 결과 */}
      {!ai && !loading && (
        <button onClick={handleAiCare} disabled={events.length < 3}
          className="w-full py-3 bg-[var(--color-primary)] rounded-xl active:opacity-80 disabled:opacity-40"
          style={{ fontSize: 15, color: '#FFFFFF', fontWeight: 700 }}>
          {events.length < 3 ? `기록 ${3 - events.length}건 더 남기면 AI 케어 가능` : 'AI 케어받기'}
        </button>
      )}

      {!ai && loading && (
        <button disabled
          className="w-full py-3 bg-[var(--color-primary)] rounded-xl opacity-80 flex items-center justify-center gap-2"
          style={{ fontSize: 15, color: '#FFFFFF', fontWeight: 700 }}>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          분석 중...
        </button>
      )}

      {ai && (
        <div className="space-y-2">
          {/* 종합 평가 + 다음 행동 (한 줄 묶음) */}
          {(ai.mainInsight || ai.nextAction) && (
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {ai.mainInsight && <p className="text-subtitle text-primary">{ai.mainInsight}</p>}
              {ai.nextAction && <p className="text-body text-[var(--color-primary)]">→ {ai.nextAction}</p>}
            </div>
          )}

          {/* 수유·수면 수치 카드 */}
          {(ai.feedAnalysis || ai.sleepAnalysis) && (
            <div className="flex gap-1.5">
              {ai.feedAnalysis && (
                <div className="flex-1 rounded-lg bg-white/60 border border-white/80 px-2.5 py-2">
                  <p className="text-label text-tertiary mb-0.5">수유</p>
                  <p className="text-body-emphasis text-primary">{ai.feedAnalysis}</p>
                </div>
              )}
              {ai.sleepAnalysis && (
                <div className="flex-1 rounded-lg bg-white/60 border border-white/80 px-2.5 py-2">
                  <p className="text-label text-tertiary mb-0.5">수면</p>
                  <p className="text-body-emphasis text-primary">{ai.sleepAnalysis}</p>
                </div>
              )}
            </div>
          )}

          {/* 경고 (수치 아닌 조치 이유만) */}
          {ai.warning && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <span className="text-body shrink-0">⚠️</span>
              <p className="text-body font-medium text-red-700">{ai.warning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
