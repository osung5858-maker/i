'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SunIcon, HeartIcon, ShieldIcon, UsersIcon,
  PlusIcon, XIcon, BookOpenIcon, MenuIcon, BottleIcon, MoonIcon, PoopIcon, ThermometerIcon,
  DropletIcon, PillIcon, BreastfeedIcon, BowlIcon, DiaperIcon, HospitalIcon,
  NoteIcon, ArrowLeftIcon, CookieIcon, RiceIcon, PumpIcon, BathIcon, NapIcon, NightIcon,
} from '@/components/ui/Icons'
import { autoBackup, restoreLocalData } from '@/lib/storage/backup'
import { createClient } from '@/lib/supabase/client'

interface Tab {
  href: string
  label: string
  icon: React.FC<{ className?: string }>
}

const TABS_BY_MODE: Record<string, Tab[]> = {
  parenting: [
    { href: '/', icon: SunIcon, label: '오늘' },
    { href: '/record', icon: BookOpenIcon, label: '추억' },
    { href: '/town', icon: ShieldIcon, label: '동네' },
    { href: '/more', icon: UsersIcon, label: '우리' },
  ],
  pregnant: [
    { href: '/pregnant', icon: SunIcon, label: '오늘' },
    { href: '/waiting', icon: BookOpenIcon, label: '기다림' },
    { href: '/town', icon: ShieldIcon, label: '동네' },
    { href: '/more', icon: UsersIcon, label: '우리' },
  ],
  preparing: [
    { href: '/preparing', icon: SunIcon, label: '오늘' },
    { href: '/waiting', icon: BookOpenIcon, label: '기다림' },
    { href: '/town', icon: ShieldIcon, label: '동네' },
    { href: '/more', icon: UsersIcon, label: '우리' },
  ],
}

// 월령별 기록 카테고리 생성
function getAgeMonths(): number {
  if (typeof window === 'undefined') return 6
  const childBirth = localStorage.getItem('dodam_child_birthdate')
  if (!childBirth) return 6 // 기본값
  const birth = new Date(childBirth)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function buildCategories(ageMonths: number): RecordCategory[] {
  const cats: RecordCategory[] = []

  // 먹기 — 월령별 구성
  const eatItems: RecordItem[] = []
  if (ageMonths < 13) { // 모유는 12개월까지
    eatItems.push(
      { type: 'breast_left', label: '모유(왼)', baseType: 'feed', tags: { side: 'left' }, isDuration: true },
      { type: 'breast_right', label: '모유(오)', baseType: 'feed', tags: { side: 'right' }, isDuration: true },
    )
  }
  if (ageMonths < 13) { // 분유
    eatItems.push({ type: 'feed', label: '분유', isSlider: true })
  }
  if (ageMonths >= 5) { // 이유식 5개월+
    eatItems.push({ type: 'babyfood', label: ageMonths < 7 ? '이유식(미음)' : ageMonths < 10 ? '이유식(죽)' : '이유식',
      step3: ageMonths < 7
        ? [{ label: '쌀미음', value: 'rice' }, { label: '감자', value: 'potato' }, { label: '고구마', value: 'sweet_potato' }]
        : [{ label: '야채죽', value: 'veggie' }, { label: '고기죽', value: 'meat' }, { label: '생선죽', value: 'fish' }, { label: '과일', value: 'fruit' }, { label: '기타', value: 'etc' }]
    })
  }
  if (ageMonths >= 10) { // 간식 10개월+
    eatItems.push({ type: 'snack', label: '간식' })
  }
  if (ageMonths >= 13) { // 유아식 13개월+
    eatItems.push({ type: 'toddler_meal', label: '유아식' })
  }
  if (ageMonths < 7) { // 유축 초기만
    eatItems.push({ type: 'pump', label: '유축', isDuration: true })
  }
  cats.push({ key: 'eat', label: '수유', color: 'var(--color-primary)', items: eatItems })

  // 잠 — 시간대 자동 분기 (20시~7시: 밤잠, 나머지: 낮잠)
  const hour = new Date().getHours()
  const isNight = hour >= 20 || hour < 7
  cats.push({ key: 'sleep', label: '잠', color: '#6366F1',
    items: [
      { type: isNight ? 'night_sleep' : 'nap', label: isNight ? '밤잠' : '낮잠', baseType: 'sleep', tags: { sleepType: isNight ? 'night' : 'nap' }, isDuration: true },
    ] })

  // 기저귀 — 항상
  cats.push({ key: 'diaper', label: '기저귀', color: '#D89575',
    items: [
      { type: 'pee', label: '소변' },
      { type: 'poop_normal', label: '대변 정상', baseType: 'poop', tags: { status: 'normal' } },
      { type: 'poop_soft', label: '대변 묽음', baseType: 'poop', tags: { status: 'soft' } },
      { type: 'poop_hard', label: '대변 단단', baseType: 'poop', tags: { status: 'hard' } },
    ] })

  // 건강 — 항상
  cats.push({ key: 'health', label: '건강', color: '#D08068',
    items: [
      { type: 'temp', label: '체온', isSlider: true },
      { type: 'bath', label: '목욕', isDuration: true },
      { type: 'medication', label: '투약', hasMemo: true },
    ] })

  return cats
}

interface RecordItem {
  type: string; label: string
  hasInput?: string
  step3?: { label: string; value: number | string; unit?: string }[]
  tags?: Record<string, string>
  baseType?: string
  isDuration?: boolean
  isSlider?: boolean
  hasMemo?: boolean
}

interface ActiveSession {
  type: string
  baseType?: string
  label: string
  tags?: Record<string, string>
  startTs: number
  color: string
}
interface RecordCategory {
  key: string; label: string; color: string; items: RecordItem[]
}

const RECORD_CATEGORIES: RecordCategory[] = [
  { key: 'eat', label: '수유', color: 'var(--color-primary)',
    items: [
      { type: 'breast_left', label: '모유(왼)', baseType: 'feed', tags: { side: 'left' }, isDuration: true },
      { type: 'breast_right', label: '모유(오)', baseType: 'feed', tags: { side: 'right' }, isDuration: true },
      { type: 'feed', label: '분유',
        step3: [{ label: '60', value: 60, unit: 'ml' }, { label: '90', value: 90, unit: 'ml' }, { label: '120', value: 120, unit: 'ml' }, { label: '150', value: 150, unit: 'ml' }, { label: '180', value: 180, unit: 'ml' }] },
      { type: 'babyfood', label: '이유식',
        step3: [{ label: '쌀미음', value: 'rice' }, { label: '야채죽', value: 'veggie' }, { label: '고기죽', value: 'meat' }, { label: '과일', value: 'fruit' }, { label: '기타', value: 'etc' }] },
      { type: 'pump', label: '유축', isDuration: true },
    ]
  },
  { key: 'sleep', label: '잠', color: '#6366F1',
    items: [
      { type: 'sleep', label: '수면', baseType: 'sleep', isDuration: true },
    ]
  },
  { key: 'diaper', label: '기저귀', color: '#D89575',
    items: [
      { type: 'pee', label: '소변' },
      { type: 'poop_normal', label: '대변 정상', baseType: 'poop', tags: { status: 'normal' } },
      { type: 'poop_soft', label: '대변 묽음', baseType: 'poop', tags: { status: 'soft' } },
      { type: 'poop_hard', label: '대변 단단', baseType: 'poop', tags: { status: 'hard' } },
    ]
  },
  { key: 'health', label: '건강', color: '#D08068',
    items: [
      { type: 'temp', label: '체온', isSlider: true },
      { type: 'bath', label: '목욕', isDuration: true },
      { type: 'medication', label: '투약', hasMemo: true },
    ]
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [fabOpen, setFabOpen] = useState(false)
  const [mode, setMode] = useState('parenting') // SSR 일관성 — useEffect에서 실제 모드 설정

  // 앱 시작 시 데이터 자동 백업 + 복원
  useEffect(() => {
    restoreLocalData()
    autoBackup()
  }, [])

  // pathname 기반 모드 자동 감지 (localStorage보다 우선)
  useEffect(() => {
    if (pathname?.startsWith('/preparing') || pathname?.startsWith('/waiting')) {
      setMode('preparing')
    } else if (pathname?.startsWith('/pregnant')) {
      setMode('pregnant')
    } else {
      const saved = localStorage.getItem('dodam_mode')
      if (saved) setMode(saved)
    }
  }, [pathname])

  const tabs = TABS_BY_MODE[mode] || TABS_BY_MODE.parenting
  const DYNAMIC_CATEGORIES = buildCategories(getAgeMonths())

  // 다른 페이지로 이동하면 FAB 닫기
  useEffect(() => { setFabOpen(false) }, [pathname])

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null) // 3단계: 용량 선택
  const [tempSlider, setTempSlider] = useState<string | null>(null) // 슬라이더 열린 아이템 타입
  const [tempValue, setTempValue] = useState(36.5)
  const [feedValue, setFeedValue] = useState(120)
  const [memoItem, setMemoItem] = useState<string | null>(null) // 투약 메모
  const [memoText, setMemoText] = useState('')
  const fabStyle = 'B' as const // B안 확정

  // ESC로 닫기 — 단계별 역방향 닫기
  useEffect(() => {
    if (!fabOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (tempSlider || memoItem) {
        setTempSlider(null); setMemoItem(null); setMemoText('')
      } else if (selectedItem) {
        setSelectedItem(null)
      } else if (selectedCategory) {
        setSelectedCategory(null)
      } else {
        setFabOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fabOpen, selectedCategory, selectedItem, tempSlider, memoItem])

  const handleQuickRecord = useCallback(async (type: string, extra?: Record<string, unknown>) => {
    if (navigator.vibrate) navigator.vibrate(30)

    // 이벤트 dispatch → page.tsx가 마운트되어 있으면 DB 저장 + UI 업데이트 처리
    const event = new CustomEvent('dodam-record', { detail: { type, ...extra, _handled: false } })
    window.dispatchEvent(event)

    // page.tsx가 없는 페이지(추억/동네/우리 등)에서는 직접 DB 저장
    if (!(event.detail as any)._handled) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const children = await supabase.from('children').select('id').eq('user_id', user.id).limit(1)
          const childId = children.data?.[0]?.id
          if (childId) {
            await supabase.from('events').insert({
              child_id: childId,
              recorder_id: user.id,
              type,
              start_ts: new Date().toISOString(),
              tags: extra?.tags || undefined,
              amount_ml: extra?.amount_ml || undefined,
              source: 'quick_button',
            })
          }
        }
      } catch { /* 오프라인 폴백 */ }
    }

    setFabOpen(false)
    setSelectedCategory(null)
    setSelectedItem(null)
    setTempSlider(null)
    setMemoItem(null)
    setMemoText('')
  }, [])

  // ===== Duration-based session state =====
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dodam_active_session')
      if (stored) {
        const session = JSON.parse(stored) as ActiveSession
        if (session && session.startTs) {
          setActiveSession(session)
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Timer: update elapsed every second when session is active
  useEffect(() => {
    if (activeSession) {
      const tick = () => setElapsed(Math.floor((Date.now() - activeSession.startTs) / 1000))
      tick() // immediate first tick
      timerRef.current = setInterval(tick, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    } else {
      setElapsed(0)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }, [activeSession])

  const startSession = useCallback((item: RecordItem, catColor: string) => {
    const session: ActiveSession = {
      type: item.type,
      baseType: item.baseType,
      label: item.label,
      tags: item.tags,
      startTs: Date.now(),
      color: catColor,
    }
    localStorage.setItem('dodam_active_session', JSON.stringify(session))
    setActiveSession(session)
    setFabOpen(false)
    setSelectedCategory(null)
    setSelectedItem(null)
    setTempSlider(null)
    if (navigator.vibrate) navigator.vibrate(30)
  }, [])

  const endSession = useCallback(async () => {
    if (!activeSession) return
    if (navigator.vibrate) navigator.vibrate([30, 50, 30])

    const recordType = activeSession.baseType || activeSession.type
    const startTs = new Date(activeSession.startTs).toISOString()
    const endTs = new Date().toISOString()
    const mins = Math.round((Date.now() - activeSession.startTs) / 60000)

    // 이벤트 dispatch → page.tsx가 마운트되어 있으면 DB 저장 + UI 업데이트 처리
    const detail: Record<string, unknown> = { type: recordType, start_ts: startTs, end_ts: endTs, _handled: false }
    if (activeSession.tags) detail.tags = activeSession.tags
    const event = new CustomEvent('dodam-record', { detail })
    window.dispatchEvent(event)

    // page.tsx가 없는 페이지에서는 직접 DB 저장
    if (!(event.detail as any)._handled) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const children = await supabase.from('children').select('id').eq('user_id', user.id).limit(1)
          const childId = children.data?.[0]?.id
          if (childId) {
            await supabase.from('events').insert({
              child_id: childId,
              recorder_id: user.id,
              type: recordType,
              start_ts: startTs,
              end_ts: endTs,
              tags: activeSession.tags || undefined,
              source: 'quick_button',
            })
          }
        }
      } catch { /* 오프라인 폴백 */ }
    }

    localStorage.removeItem('dodam_active_session')
    setActiveSession(null)

    // 토스트 표시
    const labels: Record<string, string> = { feed: '수유', bath: '목욕', sleep: '수면', pump: '유축' }
    const label = labels[recordType] || activeSession.label
    window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: `${label} ${mins}분 기록 완료!` } }))
  }, [activeSession])

  const formatElapsed = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }

  if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/invite') || pathname?.startsWith('/post/') || pathname?.startsWith('/market-item/') || pathname?.startsWith('/landing')) {
    return null
  }

  return (
    <>
      {/* ===== 반원형 변신 FAB ===== */}
      {!activeSession && fabOpen && fabStyle === 'B' && (() => {
        // 항목 수에 따라 반원형 좌표 동적 생성 (양끝 20° 여백으로 nav와 겹침 방지)
        const arcPositions = (count: number, radius = 140): { x: number; y: number }[] => {
          if (count === 1) return [{ x: 0, y: -radius }]
          if (count === 2) return [{ x: -radius * 0.7, y: -radius * 0.7 }, { x: radius * 0.7, y: -radius * 0.7 }]
          // 160°~20° 부채꼴로 균등 분할 (양끝이 nav 위로 올라오도록)
          const startAngle = (160 * Math.PI) / 180  // 왼쪽 (160°)
          const endAngle = (20 * Math.PI) / 180      // 오른쪽 (20°)
          return Array.from({ length: count }, (_, i) => {
            const angle = startAngle + (endAngle - startAngle) * (i / (count - 1))
            return { x: Math.round(Math.cos(angle) * radius), y: Math.round(-Math.sin(angle) * radius) }
          })
        }
        const ARC = arcPositions(DYNAMIC_CATEGORIES.length)
        if (!selectedCategory) {
          // 1단계: 카테고리
          return (
            <>
              <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setFabOpen(false)} />
              <div className="fixed z-[70] bottom-[80px] left-1/2" style={{ maxWidth: 430 }}>
                <div className="relative" style={{ width: 0, height: 0 }}>
                  {DYNAMIC_CATEGORIES.map((cat, i) => (
                    <div key={cat.key} className="absolute flex flex-col items-center gap-1.5"
                      style={{ left: ARC[i].x - 28, top: ARC[i].y - 28, animation: `fabItemPop 0.25s ${i * 0.04}s both cubic-bezier(0.34, 1.56, 0.64, 1)` }}>
                      <button onClick={() => {
                        if (cat.items.length === 1 && cat.items[0].isDuration) startSession(cat.items[0], cat.color)
                        else if (cat.items.length === 1) handleQuickRecord(cat.items[0].type)
                        else setSelectedCategory(cat.key)
                      }} className="w-16 h-16 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.25)] active:scale-90 transition-transform bg-white">
                        {(() => {
                          const iconMap: Record<string, React.ReactNode> = {
                            eat: <BottleIcon className="w-8 h-8" />,
                            sleep: <MoonIcon className="w-8 h-8" />,
                            diaper: <DiaperIcon className="w-8 h-8" />,
                            health: <HospitalIcon className="w-8 h-8" />,
                            more: <NoteIcon className="w-8 h-8" />,
                          }
                          return <span style={{ color: cat.color }}>{iconMap[cat.key] || <NoteIcon className="w-8 h-8" />}</span>
                        })()}
                      </button>
                      <span className="text-[12px] font-bold text-white whitespace-nowrap bg-black/50 px-2 py-0.5 rounded-full">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        }
        // 슬라이더 카드 UI (체온 / 분유 공용)
        if (tempSlider) {
          const isTemp = tempSlider === 'temp'
          const isFeed = tempSlider === 'feed'

          // 체온 설정
          const isHigh = tempValue >= 37.5
          const isDanger = tempValue >= 38.5
          const tempColor = isDanger ? '#EF4444' : isHigh ? '#F59E0B' : '#10B981'

          // 분유 설정
          const feedColor = 'var(--color-primary)'

          return (
            <>
              <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { setFabOpen(false); setSelectedCategory(null); setTempSlider(null) }} />
              <div className="fixed z-[70] bottom-[80px] left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px]">
                <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-5" style={{ animation: 'fabItemPop 0.25s both cubic-bezier(0.34, 1.56, 0.64, 1)' }}>

                  {isTemp && (
                    <>
                      <div className="text-center mb-4">
                        <span className="text-[42px] font-bold tabular-nums" style={{ color: tempColor }}>{tempValue.toFixed(1)}</span>
                        <span className="text-[18px] font-medium text-[#9E9A95] ml-1">°C</span>
                        {isDanger && <p className="text-[12px] font-bold text-red-500 mt-1">고열 주의</p>}
                        {isHigh && !isDanger && <p className="text-[12px] font-bold text-amber-500 mt-1">미열</p>}
                      </div>
                      <div className="px-1 mb-4">
                        <input type="range" min={35.0} max={42.0} step={0.1} value={tempValue}
                          onChange={(e) => setTempValue(parseFloat(e.target.value))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, #10B981 0%, #10B981 ${((37.5 - 35) / 7) * 100}%, #F59E0B ${((37.5 - 35) / 7) * 100}%, #F59E0B ${((38.5 - 35) / 7) * 100}%, #EF4444 ${((38.5 - 35) / 7) * 100}%, #EF4444 100%)` }}
                        />
                        <div className="flex justify-between text-[10px] text-[#9E9A95] mt-1 px-0.5">
                          <span>35.0</span><span>36.5</span><span>37.5</span><span>38.5</span><span>42.0</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mb-4">
                        {[36.5, 37.0, 37.5, 38.0, 38.5].map((v) => (
                          <button key={v} onClick={() => setTempValue(v)}
                            className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95"
                            style={{ backgroundColor: tempValue === v ? tempColor : '#F5F3F0', color: tempValue === v ? 'white' : '#6B6966' }}>
                            {v.toFixed(1)}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setTempSlider(null)} className="flex-1 py-3 rounded-xl text-[14px] font-medium text-[#6B6966] bg-[#F5F3F0] active:scale-95 transition-transform">뒤로</button>
                        <button onClick={() => { handleQuickRecord('temp', { tags: { celsius: tempValue } }); setTempSlider(null) }}
                          className="flex-[2] py-3 rounded-xl text-[14px] font-bold text-white active:scale-95 transition-transform" style={{ background: tempColor }}>
                          {tempValue.toFixed(1)}°C 기록
                        </button>
                      </div>
                    </>
                  )}

                  {isFeed && (
                    <>
                      <div className="text-center mb-4">
                        <span className="text-[42px] font-bold tabular-nums" style={{ color: feedColor }}>{feedValue}</span>
                        <span className="text-[18px] font-medium text-[#9E9A95] ml-1">ml</span>
                      </div>
                      <div className="px-1 mb-4">
                        <input type="range" min={10} max={300} step={10} value={feedValue}
                          onChange={(e) => setFeedValue(parseInt(e.target.value))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, var(--color-primary) ${((feedValue - 10) / 290) * 100}%, #E8E4DF ${((feedValue - 10) / 290) * 100}%)` }}
                        />
                        <div className="flex justify-between text-[10px] text-[#9E9A95] mt-1 px-0.5">
                          <span>10</span><span>100</span><span>200</span><span>300ml</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mb-4">
                        {[60, 90, 120, 150, 180, 240].map((v) => (
                          <button key={v} onClick={() => setFeedValue(v)}
                            className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95"
                            style={{ backgroundColor: feedValue === v ? 'var(--color-primary)' : '#F5F3F0', color: feedValue === v ? 'white' : '#6B6966' }}>
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setTempSlider(null)} className="flex-1 py-3 rounded-xl text-[14px] font-medium text-[#6B6966] bg-[#F5F3F0] active:scale-95 transition-transform">뒤로</button>
                        <button onClick={() => { handleQuickRecord('feed', { amount_ml: feedValue }); setTempSlider(null) }}
                          className="flex-[2] py-3 rounded-xl text-[14px] font-bold text-white active:scale-95 transition-transform" style={{ background: 'var(--color-primary)' }}>
                          분유 {feedValue}ml 기록
                        </button>
                      </div>
                    </>
                  )}

                </div>
              </div>
            </>
          )
        }

        // 투약 메모 UI
        if (memoItem) {
          return (
            <>
              <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { setFabOpen(false); setSelectedCategory(null); setMemoItem(null); setMemoText('') }} />
              <div className="fixed z-[70] bottom-[80px] left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px]">
                <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-5" style={{ animation: 'fabItemPop 0.25s both cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  <p className="text-[15px] font-bold text-[#1A1918] mb-3">투약 기록</p>
                  <input
                    type="text" placeholder="약 이름 (선택)" value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E4DF] bg-[#FAFAF8] text-[14px] text-[#1A1918] placeholder-[#C4C0BB] focus:outline-none focus:border-[var(--color-primary)] transition-colors mb-4"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setMemoItem(null); setMemoText('') }} className="flex-1 py-3 rounded-xl text-[14px] font-medium text-[#6B6966] bg-[#F5F3F0] active:scale-95 transition-transform">뒤로</button>
                    <button onClick={() => {
                      const extra: Record<string, unknown> = memoText.trim() ? { tags: { medicine: memoText.trim() } } : {}
                      handleQuickRecord('medication', extra)
                      setMemoItem(null); setMemoText('')
                    }} className="flex-[2] py-3 rounded-xl text-[14px] font-bold text-white active:scale-95 transition-transform" style={{ background: '#D08068' }}>
                      투약 기록
                    </button>
                  </div>
                </div>
              </div>
            </>
          )
        }

        // 3단계: 프리셋 선택 (반원형 유지)
        if (selectedItem) {
          const item = DYNAMIC_CATEGORIES.flatMap(c => c.items).find(i => i.type === selectedItem)
          if (!item || !item.step3) return null
          const presets = item.step3
          return (
            <>
              <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { setFabOpen(false); setSelectedCategory(null); setSelectedItem(null) }} />
              <div className="fixed z-[70] bottom-[80px] left-1/2" style={{ maxWidth: 430 }}>
                <div className="relative" style={{ width: 0, height: 0 }}>
                  {presets.map((p, i) => {
                    const presetArc = arcPositions(presets.length)
                    const pos = presetArc[i]
                    return (
                      <div key={String(p.value)} className="absolute flex flex-col items-center gap-1"
                        style={{ left: pos.x - 24, top: pos.y - 24, animation: `fabItemPop 0.2s ${i * 0.03}s both cubic-bezier(0.34, 1.56, 0.64, 1)` }}>
                        <button onClick={() => {
                          const recordType = item.baseType || item.type
                          const extra: Record<string, unknown> = {}
                          // 태그 복사
                          if (item.tags) extra.tags = { ...item.tags }
                          // 값 설정
                          if (p.unit === 'ml') extra.amount_ml = p.value
                          else if (p.unit === '°C') extra.tags = { ...(extra.tags as any || {}), celsius: p.value }
                          else if (p.unit === '분') extra.tags = { ...(extra.tags as any || {}), duration_min: p.value }
                          else extra.tags = { ...(extra.tags as any || {}), subtype: p.value }
                          handleQuickRecord(recordType, extra)
                        }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.25)] active:scale-90 transition-transform bg-white">
                          <span className="text-[15px] font-bold text-[var(--color-primary)]">{p.label}</span>
                        </button>
                        <span className="text-[12px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-full">{p.unit || ''}</span>
                      </div>
                    )
                  })}
                  {/* 뒤로 */}
                  <div className="absolute" style={{ left: -16, top: -24 }}>
                    <button onClick={() => setSelectedItem(null)} className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-90">
                      <ArrowLeftIcon className="w-4 h-4 text-[#6B6966]" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )
        }

        // 2단계: 세부 (같은 반원형에서 변신)
        const cat = DYNAMIC_CATEGORIES.find(c => c.key === selectedCategory)
        if (!cat) return null
        return (
          <>
            <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { setFabOpen(false); setSelectedCategory(null) }} />
            <div className="fixed z-[70] bottom-[80px] left-1/2" style={{ maxWidth: 430 }}>
              <div className="relative" style={{ width: 0, height: 0 }}>
                {cat.items.map((item, i) => {
                  const positions = arcPositions(cat.items.length)
                  const pos = positions[i % positions.length]
                  return (
                    <div key={item.type} className="absolute flex flex-col items-center gap-1.5"
                      style={{ left: pos.x - 28, top: pos.y - 28, animation: `fabItemPop 0.2s ${i * 0.03}s both cubic-bezier(0.34, 1.56, 0.64, 1)` }}>
                      <button onClick={() => {
                        if (item.isDuration) {
                          startSession(item, cat.color)
                        } else if (item.isSlider) {
                          setTempSlider(item.type)
                          if (item.type === 'temp') setTempValue(36.5)
                          if (item.type === 'feed') setFeedValue(120)
                        } else if (item.hasMemo) {
                          setMemoItem(item.type); setMemoText('')
                        } else if (item.step3) {
                          setSelectedItem(item.type)
                        } else {
                          const recordType = item.baseType || item.type
                          const extra: Record<string, unknown> = {}
                          if (item.tags) extra.tags = item.tags
                          handleQuickRecord(recordType, extra)
                        }
                      }} className="w-16 h-16 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.25)] active:scale-90 transition-transform bg-white">
                        {(() => {
                          const itemIconMap: Record<string, React.ReactNode> = {
                            breast_left: <BreastfeedIcon className="w-7 h-7" />,
                            breast_right: <BreastfeedIcon className="w-7 h-7" />,
                            feed: <BottleIcon className="w-7 h-7" />,
                            babyfood: <BowlIcon className="w-7 h-7" />,
                            snack: <CookieIcon className="w-7 h-7" />,
                            toddler_meal: <RiceIcon className="w-7 h-7" />,
                            pump: <PumpIcon className="w-7 h-7" />,
                            night_sleep: <NightIcon className="w-7 h-7" />,
                            nap: <NapIcon className="w-7 h-7" />,
                            sleep: <MoonIcon className="w-7 h-7" />,
                            pee: <DropletIcon className="w-7 h-7" />,
                            poop_normal: <PoopIcon className="w-7 h-7" />,
                            poop_soft: <PoopIcon className="w-7 h-7" />,
                            poop_hard: <PoopIcon className="w-7 h-7" />,
                            temp: <ThermometerIcon className="w-7 h-7" />,
                            bath: <BathIcon className="w-7 h-7" />,
                            memo: <PillIcon className="w-7 h-7" />,
                            note: <NoteIcon className="w-7 h-7" />,
                          }
                          return <span style={{ color: cat.color }}>{itemIconMap[item.type] || <NoteIcon className="w-7 h-7" />}</span>
                        })()}
                      </button>
                      <span className="text-[12px] font-bold text-white whitespace-nowrap bg-black/50 px-2 py-0.5 rounded-full">{item.label}</span>
                    </div>
                  )
                })}
                {/* 뒤로 */}
                <div className="absolute" style={{ left: -20, top: -30 }}>
                  <button onClick={() => setSelectedCategory(null)} className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center active:scale-90">
                    <ArrowLeftIcon className="w-4 h-4 text-[#6B6966]" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* BNB 바 — Pill Style */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[65] pt-3 pr-5 pb-[max(20px,env(safe-area-inset-bottom))] pl-5">
        <div className="flex items-center h-[62px] rounded-[36px] bg-white/95 backdrop-blur-lg border border-[#E8E4DF]/60 p-1" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          {mode === 'preparing' || mode === 'pregnant' ? (
            tabs.map((tab) => (
              <NavTab key={tab.href} tab={tab} pathname={pathname} data-guide={{ '/town': 'nav-town', '/record': 'nav-record', '/more': 'nav-more', '/waiting': 'nav-waiting' }[tab.href]} />
            ))
          ) : (
            <>
              {tabs.slice(0, 2).map((tab) => (
                <NavTab key={tab.href} tab={tab} pathname={pathname} data-guide={{ '/town': 'nav-town', '/record': 'nav-record', '/more': 'nav-more', '/waiting': 'nav-waiting' }[tab.href]} />
              ))}

              {/* 중앙 FAB (물방울 — pill 위로 돌출) */}
              <div data-guide="fab" className="flex-1 flex items-center justify-center relative">
                {activeSession ? (
                  <button
                    onClick={endSession}
                    className="absolute -top-14 flex flex-col items-center justify-center transition-transform duration-200 active:scale-95"
                  >
                    <div
                      className="w-[66px] h-[66px] rounded-full flex flex-col items-center justify-center shadow-[0_6px_24px_rgba(0,0,0,0.3)]"
                      style={{
                        background: activeSession.color,
                        animation: 'fabSessionPulse 2s ease-in-out infinite',
                      }}
                    >
                      <span className="text-white text-[15px] font-bold tabular-nums leading-tight">
                        {formatElapsed(elapsed)}
                      </span>
                      <span className="text-white/90 text-[9px] font-semibold leading-tight">종료</span>
                    </div>
                    <span className="text-[10px] mt-0.5 font-medium whitespace-nowrap" style={{ color: activeSession.color }}>
                      {activeSession.label}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => setFabOpen((v) => !v)}
                    className={`absolute -top-12 flex flex-col items-center justify-center transition-transform duration-200 ${fabOpen ? 'scale-95' : ''}`}
                  >
                    {fabOpen ? (
                      <div className="w-[62px] h-[62px] rounded-full flex items-center justify-center active:scale-90 transition-all duration-200 bg-[#212124] shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
                        <XIcon className="w-7 h-7 text-white" />
                      </div>
                    ) : (
                      <div className="relative">
                        {/* 호흡 글로우 링 */}
                        <div className="absolute inset-[-6px] rounded-full" style={{ animation: 'fabGlow 3s ease-in-out infinite', background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)', opacity: 0.15 }} />
                        {/* 물방울 이미지 */}
                        <img src="/fab.png" alt="" className="w-[62px] h-[62px] active:scale-90 transition-all duration-200" style={{ filter: 'drop-shadow(0 4px 12px var(--color-fab-shadow))', animation: 'fabBreathe 3s ease-in-out infinite' }} />
                        {/* 반짝임 점 */}
                        <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-white" style={{ animation: 'fabSparkle 2.5s ease-in-out infinite', boxShadow: '0 0 4px rgba(255,255,255,0.8)' }} />
                      </div>
                    )}
                    <span className={`text-[10px] mt-0.5 font-medium ${fabOpen ? 'text-[#212124]' : 'text-[var(--color-primary)]'}`}>
                      기록
                    </span>
                  </button>
                )}
              </div>

              {tabs.slice(2).map((tab) => (
                <NavTab key={tab.href} tab={tab} pathname={pathname} data-guide={{ '/town': 'nav-town', '/record': 'nav-record', '/more': 'nav-more', '/waiting': 'nav-waiting' }[tab.href]} />
              ))}
            </>
          )}
        </div>
      </nav>


      {/* 애니메이션 keyframes */}
      <style jsx global>{`
        @keyframes fabItemPop {
          0% { opacity: 0; transform: scale(0.3) translateY(30px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fabSessionPulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; transform: scale(1); }
          50% { box-shadow: 0 0 0 8px transparent; transform: scale(1.05); }
        }
        @keyframes fabBreathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.06) translateY(-2px); }
        }
        @keyframes fabGlow {
          0%, 100% { transform: scale(0.8); opacity: 0.1; }
          50% { transform: scale(1.3); opacity: 0.2; }
        }
        @keyframes fabSparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1.2); }
          60% { opacity: 0.6; transform: scale(0.8); }
        }
      `}</style>
    </>
  )
}

// 더보기 전체 기록 그리드
const GRID_ICON_MAP: Record<string, React.ReactNode> = {
  breast_left: <BreastfeedIcon className="w-6 h-6" />,
  breast_right: <BreastfeedIcon className="w-6 h-6" />,
  feed: <BottleIcon className="w-6 h-6" />,
  babyfood: <BowlIcon className="w-6 h-6" />,
  snack: <CookieIcon className="w-6 h-6" />,
  toddler_meal: <RiceIcon className="w-6 h-6" />,
  pump: <PumpIcon className="w-6 h-6" />,
  night_sleep: <NightIcon className="w-6 h-6" />,
  nap: <NapIcon className="w-6 h-6" />,
  sleep: <MoonIcon className="w-6 h-6" />,
  pee: <DropletIcon className="w-6 h-6" />,
  poop_normal: <PoopIcon className="w-6 h-6" />,
  poop_soft: <PoopIcon className="w-6 h-6" />,
  poop_hard: <PoopIcon className="w-6 h-6" />,
  temp: <ThermometerIcon className="w-6 h-6" />,
  bath: <BathIcon className="w-6 h-6" />,
  memo: <PillIcon className="w-6 h-6" />,
  note: <NoteIcon className="w-6 h-6" />,
}

function RecordGrid({ onRecord }: { onRecord: (type: string, extra?: Record<string, unknown>) => void }) {
  const ALL_ITEMS = buildCategories(getAgeMonths()).flatMap(cat => cat.items.map(item => ({ ...item, catColor: cat.color })))
  return (
    <div className="grid grid-cols-4 gap-2">
      {ALL_ITEMS.map(item => (
        <button key={item.type} onClick={() => {
          const recordType = item.baseType || item.type
          const extra: Record<string, unknown> = {}
          if (item.tags) extra.tags = item.tags
          onRecord(recordType, extra)
        }} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[var(--color-page-bg)] active:bg-[#ECECEC] active:scale-95">
          <span className="text-xl" style={{ color: item.catColor }}>{GRID_ICON_MAP[item.type] || <NoteIcon className="w-6 h-6" />}</span>
          <span className="text-[13px] font-medium text-[#1A1918]">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

function NavTab({ tab, pathname, 'data-guide': dataGuide }: { tab: Tab; pathname: string | null; 'data-guide'?: string }) {
  const isActive = tab.href === '/'
    ? pathname === '/'
    : pathname?.startsWith(tab.href)
  const Icon = tab.icon

  return (
    <Link
      href={tab.href}
      data-guide={dataGuide}
      className={`flex-1 flex flex-col items-center justify-center gap-1 h-full rounded-[26px] transition-all ${
        isActive ? 'bg-[var(--color-primary)]' : ''
      }`}
    >
      <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-white' : 'text-[#9E9A95]'}`} />
      <span className={`text-[10px] font-medium transition-colors uppercase tracking-wide ${isActive ? 'text-white' : 'text-[#9E9A95]'}`}>
        {tab.label}
      </span>
    </Link>
  )
}
