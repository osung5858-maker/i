'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ChevronRightIcon, SproutIcon, DropletIcon, SunIcon, OmegaIcon,
  FootstepsIcon, YogaIcon, ActivityIcon, MoonIcon, MusicIcon, BookOpenIcon,
  MoodHappyIcon, MoodCalmIcon, MoodAnxiousIcon, MoodTiredIcon, NoteIcon, PillIcon,
} from '@/components/ui/Icons'

function formatDateKr(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

function getDateOffset(dateStr: string, offset: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + offset)
  const n = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return n.toISOString().split('T')[0]
}

type IconFC = React.FC<{ className?: string }>

const EVENT_CONFIG: Record<string, { cat: string; label: string; Icon: IconFC; bg: string; color: string }> = {
  prep_folic:   { cat: '영양제', label: '엽산',    Icon: SproutIcon,    bg: '#E8F5EF', color: '#10B981' },
  prep_iron:    { cat: '영양제', label: '철분',    Icon: DropletIcon,   bg: '#FEE2E2', color: '#EF4444' },
  prep_vitd:    { cat: '영양제', label: '비타민D', Icon: SunIcon,       bg: '#FEF9E0', color: '#F59E0B' },
  prep_omega3:  { cat: '영양제', label: '오메가3', Icon: OmegaIcon,     bg: '#EFF6FF', color: '#3B82F6' },
  prep_walk:    { cat: '운동',   label: '걷기',    Icon: FootstepsIcon, bg: '#FEF3E0', color: '#F59E0B' },
  prep_stretch: { cat: '운동',   label: '스트레칭',Icon: YogaIcon,      bg: '#FEF3E0', color: '#F59E0B' },
  prep_breath:  { cat: '운동',   label: '심호흡',  Icon: ActivityIcon,  bg: '#FEF3E0', color: '#F59E0B' },
  prep_meditate:{ cat: '루틴',   label: '명상',    Icon: MoonIcon,      bg: '#EDE9FF', color: '#8B5CF6' },
  prep_music:   { cat: '루틴',   label: '음악감상',Icon: MusicIcon,     bg: '#FFE4F2', color: '#F472B6' },
  prep_journal: { cat: '기다림', label: '일기',    Icon: BookOpenIcon,  bg: '#EDE9FF', color: '#A78BFA' },
}

const MOOD_CONFIG: Record<string, { label: string; Icon: IconFC; bg: string; color: string }> = {
  happy:   { label: '행복', Icon: MoodHappyIcon,   bg: '#FFE8F4', color: '#FF8FAB' },
  excited: { label: '설렘', Icon: MoodHappyIcon,   bg: '#FFE8F4', color: '#FFB347' },
  calm:    { label: '평온', Icon: MoodCalmIcon,    bg: '#E8F5EF', color: '#90C8A8' },
  anxious: { label: '불안', Icon: MoodAnxiousIcon, bg: '#FFF3E0', color: '#FFC078' },
  tired:   { label: '피곤', Icon: MoodTiredIcon,   bg: '#E8F0F8', color: '#8EB4D4' },
}

const SUPPL_LABEL: Record<string, string> = { folic: '엽산', vitd: '비타민D', iron: '철분', omega3: '오메가3' }

export default function PrepRecordDetailPage() {
  const params = useParams()
  const dateStr = params.date as string
  const router = useRouter()

  const _now = new Date()
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
  const isToday = dateStr === today
  const prevDate = getDateOffset(dateStr, -1)
  const nextDate = getDateOffset(dateStr, 1)
  const canGoNext = nextDate <= today

  const [done, setDone] = useState<string[]>([])
  const [moodData, setMoodData] = useState<{ mood: string; ts?: string } | null>(null)
  const [tsMap, setTsMap] = useState<Record<string, string>>({})
  const [suppl, setSuppl] = useState<Record<string, number>>({})
  const [journal, setJournal] = useState<string[] | null>(null)

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(`dodam_prep_done_${dateStr}`) || '[]')) } catch { setDone([]) }

    const raw = localStorage.getItem(`dodam_mood_${dateStr}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        setMoodData(typeof parsed === 'object' ? parsed : { mood: parsed })
      } catch { setMoodData({ mood: raw }) }
    } else {
      setMoodData(null)
    }

    try { setTsMap(JSON.parse(localStorage.getItem(`dodam_prep_ts_${dateStr}`) || '{}')) } catch { setTsMap({}) }
    try { setSuppl(JSON.parse(localStorage.getItem(`dodam_suppl_${dateStr}`) || '{}')) } catch { setSuppl({}) }

    try {
      const all: { text: string; date: string }[] = JSON.parse(localStorage.getItem('dodam_prep_journal') || '[]')
      const dayEntries = all.filter(e => e.date?.startsWith(dateStr)).map(e => e.text).filter(Boolean)
      setJournal(dayEntries.length > 0 ? dayEntries : null)
    } catch { setJournal(null) }
  }, [dateStr])

  const fmt = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // prep_mood_* 타입: 새 방식 (복수 기분 기록)
  const moodItems = done.filter(k => k.startsWith('prep_mood_'))
  // 구버전 fallback: dodam_mood_${date} 에만 기분이 있고 done에 prep_mood_* 없는 경우
  const legacyMoodKey = moodItems.length === 0 ? (moodData?.mood || '') : ''
  const supplTaken = Object.entries(suppl).filter(([, v]) => v > 0)
  const hasData = done.length > 0 || legacyMoodKey || supplTaken.length > 0 || journal
  const legacyMoodCfg = legacyMoodKey ? MOOD_CONFIG[legacyMoodKey] : null

  return (
    <div className="h-[100dvh] flex flex-col bg-[#F5F1EC] overflow-hidden">
      {/* 헤더 — 고정 */}
      <div className="shrink-0 h-12 px-5 max-w-lg mx-auto w-full flex items-center justify-between bg-[#F5F1EC] border-b border-[#E0DDD8]">
        <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">뒤로</button>
        <h1 className="text-[15px] font-bold text-[#0A0B0D]">기록 상세</h1>
        <div className="w-8" />
      </div>

      {/* 날짜 네비게이션 — 고정 */}
      <div className="shrink-0 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push(`/prep-records/${prevDate}`)}
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B] rotate-180" />
          </button>
          <p className="text-sm font-semibold text-[#0A0B0D]">
            {formatDateKr(dateStr)}
            {isToday && <span className="text-[var(--color-primary)] ml-1">오늘</span>}
          </p>
          <button
            onClick={() => canGoNext && router.push(`/prep-records/${nextDate}`)}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
          >
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
          </button>
        </div>
      </div>

      {/* 스크롤 바디 */}
      <div className="flex-1 overflow-y-auto overscroll-contain max-w-lg mx-auto w-full pb-4">
        {/* 요약 칩 — 항상 4개 고정 */}
        <div className="mx-4 mb-3 flex gap-2">
          {(() => {
            const firstMoodCfg = moodItems.length > 0
              ? MOOD_CONFIG[moodItems[0].replace('prep_mood_', '')]
              : legacyMoodCfg
            return (
              <div className="flex-1 px-2 py-2 rounded-xl border text-center"
                style={{ backgroundColor: firstMoodCfg ? firstMoodCfg.color + '20' : '#F0EDE8', borderColor: firstMoodCfg ? firstMoodCfg.color + '40' : '#E0DCD6' }}>
                <p className="text-[11px] font-medium" style={{ color: firstMoodCfg ? firstMoodCfg.color : '#9B9B9B' }}>기분</p>
                <p className="text-sm font-bold" style={{ color: firstMoodCfg ? firstMoodCfg.color : '#C5C1BC' }}>
                  {moodItems.length > 1 ? `${moodItems.length}개` : firstMoodCfg ? firstMoodCfg.label : '-'}
                </p>
              </div>
            )
          })()}
          <div className="flex-1 px-2 py-2 rounded-xl bg-[#E8F5EF] border border-[#C8E8D8] text-center">
            <p className="text-[11px] text-[#5BA882] font-medium">완료</p>
            <p className="text-sm font-bold text-[#3D8A66]">{done.filter(k => !k.startsWith('prep_mood_')).length > 0 ? `${done.filter(k => !k.startsWith('prep_mood_')).length}건` : '-'}</p>
          </div>
          <div className="flex-1 px-2 py-2 rounded-xl bg-[#FEF3C7] border border-[#F0D48C] text-center">
            <p className="text-[11px] text-[#D97706] font-medium">영양제</p>
            <p className="text-sm font-bold text-[#B45309]">{supplTaken.length > 0 ? `${supplTaken.length}종` : '-'}</p>
          </div>
          <div className="flex-1 px-2 py-2 rounded-xl bg-[#EDE9FE] border border-[#D4C8F8] text-center">
            <p className="text-[11px] text-[#7C3AED] font-medium">기다림 일기</p>
            <p className="text-sm font-bold text-[#5B21B6]">{journal ? `${journal.length}개` : '-'}</p>
          </div>
        </div>

        {/* 기록 목록 */}
        <div className="mx-4 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#9E9A95]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 8v4l3 3" strokeLinecap="round" /><circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-[#212124]">이 날의 기록이 없어요</p>
            </div>
          ) : (
            <div className="flex flex-col px-4 gap-2 pb-4 pt-2">
              {/* 기분 — 새 방식: prep_mood_* 복수 표시 */}
              {moodItems.map(key => {
                const moodVal = key.replace('prep_mood_', '')
                const cfg = MOOD_CONFIG[moodVal]
                if (!cfg) return null
                const { Icon, bg, color, label } = cfg
                const time = fmt(tsMap[key])
                return (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-[#1A1918]">
                        <span className="text-[#9E9A95] font-normal mr-1">기분</span>
                        <span className="font-semibold">{label}</span>
                      </p>
                      <p className="text-[13px] text-[#6B6966]">{time || '기분'}</p>
                    </div>
                  </div>
                )
              })}
              {/* 기분 — 구버전 fallback */}
              {legacyMoodCfg && (() => {
                const { Icon, bg, color, label } = legacyMoodCfg
                const time = fmt(moodData?.ts)
                return (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-[#1A1918]">
                        <span className="text-[#9E9A95] font-normal mr-1">기분</span>
                        <span className="font-semibold">{label}</span>
                      </p>
                      <p className="text-[13px] text-[#6B6966]">{time || '기분'}</p>
                    </div>
                  </div>
                )
              })()}

              {/* 완료 활동 (prep_mood_* 는 위에서 처리) */}
              {done.filter(k => !k.startsWith('prep_mood_')).map((key) => {
                const cfg = EVENT_CONFIG[key]
                if (!cfg) return null
                const { Icon, bg, color, cat, label } = cfg
                const time = fmt(tsMap[key])
                return (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-[#1A1918]">
                        <span className="text-[#9E9A95] font-normal mr-1">{cat}</span>
                        <span className="font-semibold">{label}</span>
                      </p>
                      <p className="text-[13px] text-[#6B6966]">{time || '완료'}</p>
                    </div>
                  </div>
                )
              })}

              {/* 영양제 */}
              {supplTaken.map(([key, val]) => {
                const time = fmt(tsMap[`suppl_${key}`])
                return (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FEF3C7', color: '#D97706' }}>
                      <PillIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-[#1A1918]">
                        <span className="text-[#9E9A95] font-normal mr-1">영양제</span>
                        <span className="font-semibold">{SUPPL_LABEL[key] || key}</span>
                      </p>
                      <p className="text-[13px] text-[#6B6966]">{time || `${val}정`}</p>
                    </div>
                  </div>
                )
              })}

              {/* 기다림 일기 */}
              {journal && journal.map((text: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#EDE9FF]" style={{ color: '#A78BFA' }}>
                    <NoteIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#A78BFA] mb-0.5">기다림 일기 {i + 1}</p>
                    <p className="text-[13px] text-[#4A4744] leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
