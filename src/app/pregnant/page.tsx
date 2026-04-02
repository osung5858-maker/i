'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRemoteContent } from '@/lib/useRemoteContent'
import Link from 'next/link'
import { shareFetalSize, shareDday } from '@/lib/kakao/share-pregnant'
import BabyIllust from '@/components/pregnant/BabyIllust'
import { SparkleIcon, PenIcon, ActivityIcon, HeartFilledIcon, WalkIcon, VitaminIcon, MoodHappyIcon, MoodCalmIcon, MoodAnxiousIcon, MoodSickIcon, MoodTiredIcon, ChartIcon, DropletIcon } from '@/components/ui/Icons'
import TodayRecordSection from '@/components/ui/TodayRecordSection'
import IllustVideo from '@/components/ui/IllustVideo'
import MissionCard from '@/components/ui/MissionCard'
import AIMealCard from '@/components/ai-cards/AIMealCard'
import PushPrompt from '@/components/push/PushPrompt'
import SpotlightGuide from '@/components/onboarding/SpotlightGuide'
import { setSecure, getSecure } from '@/lib/secureStorage'
import { createClient } from '@/lib/supabase/client'

// ===== 태아 데이터 =====
const FETAL_DATA = [
  { week: 4, fruit: '/images/illustrations/f1.webm', name: '참깨', length: '0.1cm', weight: '-', desc: '수정란이 자궁에 착상했어요', tip: '엽산 복용을 시작하세요' },
  { week: 8, fruit: '/images/illustrations/f2.webm', name: '블루베리', length: '1.6cm', weight: '1g', desc: '심장이 뛰기 시작했어요!', tip: '첫 초음파 검사를 받아보세요' },
  { week: 12, fruit: '/images/illustrations/f3.webm', name: '자두', length: '5.4cm', weight: '14g', desc: '손가락 발가락이 생겼어요', tip: '입덧이 줄어들기 시작해요' },
  { week: 16, fruit: '/images/illustrations/f4.webm', name: '오렌지', length: '11.6cm', weight: '100g', desc: '태동을 느낄 수 있어요!', tip: '안정기 진입! 가벼운 산책을 시작하세요' },
  { week: 20, fruit: '/images/illustrations/f5.webm', name: '바나나', length: '25cm', weight: '300g', desc: '성별을 확인할 수 있어요', tip: '정밀 초음파 검사 시기예요' },
  { week: 24, fruit: '/images/illustrations/f6.webm', name: '옥수수', length: '30cm', weight: '600g', desc: '소리를 들을 수 있어요', tip: '태교 음악을 들려주세요' },
  { week: 28, fruit: '/images/illustrations/f7.webm', name: '코코넛', length: '37cm', weight: '1kg', desc: '눈을 뜨기 시작해요', tip: '임신성 당뇨 검사를 받으세요' },
  { week: 32, fruit: '/images/illustrations/f8.webm', name: '멜론', length: '42cm', weight: '1.7kg', desc: '폐가 성숙해지고 있어요', tip: '출산 가방을 준비하세요' },
  { week: 36, fruit: '/images/illustrations/f9.webm', name: '수박', length: '47cm', weight: '2.6kg', desc: '출산 자세로 내려오고 있어요', tip: '2주마다 검진을 받으세요' },
  { week: 40, fruit: '/images/illustrations/f9.webm', name: '호박', length: '51cm', weight: '3.4kg', desc: '만삭! 언제든 만날 수 있어요', tip: '진통 신호를 확인해두세요' },
]

// ===== 검진 리마인더 =====
const DEFAULT_CHECKUPS = [
  { week: 8, id: 'first_us', title: '첫 초음파', desc: '심장 박동 확인', icon: '' },
  { week: 11, id: 'nt', title: 'NT 검사', desc: '목덜미 투명대 측정', icon: '' },
  { week: 16, id: 'quad', title: '쿼드 검사', desc: '기형아 선별 검사', icon: '' },
  { week: 20, id: 'precise_us', title: '정밀 초음파', desc: '태아 정밀 구조 확인', icon: '' },
  { week: 24, id: 'gtt', title: '임신성 당뇨 검사', desc: '포도당 부하 검사', icon: '' },
  { week: 28, id: 'antibody', title: '항체 검사', desc: 'Rh 음성 시 필수', icon: '' },
  { week: 32, id: 'nst1', title: 'NST 검사 (1차)', desc: '태아 심박수 모니터링', icon: '' },
  { week: 36, id: 'gbs', title: 'GBS 검사', desc: 'B군 연쇄상구균', icon: '' },
  { week: 37, id: 'nst2', title: 'NST (매주)', desc: '주 1회 태아 안녕 평가', icon: '' },
]

// ===== 출산 가방 =====
const DEFAULT_HOSPITAL_BAG = {
  mom: [
    '산모 수첩 · 보험증', '수유 브라 2개', '산모 패드', '산모복 · 속옷',
    '세면도구 · 수건', '슬리퍼', '보온 양말', '간식 · 음료', '충전기', '산후 복대',
  ],
  baby: [
    '배냇저고리 2벌', '속싸개 · 겉싸개', '기저귀 (신생아)', '물티슈',
    '카시트 (퇴원용)', '모자 · 양말', '젖병 1개', '분유 소량 (비상용)',
  ],
  partner: [
    '간식 · 음료', '충전기 · 보조배터리', '카메라', '갈아입을 옷',
    '출생신고 서류', '주차 동전',
  ],
}

// ===== 계절별 출산 가방 추가 아이템 =====
const SEASONAL_BAG: Record<string, { season: string; items: string[] }> = {
  summer: { season: '여름', items: ['휴대용 선풍기', '쿨매트 · 쿨패드', '얇은 속싸개', '모기 기피제 (아기용)'] },
  winter: { season: '겨울', items: ['두꺼운 겉싸개 · 방한용', '핫팩 (산모용)', '보온 텀블러', '아기 방한우주복'] },
}

function getSeasonalBag(): { season: string; items: string[] } | null {
  const month = new Date().getMonth() + 1
  if (month >= 6 && month <= 8) return SEASONAL_BAG.summer
  if (month >= 11 || month <= 2) return SEASONAL_BAG.winter
  return null
}

// ===== AI 디스플레이 — 요약 + 펼치기 =====
function PregnantAIDisplay({ briefing, onRefresh, week, daysLeft, fruitName }: { briefing: any; onRefresh: () => void; week: number; daysLeft: number; fruitName: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div className="flex items-start" style={{ gap: 'var(--spacing-2)' }}>
        <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shrink-0 shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
          <span className="text-body text-white font-bold">AI</span>
        </div>
        <div className="flex-1">
          {/* 요약: 첫 문장 볼드 + 나머지 일반 */}
          {(() => {
            const text = briefing.greeting || briefing.mainAdvice?.slice(0, 80) || ''
            const firstDot = text.search(/[.!?]\s|[.!?]$/)
            const headline = firstDot > 0 ? text.slice(0, firstDot + 1) : text.slice(0, 50)
            const rest = firstDot > 0 ? text.slice(firstDot + 1).trim() : text.slice(50).trim()
            return (
              <div>
                <span className="text-body-emphasis leading-snug">{headline}</span>
                {rest && <span className="text-body text-secondary leading-relaxed"> {rest}</span>}
              </div>
            )
          })()}

          {/* 아기 메시지 (항상) */}
          {briefing.babyMessage && (
            <div className="bg-[var(--color-primary-bg)] rounded-lg mt-1.5 border border-[var(--color-primary)]/10" style={{ padding: 'var(--spacing-2)' }}>
              <p className="text-caption text-[var(--color-primary)]">💬 {briefing.babyMessage}</p>
            </div>
          )}

          {/* 상세 (펼치기) */}
          {expanded && (
            <div className="mt-2 bg-white/60 rounded-lg border border-[var(--color-accent-bg)]" style={{ padding: 'var(--spacing-3)', gap: 'var(--spacing-2)' }}>
              {briefing.mainAdvice && <p className="text-caption text-secondary leading-relaxed">{briefing.mainAdvice}</p>}
              {briefing.weekHighlight && <p className="text-caption text-secondary leading-relaxed">{briefing.weekHighlight}</p>}
              {briefing.bodyTip && <p className="text-caption text-secondary leading-relaxed">{briefing.bodyTip}</p>}
              {briefing.emotionalCare && <p className="text-caption text-secondary leading-relaxed">{briefing.emotionalCare}</p>}
            </div>
          )}

          <div className="flex items-center mt-2" style={{ gap: 'var(--spacing-3)' }}>
            <button onClick={() => setExpanded(!expanded)} className="text-caption text-[var(--color-primary)] font-medium press-feedback">
              {expanded ? '접기 ▲' : '자세히 ▼'}
            </button>
            <button onClick={onRefresh} className="text-caption text-tertiary press-feedback">다시 받기</button>
            <button onClick={() => shareDday(week, daysLeft, fruitName)} className="text-caption text-[var(--color-primary)] press-feedback">공유</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function haptic() { if (navigator.vibrate) navigator.vibrate(20) }

export default function PregnantPage() {
  const checkups = useRemoteContent('checkups', DEFAULT_CHECKUPS)
  const hospitalBag = useRemoteContent('hospital_bag', DEFAULT_HOSPITAL_BAG)
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); haptic(); setTimeout(() => setToast(null), 2000) }
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('dodam_guide_pregnant')) {
      const t = setTimeout(() => setShowGuide(true), 1000)
      return () => clearTimeout(t)
    }
  }, [])

  const [dueDate, setDueDate] = useState<string>('')
  const [editingDate, setEditingDate] = useState<boolean | null>(null)
  useEffect(() => {
    getSecure('dodam_due_date').then(v => {
      if (v) { setDueDate(v); setEditingDate(false) }
      else setEditingDate(true)
    })
  }, [])

  // 건강 기록 (parse once instead of 4x)
  const _tdn = new Date()
  const today = `${_tdn.getFullYear()}-${String(_tdn.getMonth()+1).padStart(2,'0')}-${String(_tdn.getDate()).padStart(2,'0')}`
  const _initHealth = (() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')[today] || {} } catch { return {} } }
    return {}
  })()
  const [weight, setWeight] = useState<number>(_initHealth.weight || 0)
  const [bp] = useState<string>(_initHealth.bp || '')
  const [fetalMove, setFetalMove] = useState<number>(_initHealth.fetalMove || 0)
  const [mood, setMood] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(`dodam_preg_mood_${today}`) || ''
    return ''
  })

  const [pregTodayEvents, setPregTodayEvents] = useState<{ id: number; type: string; data: Record<string, any>; timeStr: string }[]>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem(`dodam_preg_events_${today}`) || '[]') } catch { return [] }
    }
    return []
  })

  // 체크 (read-only: status card용)
  const [checkupDone] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_checkups') || '{}') } catch { return {} } }
    return {}
  })
  const [bagChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_hospital_bag') || '{}') } catch { return {} } }
    return {}
  })

  // 진통 타이머
  const [contractions, setContractions] = useState<{ start: number; end?: number }[]>([])
  const [contractionActive, setContractionActive] = useState(false)

  // AI
  const [aiBriefing, setAiBriefing] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  // 태명
  const [chosenNickname] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('dodam_chosen_nickname') || ''
  })

  const currentWeek = useMemo(() => {
    if (!dueDate) return 0
    const ms = new Date(dueDate).getTime()
    if (isNaN(ms)) return 0
    const diff = Math.floor((ms - Date.now()) / 86400000)
    return Math.max(1, Math.min(42, 40 - Math.floor(diff / 7)))
  }, [dueDate])

  const daysLeft = useMemo(() => {
    if (!dueDate) return 0
    const ms = new Date(dueDate).getTime()
    if (isNaN(ms)) return 0
    return Math.max(0, Math.floor((ms - Date.now()) / 86400000))
  }, [dueDate])

  const currentFetal = useMemo(() => {
    return [...FETAL_DATA].reverse().find(f => currentWeek >= f.week) || FETAL_DATA[0]
  }, [currentWeek])

  const trimester = currentWeek <= 13 ? '초기' : currentWeek <= 27 ? '중기' : '후기'
  const upcomingCheckups = checkups.filter(c => c.week >= currentWeek && !checkupDone[c.id]).slice(0, 3)

  const saveEdema = (level: string) => {
    const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
    all[today] = { ...all[today], edema: level }
    localStorage.setItem('dodam_preg_health', JSON.stringify(all))
    showToast(level === 'none' ? '부종 없음 기록' : level === 'mild' ? '약간 부종 기록' : '심한 부종 기록')
  }
  const saveMood = (m: string) => {
    setMood(m); localStorage.setItem(`dodam_preg_mood_${today}`, m)
    showToast('오늘 기분이 기록됐어요')
  }
  // 진통 타이머
  const startContraction = () => {
    setContractionActive(true)
    setContractions(prev => [...prev, { start: Date.now() }])
  }
  const endContraction = () => {
    setContractionActive(false)
    setContractions(prev => {
      const copy = [...prev]
      if (copy.length > 0) copy[copy.length - 1].end = Date.now()
      return copy
    })
  }
  const lastInterval = contractions.length >= 2
    ? Math.round((contractions[contractions.length - 1].start - contractions[contractions.length - 2].start) / 60000)
    : null

  // AI 브리핑
  const fetchAI = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem('dodam_preg_ai')
      if (cached) { try { const { date, data } = JSON.parse(cached); if (date === today && data.greeting) { setAiBriefing(data); return } } catch { /* */ } }
    }
    setAiLoading(true)
    try {
      const healthRaw = localStorage.getItem('dodam_health_records')
      const health = healthRaw ? JSON.parse(healthRaw) : {}
      const res = await fetch('/api/ai-pregnant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'daily', week: currentWeek, trimester, daysLeft, weight, bloodPressure: bp, fetalMovement: fetalMove, mood, sleep: health[today]?.sleep }),
      })
      const data = await res.json()
      if (!data.error) { setAiBriefing(data); localStorage.setItem('dodam_preg_ai', JSON.stringify({ date: today, data })) }
    } catch { /* */ }
    setAiLoading(false)
  }

  // AI 자동 호출 제거 — 캐시만 복원
  useEffect(() => {
    if (dueDate && !aiBriefing) {
      const cached = localStorage.getItem(`dodam_ai_preg_${new Date().toISOString().split('T')[0]}`)
      if (cached) try { setAiBriefing(JSON.parse(cached)) } catch { /* */ }
    }
  }, [!!dueDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // DB에서 오늘 기록 로드 (localStorage와 머지)
  useEffect(() => {
    const loadFromDB = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const todayStart = `${today}T00:00:00+09:00`
        const todayEnd = `${today}T23:59:59+09:00`
        const { data } = await supabase.from('pregnant_events')
          .select('id, type, start_ts, tags')
          .eq('user_id', user.id)
          .gte('start_ts', todayStart)
          .lte('start_ts', todayEnd)
          .order('start_ts', { ascending: false })
        if (data && data.length > 0) {
          const dbEvents = data.map((e: { id: string; type: string; start_ts: string; tags: Record<string, unknown> | null }) => ({
            id: new Date(e.start_ts).getTime(),
            type: e.type,
            data: { type: e.type, ...(e.tags || {}) },
            timeStr: new Date(e.start_ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
          }))
          // localStorage 캐시 갱신
          try { localStorage.setItem(`dodam_preg_events_${today}`, JSON.stringify(dbEvents)) } catch { /* */ }
          setPregTodayEvents(dbEvents)
        }
      } catch { /* 오프라인 시 localStorage 유지 */ }
    }
    loadFromDB()
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps

  // FAB 기록 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any
      detail._handled = true

      const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
      const newEvent = { id: Date.now(), type: detail.type, data: detail, timeStr }

      setPregTodayEvents(prev => {
        const updated = [newEvent, ...prev]
        try { localStorage.setItem(`dodam_preg_events_${today}`, JSON.stringify(updated)) } catch { /* */ }
        return updated
      })

      if (detail.type === 'preg_mood' && detail.tags?.mood) {
        saveMood(detail.tags.mood)
      } else if (detail.type === 'preg_fetal_move') {
        setFetalMove(prev => {
          const next = prev + 1
          const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
          all[today] = { ...all[today], fetalMove: next }
          localStorage.setItem('dodam_preg_health', JSON.stringify(all))
          showToast('태동 기록!')
          return next
        })
      } else if (detail.type === 'preg_weight' && detail.tags?.kg) {
        const kg = detail.tags.kg
        setWeight(kg)
        const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
        all[today] = { ...all[today], weight: kg }
        localStorage.setItem('dodam_preg_health', JSON.stringify(all))
        showToast(`체중 ${kg}kg 기록!`)
      } else if (detail.type === 'preg_edema' && detail.tags?.level) {
        saveEdema(detail.tags.level)
      } else if (detail.type === 'preg_water') {
        const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
        const prev = all[today]?.water || 0
        all[today] = { ...all[today], water: prev + 1 }
        localStorage.setItem('dodam_preg_health', JSON.stringify(all))
        showToast(`물 마시기 ${prev + 1}잔 기록!`)
      } else if (detail.type === 'preg_walk') {
        if (detail.end_ts) {
          const mins = Math.round((new Date(detail.end_ts).getTime() - new Date(detail.start_ts).getTime()) / 60000)
          showToast(`걷기 ${mins}분 기록!`)
        } else {
          showToast('걷기 시작!')
        }
      } else if (detail.type === 'preg_suppl' && detail.tags?.subtype) {
        const suppleNames: Record<string, string> = { folic: '엽산', iron: '철분', dha: 'DHA', calcium: '칼슘', multi: '종합비타민', etc: '영양제' }
        showToast(`${suppleNames[detail.tags.subtype] || '영양제'} 복용 기록!`)
      } else if (detail.type === 'preg_folic') {
        showToast('엽산 복용 기록!')
      } else if (detail.type === 'preg_iron') {
        showToast('철분 복용 기록!')
      } else if (detail.type === 'preg_dha') {
        showToast('DHA 복용 기록!')
      } else if (detail.type === 'preg_calcium') {
        showToast('칼슘 복용 기록!')
      } else if (detail.type === 'preg_vitd') {
        showToast('비타민D 복용 기록!')
      } else if (detail.type === 'preg_stretch') {
        if (detail.end_ts) {
          const mins = Math.round((new Date(detail.end_ts).getTime() - new Date(detail.start_ts).getTime()) / 60000)
          showToast(`스트레칭 ${mins}분 기록!`)
        } else {
          showToast('스트레칭 시작!')
        }
      }
    }
    window.addEventListener('dodam-record', handler)
    return () => window.removeEventListener('dodam-record', handler)
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps

  // 출산 예정일 입력
  const [tempDueDate, setTempDueDate] = useState(dueDate)
  if (editingDate === null) {
    return <div className="min-h-[100dvh] bg-[var(--color-page-bg)]" />
  }
  if (editingDate) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
        <h1 className="text-heading-2 font-bold text-primary mb-2">출산 예정일이 언제인가요?</h1>
        <p className="text-body text-secondary mb-8">주차별 성장 정보를 알려드릴게요</p>
        <input type="date" value={tempDueDate} onChange={(e) => setTempDueDate(e.target.value)}
          className="w-full max-w-xs h-[52px] rounded-xl border border-[#E8E4DF] px-4 text-subtitle text-center" />
        <button
          onClick={async () => {
            if (tempDueDate) {
              setDueDate(tempDueDate)
              await setSecure('dodam_due_date', tempDueDate)
              setEditingDate(false)
              const supabase = createClient()
              const { data: { user } } = await supabase.auth.getUser()
              if (user) supabase.from('user_profiles').upsert({ user_id: user.id, due_date: tempDueDate }).then(() => {})
            }
          }}
          disabled={!tempDueDate}
          className={`mt-6 w-full max-w-xs py-3 rounded-xl font-semibold ${tempDueDate ? 'bg-[var(--color-primary)] text-white active:opacity-80' : 'bg-[#E8E4DF] text-tertiary'}`}
        >
          완료
        </button>
        {dueDate && <button onClick={() => setEditingDate(false)} className="mt-3 text-body text-secondary">돌아가기</button>}
      </div>
    )
  }

  const seasonalBag = getSeasonalBag()
  const allBagItems = [...(hospitalBag.mom ?? []), ...(hospitalBag.baby ?? []), ...(hospitalBag.partner ?? []), ...(seasonalBag?.items || [])]
  const bagTotal = allBagItems.length
  const bagDone = Object.values(bagChecked).filter(Boolean).length

  return (
    <div className="bg-[var(--color-page-bg)]">
      {/* 헤더는 GlobalHeader (layout.tsx)에서 처리 */}

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-24 space-y-3">

        {/* ━━━ 출산 확인 (D-day 지남) ━━━ */}
        {daysLeft <= 0 && (
          <Link href="/birth" className="dodam-card-accent text-center press-feedback scale-in">
            <IllustVideo src="/images/illustrations/h1.webm" variant="circle" className="w-24 h-24 mx-auto mb-2" />
            <p className="text-body-emphasis">{chosenNickname || '우리 아이'}, 만났나요?</p>
            <p className="text-body text-tertiary mt-1">출산 예정일이 지났어요!</p>
            <p className="text-caption-bold text-[var(--color-primary)] mt-3">네, 만났어요! →</p>
          </Link>
        )}

        {/* ━━━ 출산 임박 (D-14 이내) ━━━ */}
        {daysLeft > 0 && daysLeft <= 14 && (
          <div className="dodam-card-accent" style={{ gap: 'var(--spacing-3)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
              <HeartFilledIcon className="w-6 h-6 text-[var(--color-primary)]" />
              <div className="flex-1">
                <p className="text-caption-bold">곧 만나요! D-{daysLeft}</p>
                <p className="text-caption text-tertiary">출산 가방은 준비됐나요? 진통 타이머도 확인해보세요</p>
              </div>
              <Link href="/birth" className="text-body-emphasis text-[var(--color-primary)] shrink-0 press-feedback">출산했어요 →</Link>
            </div>
          </div>
        )}

        {/* ━━━ 태명 유도 (미설정 시) ━━━ */}
        {!chosenNickname && (
          <Link href="/name" className="dodam-card hover-lift press-feedback bg-gradient-to-r from-white to-[var(--color-primary-bg)]">
            <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
              <SparkleIcon className="w-6 h-6 text-[var(--color-primary)]" />
              <div className="flex-1">
                <p className="text-caption-bold">우리 아이 태명을 지어볼까요?</p>
                <p className="text-caption text-tertiary">AI가 예쁜 태명을 추천해드려요</p>
              </div>
              <span className="text-tertiary">→</span>
            </div>
          </Link>
        )}

        {/* ━━━ 1. AI 데일리 케어 ━━━ */}
        <div data-guide="fetal-card" className="dodam-card-accent bg-gradient-to-br from-white via-[var(--color-primary-bg)] to-[var(--color-primary-bg)] border border-white/80">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SparkleIcon className="w-4 h-4 text-[var(--color-primary)]" />
              <p className="text-body-emphasis font-bold text-primary">AI 데일리 케어</p>
            </div>
            <button onClick={() => shareFetalSize(currentWeek, currentFetal.fruit, currentFetal.name, currentFetal.length, currentFetal.weight, daysLeft)} className="text-body-emphasis text-[var(--color-primary)] font-semibold press-feedback">
              공유
            </button>
          </div>

          {/* 태아 일러스트 + 주차 정보 */}
          <div className="flex items-center mb-3 gap-3">
            <div className="shrink-0">
              <BabyIllust week={currentWeek} size={80} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-emphasis font-bold leading-tight mb-1">{currentWeek}주차 · <span className="text-[var(--color-primary)]">{currentFetal.name}</span>만해요</p>
              <p className="text-body text-tertiary">{currentFetal.length} · {currentFetal.weight}</p>
            </div>
          </div>

          {/* 오늘 스탯 */}
          <div className="flex gap-2 mb-3">
            {(() => {
              const MOOD_LABELS: Record<string, string> = { happy: '행복', calm: '평온', anxious: '불안', sick: '입덧', tired: '피곤' }
              return [
                { label: '기분', value: mood ? (MOOD_LABELS[mood] ?? mood) : '-' },
                { label: '태동', value: fetalMove > 0 ? `${fetalMove}회` : '0회' },
                { label: '체중', value: weight > 0 ? `${weight}kg` : '-' },
              ].map(s => (
                <div key={s.label} className="flex-1 bg-white/80 rounded-lg text-center border border-white shadow-sm py-2">
                  <p className="text-body-emphasis font-bold text-[var(--color-primary)]">{s.value}</p>
                  <p className="text-body text-tertiary">{s.label}</p>
                </div>
              ))
            })()}
          </div>

          {/* AI 브리핑 */}
          {aiLoading ? (
            <div className="bg-white/80 rounded-xl p-4 border border-white shadow-sm mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                  <span className="text-body-emphasis font-bold text-white">AI</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                  <p className="text-body text-tertiary">AI가 분석 중이예요...</p>
                </div>
              </div>
            </div>
          ) : aiBriefing ? (
            <div className="mb-3">
              <PregnantAIDisplay briefing={aiBriefing} onRefresh={() => fetchAI(true)} week={currentWeek} daysLeft={daysLeft} fruitName={currentFetal.name} />
            </div>
          ) : (
            <button
              onClick={() => fetchAI()}
              className="w-full py-3 bg-[var(--color-primary)] text-white font-bold text-[15px] rounded-xl active:opacity-80 transition-opacity mb-3"
            >
              AI 케어받기
            </button>
          )}

          {/* 임신 진행 상황 */}
          <div className="pt-3 border-t border-white/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-body-emphasis text-primary">
                {daysLeft <= 14 ? '곧 만나요!' : daysLeft <= 60 ? '조금만 더!' : '함께 자라는 중'}
              </p>
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-body font-bold text-[var(--color-primary)]">
                {Math.min(100, Math.round((currentWeek / 40) * 100))}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (currentWeek / 40) * 100)}%` }}
              />
            </div>
            <p className="text-label text-tertiary mt-1.5 text-center">
              {currentWeek}주차 · 출산까지 D-{daysLeft}
            </p>
          </div>
        </div>

        {/* 푸시 알림 동의 */}
        <PushPrompt message="검진일과 주차 변경을 알려드릴까요?" />

        {/* ━━━ 2. 오늘 기록 ━━━ */}
        {(() => {
          const MOOD_CONFIG: Record<string, { label: string; Icon: React.FC<any>; color: string }> = {
            happy:   { label: '행복', Icon: MoodHappyIcon,   color: '#FF8FAB' },
            calm:    { label: '평온', Icon: MoodCalmIcon,    color: '#90C8A8' },
            anxious: { label: '불안', Icon: MoodAnxiousIcon, color: '#FFC078' },
            sick:    { label: '입덧', Icon: MoodSickIcon,    color: '#B8A0D4' },
            tired:   { label: '피곤', Icon: MoodTiredIcon,   color: '#8EB4D4' },
          }
          const getEventChip = (type: string, data: any): { cat: string; label: string; Icon: React.FC<any>; color: string; bg: string } => {
            if (type === 'preg_mood') { const m = MOOD_CONFIG[data.tags?.mood]; return m ? { cat: '기분', ...m, bg: '#FFE8F4' } : { cat: '기분', label: '기분', Icon: HeartFilledIcon, color: '#FF8FAB', bg: '#FFE8F4' } }
            if (type === 'preg_fetal_move') return { cat: '', label: '태동', Icon: ActivityIcon, color: '#5BA882', bg: '#E8F5EF' }
            if (type === 'preg_weight') return { cat: '체중', label: `${data.tags?.kg}kg`, Icon: ChartIcon, color: '#D08068', bg: '#FCE4DC' }
            if (type === 'preg_edema') {
              const lvl = data.tags?.level
              return { cat: '부종', label: lvl === 'none' ? '없음' : lvl === 'mild' ? '약함' : '심함', Icon: DropletIcon, color: '#4A90D9', bg: '#E6F0FA' }
            }
            if (type === 'preg_water') return { cat: '', label: '수분', Icon: DropletIcon, color: '#3B82F6', bg: '#E6EFFF' }
            if (type === 'preg_walk') return { cat: '운동', label: '걷기', Icon: WalkIcon, color: '#10B981', bg: '#E8F5EF' }
            if (type === 'preg_suppl') {
              const names: Record<string, string> = { folic: '엽산', iron: '철분', dha: 'DHA', calcium: '칼슘', multi: '종합비타민', etc: '영양제' }
              return { cat: '영양제', label: names[data.tags?.subtype] || '영양제', Icon: VitaminIcon, color: '#F59E0B', bg: '#FEF3E0' }
            }
            if (type === 'preg_stretch') return { cat: '운동', label: '스트레칭', Icon: ActivityIcon, color: '#8B5CF6', bg: '#EDE9FF' }
            if (type === 'preg_folic')   return { cat: '영양제', label: '엽산', Icon: VitaminIcon, color: '#10B981', bg: '#E8F5EF' }
            if (type === 'preg_iron')    return { cat: '영양제', label: '철분', Icon: VitaminIcon, color: '#10B981', bg: '#E8F5EF' }
            if (type === 'preg_dha')     return { cat: '영양제', label: 'DHA', Icon: VitaminIcon, color: '#10B981', bg: '#E8F5EF' }
            if (type === 'preg_calcium') return { cat: '영양제', label: '칼슘', Icon: VitaminIcon, color: '#10B981', bg: '#E8F5EF' }
            if (type === 'preg_vitd')    return { cat: '영양제', label: '비타민D', Icon: VitaminIcon, color: '#10B981', bg: '#E8F5EF' }
            if (type === 'preg_journal') return { cat: '일기', label: '기다림 일기', Icon: PenIcon, color: '#A78BFA', bg: '#EDE9FF' }
            return { cat: '', label: type, Icon: PenIcon, color: '#9E9A95', bg: '#F0EDE8' }
          }
          const sortedEvents = [...pregTodayEvents].sort((a, b) => b.id - a.id)
          const eventList = pregTodayEvents.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto overflow-x-hidden hide-scrollbar">
              {sortedEvents.map((ev) => {
                const cfg = getEventChip(ev.type, ev.data)
                return (
                  <div key={ev.id} className="flex items-center gap-2.5 py-2 border-b border-[#F0EDE8] last:border-0">
                    <span className="text-caption text-tertiary w-10 shrink-0 text-right font-mono">{ev.timeStr}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                      <cfg.Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-body text-primary flex-1 min-w-0 truncate">
                      {cfg.cat && <span className="text-tertiary font-normal mr-1">{cfg.cat}</span>}
                      <span className="font-semibold">{cfg.label}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null
          return (
            <TodayRecordSection
              count={pregTodayEvents.length}
              emptyMessage="아래 버튼으로 오늘의 첫 기록을 남겨보세요"
              headerRight={
                <Link href={`/preg-records/${today}`}>
                  <span className="text-body text-[var(--color-primary)] font-medium">전체보기 →</span>
                </Link>
              }
              footer={eventList ?? undefined}
            />
          )
        })()}

        {/* ━━━ 3. 상태 카드 — 주차별 동적 ━━━ */}
        {(() => {
          // 초기(~13주): 검진 중심
          if (currentWeek <= 13) return (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-body-emphasis text-secondary">다음 검진</p>
                {upcomingCheckups.length > 0 ? (
                  <><p className="text-body-emphasis font-bold text-primary mt-0.5 line-clamp-1">{upcomingCheckups[0].title}</p><p className="text-body text-[var(--color-primary)]">{upcomingCheckups[0].week}주</p></>
                ) : <p className="text-body text-tertiary mt-1">완료!</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-body-emphasis text-secondary">주차</p>
                <p className="text-heading-2 text-[var(--color-primary)] mt-0.5">{currentWeek}<span className="text-body-emphasis text-tertiary">주</span></p>
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-body-emphasis text-secondary">D-day</p>
                <p className="text-heading-2 text-primary mt-0.5">{daysLeft}<span className="text-body-emphasis text-tertiary">일</span></p>
              </div>
            </div>
          )
          // 중기(14~27주): 검진 + 태동 시작
          if (currentWeek <= 27) return (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-body-emphasis text-secondary">다음 검진</p>
                {upcomingCheckups.length > 0 ? (
                  <><p className="text-body-emphasis font-bold text-primary mt-0.5 line-clamp-1">{upcomingCheckups[0].title}</p><p className="text-body text-[var(--color-primary)]">{upcomingCheckups[0].week}주</p></>
                ) : <p className="text-body text-tertiary mt-1">완료!</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-body-emphasis text-secondary">오늘 태동</p>
                <p className="text-heading-2 text-[var(--color-primary)] mt-0.5">{fetalMove}<span className="text-body-emphasis text-tertiary">회</span></p>
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-body-emphasis text-secondary">D-day</p>
                <p className="text-heading-2 text-primary mt-0.5">{daysLeft}<span className="text-body-emphasis text-tertiary">일</span></p>
              </div>
            </div>
          )
          // 후기(28주+): 출산 가방 + 태동 + 검진
          return (
            <div className="grid grid-cols-3 gap-2">
              <div className={`bg-white rounded-xl border p-2.5 text-center ${bagDone < bagTotal ? 'border-[var(--color-accent-bg)]' : 'border-[#E8E4DF]'}`}>
                <p className="text-body-emphasis text-secondary">출산 가방</p>
                <p className="text-heading-2 text-primary mt-0.5">{bagDone}<span className="text-body-emphasis text-tertiary">/{bagTotal}</span></p>
                {bagDone < bagTotal && <p className="text-body text-[var(--color-primary)]">준비하세요!</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-body-emphasis text-secondary">오늘 태동</p>
                <p className="text-heading-2 text-[var(--color-primary)] mt-0.5">{fetalMove}<span className="text-body-emphasis text-tertiary">회</span></p>
                {fetalMove > 0 && fetalMove < 10 && <p className="text-body text-[#D08068]">10회 이상 확인</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-body-emphasis text-secondary">D-day</p>
                <p className={`text-heading-2 mt-0.5 ${daysLeft <= 14 ? 'text-[#D08068]' : 'text-primary'}`}>{daysLeft}<span className="text-body-emphasis text-tertiary">일</span></p>
                {daysLeft <= 14 && <p className="text-body text-[#D08068]">곧 만나요!</p>}
              </div>
            </div>
          )
        })()}

        {/* ━━━ 4. 진통 타이머 (후기만) ━━━ */}
        {currentWeek >= 36 && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-2">진통 타이머</p>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={contractionActive ? endContraction : startContraction}
                className={`flex-1 py-3 rounded-xl text-body-emphasis ${contractionActive ? 'bg-[#D08068] text-white animate-pulse' : 'bg-[var(--color-primary)] text-white'}`}
              >
                {contractionActive ? '진통 끝' : '진통 시작'}
              </button>
              {contractions.length > 0 && (
                <button onClick={() => setContractions([])} className="text-body text-tertiary">초기화</button>
              )}
            </div>
            {lastInterval !== null && (
              <div className="bg-[var(--color-page-bg)] rounded-lg p-2 text-center">
                <p className="text-body-emphasis text-secondary">마지막 간격</p>
                <p className="text-heading-2 text-primary">{lastInterval}분</p>
                {lastInterval <= 5 && <p className="text-body text-[#D08068] font-semibold mt-1">간격이 5분 이하! 병원에 연락하세요</p>}
              </div>
            )}
            <p className="text-body text-tertiary mt-2">기록: {contractions.length}회{contractions.length >= 3 ? ` · 평균 ${Math.round(contractions.slice(1).reduce((sum, c, i) => sum + (c.start - contractions[i].start), 0) / ((contractions.length - 1) * 60000))}분 간격` : ''}</p>
          </div>
        )}

        {/* AI 식단 카드 */}
        <AIMealCard mode="pregnant" value={currentWeek} />

        {/* 부부 미션 카드 */}
        <MissionCard mode="pregnant" />

        {/* 기다림 페이지 바로가기 */}
        <Link href="/waiting" className="block w-full">
          <div className="dodam-card text-center hover-lift press-feedback relative overflow-hidden">
            <p className="text-body-emphasis font-bold text-primary">검진 · 혜택 · 준비물 보기 →</p>
            <p className="text-body text-tertiary mt-0.5">기다림 페이지에서 확인하세요</p>
          </div>
        </Link>

      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-[#1A1918]/80 text-white text-body font-medium px-4 py-2.5 rounded-xl shadow-lg animate-[fadeIn_0.15s_ease-out]">
          {toast}
        </div>
      )}

      {showGuide && <SpotlightGuide mode="pregnant" onComplete={() => { localStorage.setItem('dodam_guide_pregnant', '1'); setShowGuide(false) }} />}
    </div>
  )
}
