'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchPrepRecords } from '@/lib/supabase/prepRecord'
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
  prep_iron:    { cat: '영양제', label: '철분',    Icon: DropletIcon,   bg: '#E8F5EF', color: '#10B981' },
  prep_vitd:    { cat: '영양제', label: '비타민D', Icon: SunIcon,       bg: '#E8F5EF', color: '#10B981' },
  prep_omega3:  { cat: '영양제', label: '오메가3', Icon: OmegaIcon,     bg: '#E8F5EF', color: '#10B981' },
  prep_walk:    { cat: '운동',   label: '걷기',    Icon: FootstepsIcon, bg: '#FEF3E0', color: '#F59E0B' },
  prep_stretch: { cat: '운동',   label: '스트레칭',Icon: YogaIcon,      bg: '#FEF3E0', color: '#F59E0B' },
  prep_breath:  { cat: '운동',   label: '심호흡',  Icon: ActivityIcon,  bg: '#FEF3E0', color: '#F59E0B' },
  prep_meditate:{ cat: '운동',   label: '명상',    Icon: MoonIcon,      bg: '#FEF3E0', color: '#F59E0B' },
  prep_music:   { cat: '운동',   label: '음악감상',Icon: MusicIcon,     bg: '#FEF3E0', color: '#F59E0B' },
  prep_journal: { cat: '기다림', label: '일기',    Icon: BookOpenIcon,  bg: '#EDE9FF', color: '#A78BFA' },
}

const MOOD_CONFIG: Record<string, { label: string; Icon: IconFC; bg: string; color: string }> = {
  happy:   { label: '행복', Icon: MoodHappyIcon,   bg: '#FFE4F2', color: '#F472B6' },
  excited: { label: '설렘', Icon: MoodHappyIcon,   bg: '#FFE4F2', color: '#F472B6' },
  calm:    { label: '평온', Icon: MoodCalmIcon,    bg: '#FFE4F2', color: '#F472B6' },
  anxious: { label: '불안', Icon: MoodAnxiousIcon, bg: '#FFE4F2', color: '#F472B6' },
  tired:   { label: '피곤', Icon: MoodTiredIcon,   bg: '#FFE4F2', color: '#F472B6' },
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
    fetchPrepRecords().then(rows => {
      const dayRows = rows.filter(r => r.record_date === dateStr)
      const doneItems: string[] = []
      let moodVal: { mood: string; ts?: string } | null = null
      const timestamps: Record<string, string> = {}
      const supplements: Record<string, number> = {}
      const journals: string[] = []

      dayRows.forEach(r => {
        const val = r.value as any
        if (r.type === 'mood') {
          moodVal = { mood: val.mood || '', ts: val.ts }
          doneItems.push(`prep_mood_${val.mood}`)
        } else if (r.type === 'supplement') {
          const sub = val.subtype || val.key || ''
          if (sub) supplements[sub] = (supplements[sub] || 0) + (val.count || 1)
        } else if (r.type === 'journal') {
          if (val.text) journals.push(val.text)
        } else {
          // activity records: walk, stretch, breath, meditate, music, etc.
          const key = `prep_${r.type}`
          doneItems.push(key)
          if (val.ts) timestamps[key] = val.ts
          if (val.duration) timestamps[`${key}_duration`] = String(val.duration)
        }
      })

      setDone(doneItems)
      setMoodData(moodVal)
      setTsMap(timestamps)
      setSuppl(supplements)
      setJournal(journals.length > 0 ? journals : null)
    }).catch(() => {
      setDone([])
      setMoodData(null)
      setTsMap({})
      setSuppl({})
      setJournal(null)
    })
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
        <button onClick={() => router.back()} className="text-sm text-tertiary">뒤로</button>
        <h1 className="text-subtitle text-primary">기록 상세</h1>
        <div className="w-8" />
      </div>

      {/* 날짜 네비게이션 — 고정 */}
      <div className="shrink-0 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push(`/prep-records/${prevDate}`)}
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRightIcon className="w-4 h-4 text-tertiary rotate-180" />
          </button>
          <p className="text-sm font-semibold text-primary">
            {formatDateKr(dateStr)}
            {isToday && <span className="text-[var(--color-primary)] ml-1">오늘</span>}
          </p>
          <button
            onClick={() => canGoNext && router.push(`/prep-records/${nextDate}`)}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
          >
            <ChevronRightIcon className="w-4 h-4 text-tertiary" />
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
                <p className="text-label font-medium" style={{ color: firstMoodCfg ? firstMoodCfg.color : '#9B9B9B' }}>기분</p>
                <p className="text-sm font-bold" style={{ color: firstMoodCfg ? firstMoodCfg.color : '#C5C1BC' }}>
                  {moodItems.length > 1 ? `${moodItems.length}개` : firstMoodCfg ? firstMoodCfg.label : '-'}
                </p>
              </div>
            )
          })()}
          <div className="flex-1 px-2 py-2 rounded-xl bg-[#E8F5EF] border border-[#C8E8D8] text-center">
            <p className="text-label text-[#5BA882] font-medium">완료</p>
            <p className="text-sm font-bold text-[#3D8A66]">{done.filter(k => !k.startsWith('prep_mood_')).length > 0 ? `${done.filter(k => !k.startsWith('prep_mood_')).length}건` : '-'}</p>
          </div>
          <div className="flex-1 px-2 py-2 rounded-xl bg-[#FEF3C7] border border-[#F0D48C] text-center">
            <p className="text-label text-[#D97706] font-medium">영양제</p>
            <p className="text-sm font-bold text-[#B45309]">{supplTaken.length > 0 ? `${supplTaken.length}종` : '-'}</p>
          </div>
          <div className="flex-1 px-2 py-2 rounded-xl bg-[#EDE9FE] border border-[#D4C8F8] text-center">
            <p className="text-label text-[#7C3AED] font-medium">기다림 일기</p>
            <p className="text-sm font-bold text-[#5B21B6]">{journal ? `${journal.length}개` : '-'}</p>
          </div>
        </div>

        {/* 기록 목록 */}
        <div className="mx-4 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <svg className="w-8 h-8 text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 8v4l3 3" strokeLinecap="round" /><circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <p className="text-subtitle text-primary">이 날의 기록이 없어요</p>
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
                      <p className="text-body-emphasis text-primary">
                        <span className="text-tertiary font-normal mr-1">기분</span>
                        <span className="font-semibold">{label}</span>
                      </p>
                      <p className="text-body text-secondary">{time || ''}</p>
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
                      <p className="text-body-emphasis text-primary">
                        <span className="text-tertiary font-normal mr-1">기분</span>
                        <span className="font-semibold">{label}</span>
                      </p>
                      <p className="text-body text-secondary">{time || ''}</p>
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
                const durationStr = (() => {
                  const dur = tsMap[`${key}_duration`]
                  if (!dur) return ''
                  const secs = parseInt(dur, 10)
                  if (isNaN(secs) || secs <= 0) return ''
                  const mm = Math.floor(secs / 60)
                  const ss = secs % 60
                  return `${mm}분 ${String(ss).padStart(2, '0')}초`
                })()
                return (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-emphasis text-primary">
                        <span className="text-tertiary font-normal mr-1">{cat}</span>
                        <span className="font-semibold">{label}</span>
                      </p>
                      <p className="text-body text-secondary">
                        {durationStr ? `총 ${durationStr}` : ''}{durationStr && time ? ' · ' : ''}{time || (!durationStr ? '' : '')}
                      </p>
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
                      <p className="text-body-emphasis text-primary">
                        <span className="text-tertiary font-normal mr-1">영양제</span>
                        <span className="font-semibold">{SUPPL_LABEL[key] || key}</span>
                      </p>
                      <p className="text-body text-secondary">{time || `${val}정`}</p>
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
                    <p className="text-body font-semibold text-[#A78BFA] mb-0.5">기다림 일기 {i + 1}</p>
                    <p className="text-body text-[#4A4744] leading-relaxed">{text}</p>
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
