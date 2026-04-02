'use client'

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SunIcon, HeartIcon, ShieldIcon, UsersIcon,
  PlusIcon, XIcon, BookOpenIcon, MenuIcon, BottleIcon, MoonIcon, PoopIcon, ThermometerIcon,
  DropletIcon, PillIcon, BreastfeedIcon, BowlIcon, DiaperIcon, HospitalIcon,
  NoteIcon, ArrowLeftIcon, CookieIcon, RiceIcon, PumpIcon, BathIcon, NapIcon, NightIcon,
  HeartFilledIcon, ActivityIcon, PenIcon, ChartIcon,
  MoodHappyIcon, MoodCalmIcon, MoodAnxiousIcon, MoodSickIcon, MoodTiredIcon,
  WaterGlassIcon, FootstepsIcon, YogaIcon,
  CheckCircleIcon, BanIcon, MusicIcon,
  WarningIcon, CapsuleIcon, SproutIcon, OmegaIcon, BrainIcon, BoneIcon,
} from '@/components/ui/Icons'
import { autoBackup, restoreLocalData } from '@/lib/storage/backup'
import { getSecure } from '@/lib/secureStorage'
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
function buildCategories(ageMonths: number): RecordCategory[] {
  const cats: RecordCategory[] = []

  // 먹기 — 월령별 구성
  const eatItems: RecordItem[] = []
  if (ageMonths < 13) { // 모유는 12개월까지
    eatItems.push(
      { type: 'breast_left',  label: '모유 왼쪽', baseType: 'breast', tags: { side: 'left'  }, isDuration: true },
      { type: 'breast_right', label: '모유 오른쪽', baseType: 'breast', tags: { side: 'right' }, isDuration: true },
    )
  }
  if (ageMonths < 13) { // 분유
    eatItems.push({ type: 'feed', label: '분유', isSlider: true })
  }

  if (ageMonths < 13) { // 유축 - 모유 수유 기간 동안
    eatItems.push(
      { type: 'pump_left',  label: '유축 왼쪽', baseType: 'pump', tags: { side: 'left'  }, isDuration: true },
      { type: 'pump_right', label: '유축 오른쪽', baseType: 'pump', tags: { side: 'right' }, isDuration: true },
    )
  }

  // 이유식 - 주차별 세분화
  if (ageMonths >= 4 && ageMonths < 6) { // 4~5개월: 초기 이유식 준비 (쌀미음만)
    eatItems.push({ type: 'babyfood', label: '이유식',
      step3: [{ label: '쌀미음', value: 'rice' }] })
  } else if (ageMonths >= 6 && ageMonths < 9) { // 6~8개월: 초기 이유식 (쌀미음, 야채죽)
    eatItems.push({ type: 'babyfood', label: '이유식',
      step3: [{ label: '쌀미음', value: 'rice' }, { label: '야채죽', value: 'veggie' }, { label: '과일', value: 'fruit' }] })
  } else if (ageMonths >= 9 && ageMonths < 12) { // 9~11개월: 중기 이유식 (고기죽 추가)
    eatItems.push({ type: 'babyfood', label: '이유식',
      step3: [{ label: '쌀미음', value: 'rice' }, { label: '야채죽', value: 'veggie' }, { label: '고기죽', value: 'meat' }, { label: '과일', value: 'fruit' }, { label: '기타', value: 'etc' }] })
  } else if (ageMonths >= 12 && ageMonths < 13) { // 12개월: 후기 이유식
    eatItems.push({ type: 'babyfood', label: '이유식',
      step3: [{ label: '야채죽', value: 'veggie' }, { label: '고기죽', value: 'meat' }, { label: '과일', value: 'fruit' }, { label: '기타', value: 'etc' }] })
  }
  if (ageMonths >= 9) { // 간식 (9개월~)
    eatItems.push({ type: 'snack', label: '간식' })
  }
  if (ageMonths >= 13) { // 유아식 (13개월~)
    eatItems.push({ type: 'toddler_meal', label: '유아식',
      step3: [{ label: '밥', value: 'rice' }, { label: '국수', value: 'noodle' }, { label: '빵', value: 'bread' }, { label: '기타', value: 'etc' }] })
  }
  cats.push({ key: 'eat', label: ageMonths >= 13 ? '먹기' : '수유', color: 'var(--color-primary)', items: eatItems })

  // 잠 — 항상 'sleep' 타입으로 통일, sleepType 태그로 구분
  const hour = new Date().getHours()
  const isNight = hour >= 20 || hour < 7
  cats.push({ key: 'sleep', label: '잠', color: '#6366F1',
    items: [
      { type: 'sleep', label: isNight ? '밤잠' : '낮잠', baseType: 'sleep', tags: { sleepType: isNight ? 'night' : 'nap' }, isDuration: true },
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

function buildPregnantCategories(pregnancyWeeks: number): RecordCategory[] {
  const cats: RecordCategory[] = [
    { key: 'mood', label: '기분', color: '#FF8FAB', items: [
      { type: 'preg_mood_happy',   label: '행복', baseType: 'preg_mood', tags: { mood: 'happy'   }, color: '#FF8FAB' },
      { type: 'preg_mood_calm',    label: '평온', baseType: 'preg_mood', tags: { mood: 'calm'    }, color: '#90C8A8' },
      { type: 'preg_mood_anxious', label: '불안', baseType: 'preg_mood', tags: { mood: 'anxious' }, color: '#FFC078' },
      { type: 'preg_mood_sick',    label: '입덧', baseType: 'preg_mood', tags: { mood: 'sick'    }, color: '#B8A0D4' },
      { type: 'preg_mood_tired',   label: '피곤', baseType: 'preg_mood', tags: { mood: 'tired'   }, color: '#8EB4D4' },
    ]},
    { key: 'health', label: '건강', color: '#D08068', items: [
      { type: 'preg_weight',   label: '체중',    isSlider: true },
      { type: 'preg_stretch',  label: '스트레칭', color: '#F59E0B', isDuration: true },
      { type: 'preg_meditate', label: '명상',    color: '#8B5CF6', isDuration: true },
      { type: 'preg_edema_mild',   label: '부종',    baseType: 'preg_edema', tags: { level: 'mild'   } },
      { type: 'preg_edema_severe', label: '부종 심함', baseType: 'preg_edema', tags: { level: 'severe' } },
    ]},
    { key: 'preg_suppl', label: '영양제', color: '#10B981', items: [
      { type: 'preg_folic',   label: '엽산',    color: '#10B981' },
      { type: 'preg_iron',    label: '철분',    color: '#10B981' },
      { type: 'preg_dha',     label: 'DHA',     color: '#10B981' },
      { type: 'preg_calcium', label: '칼슘',    color: '#10B981' },
      { type: 'preg_vitd',    label: '비타민D', color: '#10B981' },
    ]},
    { key: 'preg_diary', label: '기다림', color: '#A78BFA', items: [
      { type: 'preg_journal', label: '기다림 일기', color: '#A78BFA', hasJournal: true },
    ]},
  ]
  // 태동: 16주 이상일 때만 노출
  if (pregnancyWeeks >= 16) {
    cats.splice(1, 0, { key: 'fetal', label: '태동', color: '#90C8A8', items: [
      { type: 'preg_fetal_move', label: '태동 +1' },
    ]})
  }
  return cats
}

function buildPreparingCategories(): RecordCategory[] {
  return [
    { key: 'prep_mood', label: '기분', color: '#F472B6', items: [
      { type: 'prep_mood_happy',   label: '행복', baseType: 'prep_mood', tags: { mood: 'happy'   }, color: '#FF8FAB' },
      { type: 'prep_mood_excited', label: '설렘', baseType: 'prep_mood', tags: { mood: 'excited' }, color: '#FFB347' },
      { type: 'prep_mood_calm',    label: '평온', baseType: 'prep_mood', tags: { mood: 'calm'    }, color: '#90C8A8' },
      { type: 'prep_mood_tired',   label: '피곤', baseType: 'prep_mood', tags: { mood: 'tired'   }, color: '#8EB4D4' },
      { type: 'prep_mood_anxious', label: '불안', baseType: 'prep_mood', tags: { mood: 'anxious' }, color: '#FFC078' },
    ]},
    { key: 'prep_health', label: '건강', color: '#F59E0B', items: [
      { type: 'prep_walk',     label: '걷기',     color: '#F59E0B' },
      { type: 'prep_stretch',  label: '스트레칭', color: '#F59E0B' },
      { type: 'prep_breath',   label: '심호흡',   color: '#F59E0B' },
      { type: 'prep_meditate', label: '명상',     color: '#8B5CF6', isDuration: true },
      { type: 'prep_music',    label: '음악감상', color: '#F472B6', isDuration: true },
    ]},
    { key: 'prep_suppl', label: '영양제', color: '#10B981', items: [
      { type: 'prep_folic',  label: '엽산',    color: '#10B981' },
      { type: 'prep_vitd',   label: '비타민D', color: '#10B981' },
      { type: 'prep_iron',   label: '철분',    color: '#10B981' },
      { type: 'prep_omega3', label: '오메가3', color: '#10B981' },
    ]},
    { key: 'prep_diary', label: '기다림', color: '#A78BFA', items: [
      { type: 'prep_journal', label: '일기 작성', color: '#A78BFA', hasJournal: true },
    ]},
  ]
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
  hasJournal?: boolean
  color?: string  // 아이템별 개별 색상 (카테고리 색상 override)
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
      { type: 'breast_left', label: '모유 왼쪽', baseType: 'breast', tags: { side: 'left' }, isDuration: true },
      { type: 'breast_right', label: '모유 오른쪽', baseType: 'breast', tags: { side: 'right' }, isDuration: true },
      { type: 'feed', label: '분유',
        step3: [{ label: '60', value: 60, unit: 'ml' }, { label: '90', value: 90, unit: 'ml' }, { label: '120', value: 120, unit: 'ml' }, { label: '150', value: 150, unit: 'ml' }, { label: '180', value: 180, unit: 'ml' }] },
      { type: 'babyfood', label: '이유식',
        step3: [{ label: '쌀미음', value: 'rice' }, { label: '야채죽', value: 'veggie' }, { label: '고기죽', value: 'meat' }, { label: '과일', value: 'fruit' }, { label: '기타', value: 'etc' }] },
      { type: 'pump_left', label: '유축 왼쪽', baseType: 'pump', tags: { side: 'left' }, isDuration: true },
      { type: 'pump_right', label: '유축 오른쪽', baseType: 'pump', tags: { side: 'right' }, isDuration: true },
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

function BottomNavComponent() {
  const pathname = usePathname()
  const [fabOpen, setFabOpen] = useState(false)
  const [mode, setMode] = useState<string>('parenting')

  // 앱 시작 시 데이터 자동 백업 + 복원
  useEffect(() => {
    restoreLocalData()
    autoBackup()
  }, [])

  // 초기 모드 설정 및 pathname 기반 모드 자동 감지
  useEffect(() => {
    // 초기 로드 시 localStorage에서 모드 복원
    const saved = localStorage.getItem('dodam_mode')

    if (pathname?.startsWith('/preparing')) {
      setMode('preparing')
    } else if (pathname?.startsWith('/pregnant')) {
      setMode('pregnant')
    } else if (saved) {
      setMode(saved)
    }
  }, [pathname])

  const [pregnancyWeeks, setPregnancyWeeks] = useState(0)
  useEffect(() => {
    if (mode !== 'pregnant') return
    getSecure('dodam_due_date').then(v => {
      if (!v) return
      const due = new Date(v)
      if (isNaN(due.getTime())) return
      const weeks = Math.floor((280 - (due.getTime() - Date.now()) / 86400000) / 7)
      setPregnancyWeeks(Math.max(0, weeks))
    })
  }, [mode])

  const [ageMonths, setAgeMonths] = useState(0)
  useEffect(() => {
    if (mode !== 'parenting') return
    getSecure('dodam_child_birthdate').then(v => {
      if (!v) { setAgeMonths(0); return }
      const birth = new Date(v)
      if (isNaN(birth.getTime())) { setAgeMonths(0); return }
      const now = new Date()
      const months = Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()))
      setAgeMonths(months)
    })
  }, [mode])

  const tabs = TABS_BY_MODE[mode] || TABS_BY_MODE.parenting
  const DYNAMIC_CATEGORIES = mode === 'pregnant' ? buildPregnantCategories(pregnancyWeeks) : mode === 'preparing' ? buildPreparingCategories() : buildCategories(ageMonths)

  // 디버깅: 모드와 카테고리 확인 (필요시 활성화)
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.log('BottomNav DEBUG:', {
  //       pathname,
  //       mode,
  //       categoriesCount: DYNAMIC_CATEGORIES.length,
  //       categories: DYNAMIC_CATEGORIES.map(c => c.label),
  //       fabOpen
  //     })
  //   }
  // }, [mode, pathname, DYNAMIC_CATEGORIES, fabOpen])

  // 다른 페이지로 이동하면 FAB + 모든 depth 상태 리셋
  useEffect(() => {
    setFabOpen(false)
    setSelectedCategory(null)
    setSelectedItem(null)
    setTempSlider(null)
    setMemoItem(null)
    setMemoText('')
  }, [pathname])

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null) // 3단계: 용량 선택
  const [tempSlider, setTempSlider] = useState<string | null>(null) // 슬라이더 열린 아이템 타입
  const [tempValue, setTempValue] = useState(36.5)
  const [feedValue, setFeedValue] = useState(120)
  const [weightValue, setWeightValue] = useState(60.0)
  const [memoItem, setMemoItem] = useState<string | null>(null) // 투약 메모
  const [memoText, setMemoText] = useState('')
  const [journalOpen, setJournalOpen] = useState(false)
  const [journalType, setJournalType] = useState<'prep_journal' | 'preg_journal'>('prep_journal')
  const [journalText, setJournalText] = useState('')

  const [journalLoading, setJournalLoading] = useState(false)
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

    // FAB 즉시 닫기 (DB 응답 기다리지 않음)
    setFabOpen(false)
    setSelectedCategory(null)
    setSelectedItem(null)
    setTempSlider(null)
    setMemoItem(null)
    setMemoText('')

    // 로컬 날짜 (KST 기준)
    const _td = new Date()
    const localToday = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`

    // preg_ 타입: 토스트 즉시 → DB 비동기 (pregnant/page가 처리 안 한 경우만)
    if (type.startsWith('preg_') && type !== 'preg_journal') {
      const PREG_LABELS: Record<string, string> = {
        preg_mood: '기분', preg_fetal_move: '태동', preg_weight: '체중', preg_edema: '부종',
        preg_water: '물 마시기', preg_walk: '걷기', preg_suppl: '영양제', preg_stretch: '스트레칭',
        preg_folic: '엽산', preg_iron: '철분', preg_dha: 'DHA', preg_calcium: '칼슘', preg_vitd: '비타민D',
      }
      // 토스트 표시 (page가 처리 안 한 경우만)
      if (!(event.detail as any)._handled) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: `${PREG_LABELS[type] || type} 기록됐어요` } }))
      }
      // DB 저장 비동기
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('pregnant_events').insert({
            user_id: user.id,
            type,
            start_ts: new Date().toISOString(),
            tags: extra?.tags ? extra.tags : undefined,
          })
        }
      } catch { /* 오프라인 폴백 */ }
      // localStorage 캐시 (page 밖일 때만)
      if (!(event.detail as any)._handled) {
        try {
          const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
          const stored = JSON.parse(localStorage.getItem(`dodam_preg_events_${localToday}`) || '[]')
          stored.unshift({ id: Date.now(), type, data: { type, ...extra }, timeStr })
          localStorage.setItem(`dodam_preg_events_${localToday}`, JSON.stringify(stored))
        } catch { /* */ }
      }
    }

    // prep_ 타입: DB 저장 + localStorage 캐시 + 토스트 (항상 실행)
    if (type.startsWith('prep_')) {
      const PREP_LABELS: Record<string, string> = {
        prep_folic: '엽산', prep_vitd: '비타민D', prep_iron: '철분', prep_omega3: '오메가3',
        prep_walk: '걷기', prep_stretch: '스트레칭', prep_breath: '심호흡',
        prep_meditate: '명상', prep_music: '음악감상', prep_mood: '기분',
      }
      if (type === 'prep_mood' && extra?.tags && (extra.tags as any).mood) {
        const moodVal: string = (extra.tags as any).mood
        const specificType = `prep_mood_${moodVal}`
        // localStorage 즉시 업데이트
        try {
          const now = new Date().toISOString()
          localStorage.setItem(`dodam_mood_${localToday}`, JSON.stringify({ mood: moodVal, ts: now }))
          const tsMap = JSON.parse(localStorage.getItem(`dodam_prep_ts_${localToday}`) || '{}')
          if (!tsMap[specificType]) { tsMap[specificType] = now; localStorage.setItem(`dodam_prep_ts_${localToday}`, JSON.stringify(tsMap)) }
          const doneKey = `dodam_prep_done_${localToday}`
          const done: string[] = JSON.parse(localStorage.getItem(doneKey) || '[]')
          if (!done.includes(specificType)) { done.push(specificType); localStorage.setItem(doneKey, JSON.stringify(done)) }
        } catch { /* */ }
        // 이벤트 즉시
        window.dispatchEvent(new CustomEvent('dodam-prep-done', { detail: { type: specificType, date: localToday, mood: moodVal } }))
        // 토스트 (preparing/page가 처리 안 한 경우만)
        if (!(event.detail as any)._handled) {
          window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '기분이 기록됐어요' } }))
        }
        // DB 비동기 (당일 중복 방지)
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: existing } = await supabase.from('prep_events')
              .select('id').eq('user_id', user.id).eq('type', specificType).eq('recorded_date', localToday).limit(1)
            if (!existing?.length) {
              await supabase.from('prep_events').insert({
                user_id: user.id, type: specificType, recorded_date: localToday,
                tags: extra.tags,
              })
            }
          }
        } catch { /* 오프라인 폴백 */ }
      } else if (type !== 'prep_journal') {
        // localStorage 즉시 업데이트
        try {
          const key = `dodam_prep_done_${localToday}`
          const done: string[] = JSON.parse(localStorage.getItem(key) || '[]')
          if (!done.includes(type)) {
            done.push(type)
            localStorage.setItem(key, JSON.stringify(done))
            const tsMap = JSON.parse(localStorage.getItem(`dodam_prep_ts_${localToday}`) || '{}')
            if (!tsMap[type]) { tsMap[type] = new Date().toISOString(); localStorage.setItem(`dodam_prep_ts_${localToday}`, JSON.stringify(tsMap)) }
          }
        } catch { /* */ }
        // 이벤트 즉시
        window.dispatchEvent(new CustomEvent('dodam-prep-done', { detail: { type, date: localToday } }))
        // 토스트 (preparing/page가 처리 안 한 경우만)
        if (!(event.detail as any)._handled) {
          window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: `${PREP_LABELS[type] || type} 완료!` } }))
        }
        // DB 비동기 (당일 중복 방지)
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: existing } = await supabase.from('prep_events')
              .select('id').eq('user_id', user.id).eq('type', type).eq('recorded_date', localToday).limit(1)
            if (!existing?.length) {
              await supabase.from('prep_events').insert({
                user_id: user.id, type, recorded_date: localToday,
                tags: extra?.tags ? extra.tags : undefined,
              })
            }
          }
        } catch { /* 오프라인 폴백 */ }
      }
    }
    // page.tsx가 없는 페이지(추억/동네/우리 등) — 토스트 즉시 → DB 비동기
    if (!(event.detail as any)._handled && !type.startsWith('preg_') && !type.startsWith('prep_')) {
      const CARE_LABELS: Record<string, string> = {
        feed: '분유', poop: '배변', pee: '소변', sleep: '수면', temp: '체온',
        bath: '목욕', medication: '투약', babyfood: '이유식', snack: '간식', toddler_meal: '유아식',
        pump: '유축',
      }
      const BABYFOOD_SUB: Record<string, string> = { rice: '쌀미음', veggie: '야채죽', meat: '고기죽', fruit: '과일', etc: '기타' }
      let careLabel = type === 'babyfood' && (extra?.tags as any)?.subtype
        ? `이유식 ${BABYFOOD_SUB[(extra?.tags as any).subtype] || ''}`
        : type === 'feed' && extra?.amount_ml ? `분유 ${extra?.amount_ml}ml`
        : (CARE_LABELS[type] || '기록')
      // pump/feed의 side 태그 반영
      if ((type === 'pump' || type === 'feed') && extra?.tags) {
        const side = (extra.tags as any).side
        if (side === 'left') careLabel = type === 'pump' ? '유축(왼쪽)' : '모유(왼쪽)'
        else if (side === 'right') careLabel = type === 'pump' ? '유축(오른쪽)' : '모유(오른쪽)'
      }
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: `${careLabel} 완료!` } }))
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
    // breast_left/right, pump_left/right → baseType을 feed/pump로 설정
    const derivedBaseType = item.baseType
      || (item.type === 'breast_left' || item.type === 'breast_right' ? 'feed' : undefined)
      || (item.type === 'pump_left'   || item.type === 'pump_right'   ? 'pump' : undefined)
    const session: ActiveSession = {
      type: item.type,
      baseType: derivedBaseType,
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

    // 원본 type을 저장 (breast_left, breast_right 등을 그대로 유지)
    const recordType = activeSession.type
    const startTs = new Date(activeSession.startTs).toISOString()
    const endTs = new Date().toISOString()
    const mins = Math.round((Date.now() - activeSession.startTs) / 60000)

    // 이벤트 dispatch → page.tsx가 마운트되어 있으면 DB 저장 + UI 업데이트 처리
    const detail: Record<string, unknown> = { type: recordType, start_ts: startTs, end_ts: endTs, _handled: false }
    if (activeSession.tags) detail.tags = activeSession.tags
    const event = new CustomEvent('dodam-record', { detail })
    window.dispatchEvent(event)

    // prep_ 세션 완료: page 밖에서도 localStorage 저장 (이미 _handled면 preparing/page.tsx가 처리)
    if (!(event.detail as any)._handled && recordType.startsWith('prep_')) {
      const _td2 = new Date()
      const localToday2 = `${_td2.getFullYear()}-${String(_td2.getMonth()+1).padStart(2,'0')}-${String(_td2.getDate()).padStart(2,'0')}`
      try {
        const key = `dodam_prep_done_${localToday2}`
        const done: string[] = JSON.parse(localStorage.getItem(key) || '[]')
        if (!done.includes(recordType)) {
          done.push(recordType)
          localStorage.setItem(key, JSON.stringify(done))
          const tsMap = JSON.parse(localStorage.getItem(`dodam_prep_ts_${localToday2}`) || '{}')
          if (!tsMap[recordType]) { tsMap[recordType] = startTs; localStorage.setItem(`dodam_prep_ts_${localToday2}`, JSON.stringify(tsMap)) }
        }
      } catch { /* */ }
    }

    // page.tsx가 없는 페이지에서는 직접 DB 저장 (preg_/prep_ 타입은 DB 저장 없음)
    if (!(event.detail as any)._handled && !recordType.startsWith('preg_') && !recordType.startsWith('prep_')) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const children = await supabase.from('children').select('id').eq('user_id', user.id).limit(1)
          const childId = children.data?.[0]?.id
          if (childId) {
            // pump_left/pump_right → pump, breast_left/breast_right → feed 변환
            const dbType = recordType === 'pump_left' || recordType === 'pump_right' ? 'pump'
              : recordType === 'breast_left' || recordType === 'breast_right' ? 'feed'
              : recordType
            await supabase.from('events').insert({
              child_id: childId,
              recorder_id: user.id,
              type: dbType,
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

    // 토스트 표시 (세부 타입 라벨 우선)
    const sessionLabels: Record<string, string> = {
      breast_left: '모유 왼쪽', breast_right: '모유 오른쪽',
      pump_left: '유축 왼쪽', pump_right: '유축 오른쪽',
      bath: '목욕', sleep: '수면', nap: '낮잠', night_sleep: '밤잠',
      prep_meditate: '명상', prep_music: '음악감상',
      preg_stretch: '스트레칭', preg_meditate: '명상',
    }
    const sessionLabel = sessionLabels[activeSession.type] || activeSession.label
    window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: `${sessionLabel} ${mins}분 기록 완료!` } }))
  }, [activeSession])

  const formatElapsed = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }

  const HIDE_PATHS = ['/onboarding', '/invite', '/auth', '/post/', '/market-item/', '/landing', '/privacy', '/terms', '/celebration', '/birth', '/settings']
  if (HIDE_PATHS.some(p => pathname?.startsWith(p))) return null

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
              <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => { setFabOpen(false); setSelectedCategory(null); setSelectedItem(null); setTempSlider(null); setMemoItem(null); setMemoText('') }} />
              <div className="fixed z-[70] bottom-[80px] left-1/2 -translate-x-1/2" style={{ maxWidth: 430 }}>
                <div className="relative" style={{ width: 0, height: 0 }}>
                  {DYNAMIC_CATEGORIES.map((cat, i) => (
                    <div key={cat.key} className="absolute flex flex-col items-center gap-1.5"
                      style={{ left: ARC[i].x - 28, top: ARC[i].y - 28, animation: `fabItemPop 0.25s ${i * 0.04}s both cubic-bezier(0.34, 1.56, 0.64, 1)` }}>
                      <button onClick={() => {
                        if (cat.items.length === 1 && cat.items[0].isDuration) startSession(cat.items[0], cat.color)
                        else if (cat.items.length === 1 && cat.items[0].hasJournal) {
                          setJournalType(cat.items[0].type as 'prep_journal' | 'preg_journal')
                          setJournalText('')
                          setFabOpen(false); setSelectedCategory(null)
                          setJournalOpen(true)
                        }
                        else if (cat.items.length === 1) handleQuickRecord(cat.items[0].type)
                        else setSelectedCategory(cat.key)
                      }} className="w-16 h-16 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.35)] active:scale-90 transition-transform bg-white border-2 border-white">
                        {(() => {
                          const k = cat.key
                          const node =
                            k === 'eat'           ? <BottleIcon className="w-8 h-8" /> :
                            k === 'sleep'         ? <MoonIcon className="w-8 h-8" /> :
                            k === 'diaper'        ? <DiaperIcon className="w-8 h-8" /> :
                            k === 'health'        ? <HospitalIcon className="w-8 h-8" /> :
                            k === 'mood'          ? <HeartFilledIcon className="w-8 h-8" /> :
                            k === 'fetal'         ? <ActivityIcon className="w-8 h-8" /> :
                            k === 'prep_suppl'    ? <CapsuleIcon className="w-8 h-8" /> :
                            k === 'preg_suppl'    ? <CapsuleIcon className="w-8 h-8" /> :
                            k === 'prep_health'   ? <HeartIcon className="w-8 h-8" /> :
                            k === 'prep_diary'    ? <PenIcon className="w-8 h-8" /> :
                            k === 'preg_diary'    ? <PenIcon className="w-8 h-8" /> :
                            k === 'prep_mood'     ? <MoodHappyIcon className="w-8 h-8" /> :
                            <NoteIcon className="w-8 h-8" />
                          return <span style={{ color: cat.color }}>{node}</span>
                        })()}
                      </button>
                      <span className="text-caption font-bold whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow-md border border-[#E8E4DF]" style={{ color: '#000000' }}>{cat.label}</span>
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
          const isWeight = tempSlider === 'preg_weight'

          // 체온 설정
          const isHigh = tempValue >= 37.5
          const isDanger = tempValue >= 38.5
          const tempColor = isDanger ? '#EF4444' : isHigh ? '#F59E0B' : '#10B981'

          // 분유 설정
          const feedColor = 'var(--color-primary)'

          return (
            <>
              <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => { setFabOpen(false); setSelectedCategory(null); setTempSlider(null) }} />
              <div className="fixed z-[70] bottom-[80px] left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px]">
                <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-5" style={{ animation: 'fabItemPop 0.25s both cubic-bezier(0.34, 1.56, 0.64, 1)' }}>

                  {isTemp && (
                    <>
                      <div className="text-center mb-4">
                        <span className="text-[42px] font-bold tabular-nums" style={{ color: tempColor }}>{tempValue.toFixed(1)}</span>
                        <span className="text-heading-3 font-medium text-tertiary ml-1">°C</span>
                        {isDanger && <p className="text-caption font-bold text-red-500 mt-1">고열 주의</p>}
                        {isHigh && !isDanger && <p className="text-caption font-bold text-amber-500 mt-1">미열</p>}
                      </div>
                      <div className="px-1 mb-4">
                        <input type="range" min={35.0} max={42.0} step={0.1} value={tempValue}
                          onChange={(e) => setTempValue(parseFloat(e.target.value))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, #10B981 0%, #10B981 ${((37.5 - 35) / 7) * 100}%, #F59E0B ${((37.5 - 35) / 7) * 100}%, #F59E0B ${((38.5 - 35) / 7) * 100}%, #EF4444 ${((38.5 - 35) / 7) * 100}%, #EF4444 100%)` }}
                        />
                        <div className="flex justify-between text-label text-tertiary mt-1 px-0.5">
                          <span>35.0</span><span>36.5</span><span>37.5</span><span>38.5</span><span>42.0</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mb-4">
                        {[36.5, 37.0, 37.5, 38.0, 38.5].map((v) => (
                          <button key={v} onClick={() => setTempValue(v)}
                            className="flex-1 py-2 rounded-xl text-body font-bold transition-all active:scale-95"
                            style={{ backgroundColor: tempValue === v ? tempColor : '#F5F3F0', color: tempValue === v ? 'white' : '#6B6966' }}>
                            {v.toFixed(1)}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setTempSlider(null)} className="flex-1 py-3 rounded-xl text-body-emphasis font-medium text-secondary bg-[#F5F3F0] active:scale-95 transition-transform">뒤로</button>
                        <button onClick={() => { handleQuickRecord('temp', { tags: { celsius: tempValue } }); setTempSlider(null) }}
                          className="flex-[2] py-3 rounded-xl text-body-emphasis font-bold text-white active:scale-95 transition-transform" style={{ background: tempColor }}>
                          {tempValue.toFixed(1)}°C 기록
                        </button>
                      </div>
                    </>
                  )}

                  {isFeed && (
                    <>
                      <div className="text-center mb-4">
                        <span className="text-[42px] font-bold tabular-nums" style={{ color: feedColor }}>{feedValue}</span>
                        <span className="text-heading-3 font-medium text-tertiary ml-1">ml</span>
                      </div>
                      <div className="px-1 mb-4">
                        <input type="range" min={10} max={300} step={10} value={feedValue}
                          onChange={(e) => setFeedValue(parseInt(e.target.value))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, var(--color-primary) ${((feedValue - 10) / 290) * 100}%, #E8E4DF ${((feedValue - 10) / 290) * 100}%)` }}
                        />
                        <div className="flex justify-between text-label text-tertiary mt-1 px-0.5">
                          <span>10</span><span>100</span><span>200</span><span>300ml</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mb-4">
                        {[60, 90, 120, 150, 180, 240].map((v) => (
                          <button key={v} onClick={() => setFeedValue(v)}
                            className="flex-1 py-2 rounded-xl text-body font-bold transition-all active:scale-95"
                            style={{ backgroundColor: feedValue === v ? 'var(--color-primary)' : '#F5F3F0', color: feedValue === v ? 'white' : '#6B6966' }}>
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setTempSlider(null)} className="flex-1 py-3 rounded-xl text-body-emphasis font-medium text-secondary bg-[#F5F3F0] active:scale-95 transition-transform">뒤로</button>
                        <button onClick={() => { handleQuickRecord('feed', { amount_ml: feedValue }); setTempSlider(null) }}
                          className="flex-[2] py-3 rounded-xl text-body-emphasis font-bold text-white active:scale-95 transition-transform" style={{ background: 'var(--color-primary)' }}>
                          분유 {feedValue}ml 기록
                        </button>
                      </div>
                    </>
                  )}

                  {isWeight && (
                    <>
                      <div className="text-center mb-4">
                        <span className="text-[42px] font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>{weightValue.toFixed(1)}</span>
                        <span className="text-heading-3 font-medium text-tertiary ml-1">kg</span>
                      </div>
                      <div className="px-1 mb-4">
                        <input type="range" min={40} max={120} step={0.1} value={weightValue}
                          onChange={(e) => setWeightValue(parseFloat(e.target.value))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, var(--color-primary) ${((weightValue - 40) / 80) * 100}%, #E8E4DF ${((weightValue - 40) / 80) * 100}%)` }}
                        />
                        <div className="flex justify-between text-label text-tertiary mt-1 px-0.5">
                          <span>40</span><span>60</span><span>80</span><span>100</span><span>120kg</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mb-4">
                        {[50, 55, 60, 65, 70, 75].map((v) => (
                          <button key={v} onClick={() => setWeightValue(v)}
                            className="flex-1 py-2 rounded-xl text-body font-bold transition-all active:scale-95"
                            style={{ backgroundColor: Math.abs(weightValue - v) < 0.05 ? 'var(--color-primary)' : '#F5F3F0', color: Math.abs(weightValue - v) < 0.05 ? 'white' : '#6B6966' }}>
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setTempSlider(null)} className="flex-1 py-3 rounded-xl text-body-emphasis font-medium text-secondary bg-[#F5F3F0] active:scale-95 transition-transform">뒤로</button>
                        <button onClick={() => { handleQuickRecord('preg_weight', { tags: { kg: weightValue } }); setTempSlider(null) }}
                          className="flex-[2] py-3 rounded-xl text-body-emphasis font-bold text-white active:scale-95 transition-transform" style={{ background: 'var(--color-primary)' }}>
                          {weightValue.toFixed(1)}kg 기록
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
              <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => { setFabOpen(false); setSelectedCategory(null); setMemoItem(null); setMemoText('') }} />
              <div className="fixed z-[70] bottom-[80px] left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[390px]">
                <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-5" style={{ animation: 'fabItemPop 0.25s both cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  <p className="text-subtitle text-primary mb-3">투약 기록</p>
                  <input
                    type="text" placeholder="약 이름 (선택)" value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E4DF] bg-[#FAFAF8] text-body-emphasis text-primary placeholder-[#C4C0BB] focus:outline-none focus:border-[var(--color-primary)] transition-colors mb-4"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setMemoItem(null); setMemoText('') }} className="flex-1 py-3 rounded-xl text-body-emphasis font-medium text-secondary bg-[#F5F3F0] active:scale-95 transition-transform">뒤로</button>
                    <button onClick={() => {
                      const extra: Record<string, unknown> = memoText.trim() ? { tags: { medicine: memoText.trim() } } : {}
                      handleQuickRecord('medication', extra)
                      setMemoItem(null); setMemoText('')
                    }} className="flex-[2] py-3 rounded-xl text-body-emphasis font-bold text-white active:scale-95 transition-transform" style={{ background: '#D08068' }}>
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
              <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => { setFabOpen(false); setSelectedCategory(null); setSelectedItem(null) }} />
              <div className="fixed z-[70] bottom-[80px] left-1/2 -translate-x-1/2" style={{ maxWidth: 430 }}>
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
                          <span className="text-subtitle text-[var(--color-primary)]">{p.label}</span>
                        </button>
                        <span className="text-caption font-bold bg-white px-1.5 py-0.5 rounded-full shadow-md border border-[#E8E4DF]" style={{ color: '#000000' }}>{p.unit || ''}</span>
                      </div>
                    )
                  })}
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
            <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => { setFabOpen(false); setSelectedCategory(null) }} />
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
                        } else if (item.hasJournal) {
                          setJournalType(item.type as 'prep_journal' | 'preg_journal')
                          setJournalText('')
                          setFabOpen(false); setSelectedCategory(null); setSelectedItem(null)
                          setJournalOpen(true)
                        } else if (item.step3) {
                          setSelectedItem(item.type)
                        } else {
                          const recordType = item.baseType || item.type
                          const extra: Record<string, unknown> = {}
                          if (item.tags) extra.tags = item.tags
                          handleQuickRecord(recordType, extra)
                        }
                      }} className="w-16 h-16 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.35)] active:scale-90 transition-transform bg-white border-2 border-white">
                        {(() => {
                          const t = item.type
                          const node =
                            t === 'breast_left' || t === 'breast_right' ? <BreastfeedIcon className="w-7 h-7" /> :
                            t === 'feed'         ? <BottleIcon className="w-7 h-7" /> :
                            t === 'babyfood'     ? <BowlIcon className="w-7 h-7" /> :
                            t === 'snack'        ? <CookieIcon className="w-7 h-7" /> :
                            t === 'toddler_meal' ? <RiceIcon className="w-7 h-7" /> :
                            t === 'pump' || t === 'pump_left' || t === 'pump_right' ? <PumpIcon className="w-7 h-7" /> :
                            t === 'night_sleep'  ? <NightIcon className="w-7 h-7" /> :
                            t === 'nap'          ? <NapIcon className="w-7 h-7" /> :
                            t === 'sleep'        ? <MoonIcon className="w-7 h-7" /> :
                            t === 'pee'          ? <DropletIcon className="w-7 h-7" /> :
                            t === 'poop_normal' || t === 'poop_soft' || t === 'poop_hard' ? <PoopIcon className="w-7 h-7" /> :
                            t === 'temp'         ? <ThermometerIcon className="w-7 h-7" /> :
                            t === 'bath'         ? <BathIcon className="w-7 h-7" /> :
                            t === 'medication'   ? <PillIcon className="w-7 h-7" /> :
                            t === 'preg_mood_happy'   ? <MoodHappyIcon className="w-7 h-7" /> :
                            t === 'preg_mood_calm'    ? <MoodCalmIcon className="w-7 h-7" /> :
                            t === 'preg_mood_anxious' ? <MoodAnxiousIcon className="w-7 h-7" /> :
                            t === 'preg_mood_sick'    ? <MoodSickIcon className="w-7 h-7" /> :
                            t === 'preg_mood_tired'   ? <MoodTiredIcon className="w-7 h-7" /> :
                            t === 'preg_fetal_move'   ? <ActivityIcon className="w-7 h-7" /> :
                            t === 'preg_weight'       ? <ChartIcon className="w-7 h-7" /> :
                            t === 'preg_edema_mild' || t === 'preg_edema_severe' ? <WarningIcon className="w-7 h-7" /> :
                            t === 'preg_stretch' || t === 'preg_meditate' ? <YogaIcon className="w-7 h-7" /> :
                            t === 'preg_folic' || t === 'prep_folic'   ? <SproutIcon className="w-7 h-7" /> :
                            t === 'preg_iron'  || t === 'prep_iron'    ? <DropletIcon className="w-7 h-7" /> :
                            t === 'preg_vitd'  || t === 'prep_vitd'   ? <SunIcon className="w-7 h-7" /> :
                            t === 'preg_dha'   || t === 'prep_omega3' ? <OmegaIcon className="w-7 h-7" /> :
                            t === 'preg_calcium'  ? <BoneIcon className="w-7 h-7" /> :
                            t === 'preg_journal'  ? <PenIcon className="w-7 h-7" /> :
                            t === 'prep_walk'     ? <FootstepsIcon className="w-7 h-7" /> :
                            t === 'prep_stretch'  ? <YogaIcon className="w-7 h-7" /> :
                            t === 'prep_breath'   ? <ActivityIcon className="w-7 h-7" /> :
                            t === 'prep_meditate' ? <MoonIcon className="w-7 h-7" /> :
                            t === 'prep_music'    ? <MusicIcon className="w-7 h-7" /> :
                            t === 'prep_journal'  ? <PenIcon className="w-7 h-7" /> :
                            t === 'prep_mood_happy'   ? <MoodHappyIcon className="w-7 h-7" /> :
                            t === 'prep_mood_excited' ? <MoodHappyIcon className="w-7 h-7" /> :
                            t === 'prep_mood_calm'    ? <MoodCalmIcon className="w-7 h-7" /> :
                            t === 'prep_mood_anxious' ? <MoodAnxiousIcon className="w-7 h-7" /> :
                            t === 'prep_mood_tired'   ? <MoodTiredIcon className="w-7 h-7" /> :
                            <NoteIcon className="w-7 h-7" />
                          return <span style={{ color: item.color || cat.color }}>{node}</span>
                        })()}
                      </button>
                      <span className="text-caption font-bold whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow-md border border-[#E8E4DF]" style={{ color: '#000000' }}>{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )
      })()}

      {/* BNB 바 — Pill Style */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[65] px-5 pb-[env(safe-area-inset-bottom)]" style={{ overflow: 'visible' }}>
        <div className="flex items-center h-[62px] rounded-[36px] bg-white/95 backdrop-blur-lg border border-[#E8E4DF]/60 p-1" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'visible' }}>
          <>
              {tabs.slice(0, 2).map((tab) => (
                <NavTab key={tab.href} tab={tab} pathname={pathname} data-guide={{ '/town': 'nav-town', '/record': 'nav-record', '/more': 'nav-more', '/waiting': 'nav-waiting' }[tab.href]} />
              ))}

              {/* 중앙 FAB (물방울 — pill 위로 돌출) */}
              <div data-guide="fab" className="flex-1 flex items-center justify-center relative z-[75]" style={{ overflow: 'visible', pointerEvents: 'none' }}>
                {activeSession ? (
                  <button
                    onClick={endSession}
                    className="absolute -top-14 flex flex-col items-center justify-center transition-transform duration-200 active:scale-95 z-[80]"
                    style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'manipulation' }}
                    type="button"
                    aria-label="세션 종료 버튼"
                  >
                    <div
                      className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shadow-[0_6px_24px_rgba(0,0,0,0.3)]"
                      style={{
                        background: activeSession.color,
                        animation: 'fabSessionPulse 2s ease-in-out infinite',
                      }}
                    >
                      <span className="text-white text-subtitle tabular-nums leading-tight">
                        {formatElapsed(elapsed)}
                      </span>
                      <span className="text-white/90 text-[9px] font-semibold leading-tight">종료</span>
                    </div>
                    <span className="text-label mt-0.5 font-medium whitespace-nowrap" style={{ color: activeSession.color }}>
                      {activeSession.label}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(30)
                      if (memoItem) { setMemoItem(null); setMemoText('') }
                      else if (tempSlider) setTempSlider(null)
                      else if (selectedItem) setSelectedItem(null)
                      else if (selectedCategory) setSelectedCategory(null)
                      else setFabOpen(v => !v)
                    }}
                    className={`absolute -top-14 flex flex-col items-center justify-center transition-transform duration-200 z-[80] ${fabOpen ? 'scale-95' : ''}`}
                    style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'manipulation' }}
                    type="button"
                    aria-label="빠른 기록 버튼"
                  >
                    {fabOpen ? (
                      <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center active:scale-90 transition-all duration-200 bg-[#212124] shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
                        {(selectedCategory || selectedItem || tempSlider || memoItem)
                          ? <ArrowLeftIcon className="w-8 h-8 text-white" />
                          : <XIcon className="w-8 h-8 text-white" />}
                      </div>
                    ) : (
                      <div className="relative">
                        {/* 호흡 글로우 링 */}
                        <div className="absolute inset-[-6px] rounded-full" style={{ animation: 'fabGlow 3s ease-in-out infinite', background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)', opacity: 0.15 }} />
                        {/* 물방울 이미지 */}
                        <img src="/fab.png" alt="빠른 기록 버튼" width={72} height={72} className="active:scale-90 transition-all duration-200" style={{ filter: 'drop-shadow(0 4px 12px var(--color-fab-shadow))', animation: 'fabBreathe 3s ease-in-out infinite' }} />
                        {/* 반짝임 점 */}
                        <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-white" style={{ animation: 'fabSparkle 2.5s ease-in-out infinite', boxShadow: '0 0 4px rgba(255,255,255,0.8)' }} />
                      </div>
                    )}
                    <span className={`text-label mt-0.5 font-medium ${fabOpen ? 'text-primary' : 'text-[var(--color-primary)]'}`}>
                      기록
                    </span>
                  </button>
                )}
              </div>

              {tabs.slice(2).map((tab) => (
                <NavTab key={tab.href} tab={tab} pathname={pathname} data-guide={{ '/town': 'nav-town', '/record': 'nav-record', '/more': 'nav-more', '/waiting': 'nav-waiting' }[tab.href]} />
              ))}
          </>
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

      {/* 기다림 일기 바텀시트 */}
      {journalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/40" onClick={() => setJournalOpen(false)}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
            <div className="px-5 pb-5">
              <p className="text-subtitle text-primary mb-3 flex items-center gap-1.5">
                <BookOpenIcon className="w-4 h-4" />
                기다림 일기
              </p>
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mb-3">
                {(journalType === 'preg_journal'
                  ? ['태아에게 한마디', '오늘의 태동', '나에게 응원', '임신 감사', '기다림의 마음']
                  : ['아이에게 한마디', '오늘의 감사', '나에게 응원', '임신 기원', '기다림의 마음']
                ).map(chip => (
                  <button key={chip} onClick={() => setJournalText(prev => prev ? prev + ' ' + chip : chip)}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-[#F0EBFF] text-caption font-medium text-[#7C3AED]">{chip}</button>
                ))}
              </div>
              <textarea value={journalText} onChange={e => setJournalText(e.target.value.slice(0, 500))}
                placeholder={journalType === 'preg_journal' ? '우리 아기에게, 오늘의 마음을 전해요' : '아직 만나지 못한 아이에게, 오늘의 마음을 전해요'}
                className="w-full h-28 text-body-emphasis p-3 bg-[#F5F1EC] rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-[#A78BFA]"
                autoFocus />
              <p className="text-right text-caption text-tertiary mt-1">{journalText.length}/500</p>
              <button onClick={async () => {
                if (!journalText.trim()) return
                const storageKey = journalType === 'preg_journal' ? 'dodam_preg_diary' : 'dodam_prep_journal'
                const _d = new Date()
                const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`
                const entryDate = new Date().toISOString()
                const fallbackComment = journalType === 'preg_journal'
                  ? '오늘도 건강하게 자라고 있어요 💛'
                  : '오늘도 도담하게 잘 기다리고 있어요 🌱'
                try {
                  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]')
                  const entry = journalType === 'preg_journal'
                    ? { text: journalText.trim(), date: entryDate, mood: '', comment: fallbackComment }
                    : { text: journalText.trim(), date: entryDate, comment: fallbackComment }
                  localStorage.setItem(storageKey, JSON.stringify([entry, ...existing]))
                  if (journalType === 'prep_journal') {
                    const tsMap = JSON.parse(localStorage.getItem(`dodam_prep_ts_${today}`) || '{}')
                    if (!tsMap[journalType]) { tsMap[journalType] = new Date().toISOString(); localStorage.setItem(`dodam_prep_ts_${today}`, JSON.stringify(tsMap)) }
                    const done: string[] = JSON.parse(localStorage.getItem(`dodam_prep_done_${today}`) || '[]')
                    if (!done.includes(journalType)) { done.push(journalType); localStorage.setItem(`dodam_prep_done_${today}`, JSON.stringify(done)) }
                  }
                } catch {}
                window.dispatchEvent(new CustomEvent('dodam-record', { detail: { type: journalType, _handled: false } }))
                setJournalOpen(false)
                setJournalText('')
                window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '일기가 저장됐어요 🌱' } }))
                // AI 답장 — 백그라운드 처리 후 localStorage 업데이트 (토스트 없음)
                try {
                  setJournalLoading(true)
                  const letterCount = (() => { try { return JSON.parse(localStorage.getItem(storageKey) || '[]').length } catch { return 1 } })()
                  const res = await fetch('/api/ai-preparing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'letter', letterText: journalText.trim(), letterCount }),
                  })
                  const data = await res.json()
                  const aiReply = data.reply || fallbackComment
                  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
                  const updated = saved.map((e: any) => e.date === entryDate ? { ...e, comment: aiReply } : e)
                  localStorage.setItem(storageKey, JSON.stringify(updated))
                } catch { /* 오프라인 폴백 — fallback comment 유지 */ } finally {
                  setJournalLoading(false)
                }
              }} disabled={!journalText.trim() || journalLoading}
                className={`w-full py-3.5 rounded-xl text-subtitle mt-2 ${journalText.trim() && !journalLoading ? 'text-white' : 'bg-[#E8E4DF] text-tertiary'}`}
                style={journalText.trim() && !journalLoading ? { background: '#A78BFA' } : {}}>
                {journalLoading ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
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

function RecordGrid({ onRecord, ageMonths }: { onRecord: (type: string, extra?: Record<string, unknown>) => void; ageMonths: number }) {
  const ALL_ITEMS = buildCategories(ageMonths).flatMap(cat => cat.items.map(item => ({ ...item, catColor: cat.color })))
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
          <span className="text-body font-medium text-primary">{item.label}</span>
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
      <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-white' : 'text-tertiary'}`} />
      <span className={`text-label font-medium transition-colors uppercase tracking-wide ${isActive ? 'text-white' : 'text-tertiary'}`}>
        {tab.label}
      </span>
    </Link>
  )
}

export default memo(BottomNavComponent)
