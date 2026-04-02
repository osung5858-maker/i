'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRemoteContent } from '@/lib/useRemoteContent'
import { getProfile } from '@/lib/supabase/userProfile'
import { getSecure } from '@/lib/secureStorage'
import { upsertPrepRecord, insertPrepRecord, deletePrepRecord, fetchPrepRecords } from '@/lib/supabase/prepRecord'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { sharePositiveTest } from '@/lib/kakao/share'
import { HeartIcon, PenIcon, SparkleIcon, BookOpenIcon, PregnantIcon, MoonIcon, BabyIcon, ActivityIcon, CompassIcon, SproutIcon, ExternalLinkIcon } from '@/components/ui/Icons'
import IllustVideo from '@/components/ui/IllustVideo'
import BenefitTabs from '@/components/ui/BenefitTabs'
import AIMealCard from '@/components/ai-cards/AIMealCard'
import BabyItemChecklist from '@/components/pregnant/BabyItemChecklist'

const HospitalGuide = dynamic(() => import('@/components/pregnant/HospitalGuide'), {
  loading: () => <div className="h-24 bg-[#F0EDE8] rounded-xl animate-pulse" />,
})
// ===== 주기 계산 =====
function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d
}
function formatDate(d: Date): string { return d.toISOString().split('T')[0] }
function isSameDay(a: Date, b: Date): boolean { return formatDate(a) === formatDate(b) }

function getCycleInfo(lastPeriodStart: string, cycleLength: number) {
  const start = new Date(lastPeriodStart)
  // 현재 주기 + 다음 주기까지 계산 (캘린더 다음 달 표시용)
  const cycles: { ovulation: string; fertileStart: string; fertileEnd: string; periodStart: string }[] = []
  for (let i = 0; i < 3; i++) {
    const cycleStart = addDays(start, cycleLength * i)
    const ov = addDays(cycleStart, cycleLength - 14)
    const fs = addDays(ov, -5)
    const fe = addDays(ov, 1)
    cycles.push({
      ovulation: formatDate(ov),
      fertileStart: formatDate(fs),
      fertileEnd: formatDate(fe),
      periodStart: formatDate(cycleStart),
    })
  }
  const ovulationDay = addDays(start, cycleLength - 14)
  const nextPeriod = addDays(start, cycleLength)
  return { ovulationDay, nextPeriod, cycles }
}

const DEFAULT_CHECKLIST = [
  { id: 'folic', icon: '', title: '엽산 복용', desc: '임신 3개월 전부터' },
  { id: 'checkup', icon: '', title: '산전 건강검진', desc: '혈액·소변·풍진항체' },
  { id: 'dental', icon: '', title: '치과 검진', desc: '임신 중 치료 어려우니 미리' },
  { id: 'vaccine', icon: '', title: '예방접종 확인', desc: '풍진·수두·A형간염' },
  { id: 'weight', icon: '', title: '적정 체중', desc: 'BMI 18.5~24.9' },
  { id: 'nosmoking', icon: '', title: '금연·금주', desc: '3개월 전부터' },
  { id: 'exercise', icon: '', title: '규칙적 운동', desc: '주 3회' },
  { id: 'stress', icon: '', title: '스트레스 관리', desc: '충분한 수면·명상' },
]


const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function haptic() { if (navigator.vibrate) navigator.vibrate(20) }

function PreparingWaitingPage() {
  const checklist = useRemoteContent('waiting_checklist', DEFAULT_CHECKLIST)
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); haptic(); setTimeout(() => setToast(null), 2000) }
  const [chosenNickname, setChosenNickname] = useState<string>('')
  const [lastPeriod, setLastPeriod] = useState<string>('')
  const [cycleLength, setCycleLength] = useState<number>(28)
  const [periodRecords] = useState<Record<string, string>>({})
  const [bbtRecords, setBbtRecords] = useState<Record<string, number>>({})
  const [ovulationTests, setOvulationTests] = useState<Record<string, boolean>>({})
  const [intimacyDates, setIntimacyDates] = useState<Record<string, boolean>>({})

  // DB에서 프로필 + 준비 기록 로드
  useEffect(() => {
    getProfile().then(p => {
      if (p?.chosen_nickname) setChosenNickname(p.chosen_nickname)
      if (p?.last_period) setLastPeriod(p.last_period)
      if (p?.cycle_length) setCycleLength(p.cycle_length)
    })
    fetchPrepRecords(['bbt', 'ovulation_test', 'intimacy', 'preg_test']).then(records => {
      const tests = records
        .filter(r => r.type === 'preg_test')
        .map(r => ({
          date: r.record_date,
          result: (r.value as { result: string }).result,
          dpo: (r.value as { dpo: number }).dpo,
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
      setPregTests(tests)
      const bbt: Record<string, number> = {}
      const ovulation: Record<string, boolean> = {}
      const intimacy: Record<string, boolean> = {}
      for (const r of records) {
        if (r.type === 'bbt') bbt[r.record_date] = (r.value as { temp: number }).temp
        else if (r.type === 'ovulation_test') ovulation[r.record_date] = (r.value as { positive: boolean }).positive
        else if (r.type === 'intimacy') intimacy[r.record_date] = true
      }
      setBbtRecords(bbt)
      setOvulationTests(ovulation)
      setIntimacyDates(intimacy)
    })
  }, [])
  const toggleIntimacy = (date: string) => {
    // 미래 날짜 하트 방지
    if (new Date(date) > new Date()) { showToast('미래 날짜는 기록할 수 없어요'); return }
    const next = { ...intimacyDates, [date]: !intimacyDates[date] }
    if (!next[date]) delete next[date]
    setIntimacyDates(next)
    if (next[date]) upsertPrepRecord(date, 'intimacy', {})
    else deletePrepRecord(date, 'intimacy')
    showToast(next[date] ? '함께한 날 기록!' : '기록 취소')
  }
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_preparing_checks'); return s ? JSON.parse(s) : {}
    }
    return {}
  })
  const [journals, setJournals] = useState<{ text: string; date: string; comment?: string }[]>([])
  const [journalText, setJournalText] = useState('')
  const [journalSheetOpen, setJournalSheetOpen] = useState(false)

  const saveJournal = () => {
    if (!journalText.trim()) return
    const savedText = journalText.trim()
    const entryDate = new Date().toISOString()
    const _d = new Date()
    const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`
    const fallback = '오늘도 도담하게 잘 기다리고 있어요 🌱'
    // 즉시 fallback comment로 저장
    const entry = { text: savedText, date: entryDate, comment: fallback }
    setJournals(prev => {
      const next = [entry, ...prev]
      try {
        localStorage.setItem('dodam_prep_journal', JSON.stringify(next))
        const tsMap = JSON.parse(localStorage.getItem(`dodam_prep_ts_${today}`) || '{}')
        if (!tsMap['prep_journal']) { tsMap['prep_journal'] = entryDate; localStorage.setItem(`dodam_prep_ts_${today}`, JSON.stringify(tsMap)) }
        const done: string[] = JSON.parse(localStorage.getItem(`dodam_prep_done_${today}`) || '[]')
        if (!done.includes('prep_journal')) { done.push('prep_journal'); localStorage.setItem(`dodam_prep_done_${today}`, JSON.stringify(done)) }
      } catch {}
      return next
    })
    setJournalText('')
    setJournalSheetOpen(false)
    showToast('기다림 일기 저장됐어요 🌱')
    // AI 답장은 백그라운드에서 업데이트
    fetch('/api/ai-preparing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'diary', text: savedText }),
    }).then(r => r.json()).then(data => {
      if (!data.comment) return
      setJournals(prev => {
        const updated = prev.map(e => e.date === entryDate ? { ...e, comment: data.comment } : e)
        try { localStorage.setItem('dodam_prep_journal', JSON.stringify(updated)) } catch {}
        return updated
      })
    }).catch(() => {})
  }
  const [pregTests, setPregTests] = useState<{ date: string; result: string; dpo: number }[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    try { setJournals(JSON.parse(localStorage.getItem('dodam_prep_journal') || '[]')) } catch {}
  }, [])

  // prep_journal FAB → BottomNav에서 직접 처리

  const cycle = useMemo(() => {
    if (!lastPeriod) return null
    return getCycleInfo(lastPeriod, cycleLength)
  }, [lastPeriod, cycleLength])

  const now = new Date()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())
  const calDates = useMemo(() => {
    const dates: Date[] = []; const d = new Date(calYear, calMonth, 1)
    while (d.getMonth() === calMonth) { dates.push(new Date(d)); d.setDate(d.getDate() + 1) }
    return dates
  }, [calYear, calMonth])
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay()

  const getDateStatus = (date: Date): string => {
    if (!cycle) return 'none'
    const ds = formatDate(date)
    if (periodRecords[ds]) return 'period'
    for (const c of cycle.cycles) {
      if (ds === c.ovulation) return 'ovulation'
      if (ds >= c.fertileStart && ds <= c.fertileEnd) return 'fertile'
    }
    return 'none'
  }

  const toggleCheck = (id: string) => {
    const next = { ...checked, [id]: !checked[id] }; setChecked(next)
    localStorage.setItem('dodam_preparing_checks', JSON.stringify(next))
    const done = Object.values(next).filter(Boolean).length
    showToast(next[id] ? `체크 완료! (${done}/${checklist.length})` : '체크 취소')
  }

  const recordBBT = useCallback((date: string, temp: number) => {
    if (!temp || temp < 35 || temp > 38) return
    const next = { ...bbtRecords, [date]: temp }; setBbtRecords(next)
    upsertPrepRecord(date, 'bbt', { temp })
    showToast(`기초체온 ${temp.toFixed(2)}°C 기록!`)
  }, [bbtRecords]) // eslint-disable-line react-hooks/exhaustive-deps

  const recordOvulationTest = useCallback((date: string, positive: boolean) => {
    const next = { ...ovulationTests, [date]: positive }; setOvulationTests(next)
    upsertPrepRecord(date, 'ovulation_test', { positive })
    showToast(positive ? '배란 양성 기록!' : '배란 음성 기록')
  }, [ovulationTests]) // eslint-disable-line react-hooks/exhaustive-deps

  const [showPregConfirm, setShowPregConfirm] = useState(false)

  const addPregTest = (result: string) => {
    const date = new Date().toISOString().split('T')[0]
    const dpo = cycle ? Math.floor((Date.now() - cycle.ovulationDay.getTime()) / 86400000) : 0
    const next = [{ date, result, dpo }, ...pregTests]
    setPregTests(next)
    insertPrepRecord(date, 'preg_test', { result, dpo })
    if (result === '양성') {
      setShowPregConfirm(true)
    } else {
      showToast(result === '음성' ? '기록 완료. 다음에 꼭 될 거예요' : '흐린 양성 기록됨')
    }
  }

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      <div className="max-w-lg mx-auto w-full px-5 pt-5 pb-24 space-y-3">

        {/* ━━━ 히어로: 기다림의 감성 ━━━ */}
        {cycle && (() => {
          const today = new Date()
          const dpo = Math.floor((today.getTime() - cycle.ovulationDay.getTime()) / 86400000)
          const isWaiting = dpo >= 0 && dpo <= 14
          const todayStr = formatDate(today)
          const isFertile = cycle.cycles.some(c => todayStr >= c.fertileStart && todayStr <= c.fertileEnd)
          const daysToNext = Math.ceil((cycle.nextPeriod.getTime() - today.getTime()) / 86400000)

          return (
            <div className="bg-gradient-to-br from-white to-[#FFF8F3] rounded-xl border border-[#FFDDC8]/50 p-5 text-center">
              {isWaiting ? (
                <>
                  <div className="w-32 h-32 mx-auto mb-3 rounded-2xl overflow-hidden">
                    <video src="/images/illustrations/waiting-implant.webm" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  </div>
                  <p className="text-heading-3 text-primary">착상을 기다리는 중</p>
                  <p className="text-heading-1 text-[var(--color-primary)] mt-1">D+{dpo}</p>
                  <div className="w-full h-2 bg-[#E8E4DF] rounded-full mt-3 mb-2">
                    <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${Math.min((dpo / 14) * 100, 100)}%` }} />
                  </div>
                  <p className="text-body-emphasis text-secondary">
                    {dpo <= 3 ? '아직 이른 시기예요. 평소처럼 지내세요' :
                     dpo <= 7 ? '착상이 진행 중일 수 있어요. 무리하지 마세요' :
                     dpo <= 10 ? '조급해하지 않아도 돼요. 자신을 돌보세요' :
                     '빠르면 테스트 가능. 서두르지 않아도 괜찮아요'}
                  </p>
                </>
              ) : isFertile ? (
                <>
                  <div className="w-32 h-32 mx-auto mb-3 rounded-2xl overflow-hidden">
                    <video src="/images/illustrations/waiting-fertile.webm" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  </div>
                  <p className="text-heading-3 text-[var(--color-primary)]">지금 가임기예요</p>
                  <p className="text-body-emphasis text-secondary mt-2">가장 좋은 시기. 도담하게 준비하고 있어요</p>
                </>
              ) : (
                <>
                  <div className="w-32 h-32 mx-auto mb-3 rounded-2xl overflow-hidden">
                    <video src="/images/illustrations/waiting-rest.webm" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  </div>
                  <p className="text-heading-3 text-primary">다음 기회까지</p>
                  <p className="text-heading-1 text-[var(--color-primary)] mt-1">{daysToNext}일</p>
                  <p className="text-body-emphasis text-secondary mt-2">지금은 몸과 마음을 돌보는 시간이에요</p>
                </>
              )}
            </div>
          )
        })()}

        {/* ━━━ 임신 테스트 (항상 접근 가능) ━━━ */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <p className="text-body font-bold text-primary mb-2">임신 테스트</p>
          <div className="flex gap-2 mb-2">
            <button onClick={() => addPregTest('양성')} className="flex-1 py-2.5 rounded-xl bg-[#F0F9F4] text-body font-semibold text-[var(--color-primary)] active:opacity-80">양성 ✚</button>
            <button onClick={() => addPregTest('음성')} className="flex-1 py-2.5 rounded-xl bg-[var(--color-page-bg)] text-body font-semibold text-secondary active:opacity-80">음성 −</button>
          </div>
          {pregTests.length > 0 && (
            <div className="space-y-1">
              {pregTests.slice(0, 3).map((t, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-body text-secondary">{t.date} {t.dpo > 0 && `(D+${t.dpo})`}</span>
                  <span className={`text-body font-semibold ${t.result === '양성' ? 'text-[var(--color-primary)]' : 'text-secondary'}`}>{t.result}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ━━━ 기다림 일기 ━━━ */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-body-emphasis font-bold text-primary">기다림 일기</p>
              {journals.length > 0 && (
                <span className="text-label font-bold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}>
                  {journals.length}
                </span>
              )}
            </div>
            {journals.length > 0 && (
              <Link href="/prep-diary">
                <span className="text-body text-[var(--color-primary)] font-medium">전체보기 →</span>
              </Link>
            )}
          </div>
          {journals.length > 0 && (
            <div className="mb-3 p-3 bg-[var(--color-page-bg)] rounded-xl border border-[#E8E4DF]">
              <p className="text-label text-tertiary mb-1.5">
                {new Date(journals[0].date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </p>
              <p className="text-body text-primary leading-relaxed line-clamp-3">{journals[0].text}</p>
              {journals[0].comment && (
                <p className="text-caption text-[var(--color-primary)] mt-2 italic leading-relaxed">{journals[0].comment}</p>
              )}
            </div>
          )}
          <button onClick={() => setJournalSheetOpen(true)}
            className="w-full flex items-center gap-3 bg-[var(--color-page-bg)] rounded-xl p-3 active:bg-[#F0EDE8]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white border border-[#E8E4DF]">
              <PenIcon className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-body font-bold text-primary">오늘의 기다림 일기 쓰기</p>
              <p className="text-caption text-tertiary">
                {journals.length > 0 ? '새 일기 추가하기' : '기다림의 첫 일기를 남겨보세요'}
              </p>
            </div>
            <span className="text-tertiary text-sm">→</span>
          </button>
        </div>

        {/* 주기 캘린더 */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }} className="text-secondary px-3 py-1">←</button>
            <p className="text-body-emphasis font-bold text-primary">{calYear}년 {calMonth + 1}월</p>
            <button type="button" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }} className="text-secondary px-3 py-1">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => <div key={d} className="text-center text-body text-tertiary">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e-${i}`} className="aspect-square" />)}
            {calDates.map((date) => {
              const status = getDateStatus(date)
              const isToday = formatDate(date) === formatDate(now)
              const ds = formatDate(date)
              return (
                <button key={ds}
                  onClick={() => toggleIntimacy(ds)}
                  onContextMenu={(e) => { e.preventDefault(); setSelectedDate(ds) }}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => { setSelectedDate(ds); if (navigator.vibrate) navigator.vibrate(30) }, 500)
                    ;(e.target as HTMLElement).dataset.longpress = String(timer)
                  }}
                  onTouchEnd={(e) => { clearTimeout(Number((e.target as HTMLElement).dataset.longpress)) }}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-body-emphasis font-medium relative active:scale-95 transition-transform ${
                    isToday ? 'ring-2 ring-[var(--color-primary)]' : status === 'period' ? 'bg-[#FDE8E8] text-[#D08068]' : status === 'ovulation' ? 'bg-[var(--color-primary)] text-white' : status === 'fertile' ? 'bg-[var(--color-accent-bg)] text-[var(--color-primary)]' : 'bg-[#F0EDE8] text-primary'
                  }`}>
                  {intimacyDates[ds] ? <HeartIcon className="w-3.5 h-3.5 text-[#D08068]" /> : date.getDate()}
                  {(bbtRecords[ds] || ovulationTests[ds] !== undefined) && <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[var(--color-primary)]" />}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#FDE8E8]" /><span className="text-body text-secondary">생리</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent-bg)]" /><span className="text-body text-secondary">가임기</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-primary)]" /><span className="text-body text-secondary">배란일</span></div>
            <div className="flex items-center gap-1"><HeartIcon className="w-3.5 h-3.5 text-[#D08068]" /><span className="text-body text-secondary">함께한 날</span></div>
          </div>
          <p className="text-body text-tertiary text-center mt-2">날짜 탭 = 하트 토글 · 길게 누르면 체온/배란 기록</p>
        </div>

        {/* 날짜 기록 바텀시트 */}
        {selectedDate && (
          <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setSelectedDate(null)}>
            <div className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
              <div className="px-5 pb-5 space-y-3">
                <p className="text-subtitle text-primary">{selectedDate} 기록</p>
                <div className="flex items-center justify-between">
                  <span className="text-body-emphasis text-secondary">기초체온</span>
                  <input type="number" step="0.01" min="35" max="38" value={bbtRecords[selectedDate] || ''} onChange={(e) => recordBBT(selectedDate, Number(e.target.value))} placeholder="36.50" className="w-24 h-10 rounded-lg border border-[#E8E4DF] px-2 text-body-emphasis text-right" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-emphasis text-secondary">배란 테스트</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => recordOvulationTest(selectedDate, true)} className={`px-3 py-1.5 rounded-xl text-body ${ovulationTests[selectedDate] === true ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-secondary'}`}>양성</button>
                    <button onClick={() => recordOvulationTest(selectedDate, false)} className={`px-3 py-1.5 rounded-xl text-body ${ovulationTests[selectedDate] === false ? 'bg-[#D08068] text-white' : 'bg-[#E8E4DF] text-secondary'}`}>음성</button>
                  </div>
                </div>
                <button onClick={() => setSelectedDate(null)} className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl">완료</button>
              </div>
            </div>
          </div>
        )}

        {/* 양성 확인 모달 */}
        {showPregConfirm && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 mx-6 max-w-sm w-full text-center shadow-xl animate-[fadeIn_0.2s_ease-out]">
              <HeartIcon className="w-10 h-10 text-[var(--color-primary)] mx-auto" />
              <h3 className="text-heading-3 text-primary mt-3 mb-1">정말이에요?</h3>
              <p className="text-body text-secondary mb-5 leading-relaxed">
                양성이 확인되었어요!<br />
                임신 모드로 전환할까요?
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => { sharePositiveTest(); router.push('/celebration') }}
                  className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl active:opacity-80"
                >
                  네, 임신했어요!
                </button>
                <button
                  onClick={() => router.push('/celebration')}
                  className="w-full py-2.5 text-body text-[var(--color-primary)]"
                >
                  공유 없이 넘어가기
                </button>
                <button
                  onClick={() => setShowPregConfirm(false)}
                  className="w-full py-2 text-body-emphasis text-secondary"
                >
                  아직 확인이 더 필요해요
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 체크리스트 */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex justify-between mb-3">
            <p className="text-body-emphasis font-bold text-primary">준비 체크리스트</p>
            <p className="text-body text-secondary">{checklist.filter((c) => checked[c.id]).length}/{checklist.length}</p>
          </div>
          {checklist.map((item) => (
            <button key={item.id} onClick={() => toggleCheck(item.id)} className="w-full flex items-center gap-3 py-2 rounded-lg active:bg-[var(--color-page-bg)]">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked[item.id] ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[#AEB1B9]'}`}>
                {checked[item.id] && <span className="text-white text-body-emphasis">✓</span>}
              </div>
              <span className={`text-body ${checked[item.id] ? 'text-tertiary line-through' : 'text-primary'}`}>{item.icon} {item.title}</span>
            </button>
          ))}
        </div>

        {/* BBT 기초체온 차트 */}
        {Object.keys(bbtRecords).length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-3">기초체온 차트</p>
            <div className="h-32 flex items-end gap-px">
              {(() => {
                const sortedDates = Object.keys(bbtRecords).sort().slice(-14)
                const temps = sortedDates.map((d) => bbtRecords[d])
                const min = Math.min(...temps, 36.0)
                const max = Math.max(...temps, 37.0)
                const range = max - min || 0.5
                return sortedDates.map((d, i) => {
                  const t = bbtRecords[d]
                  const h = ((t - min) / range) * 80 + 16
                  const isHigh = t >= 36.7
                  return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-0.5">
                      <span className="text-label text-secondary">{t.toFixed(1)}</span>
                      <div
                        className={`w-full rounded-t transition-all ${isHigh ? 'bg-[var(--color-primary)]' : 'bg-[#4A9B6E]'}`}
                        style={{ height: `${h}px` }}
                      />
                      <span className="text-[9px] text-tertiary">{d.slice(8)}</span>
                    </div>
                  )
                })
              })()}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-label text-tertiary">저온기 (36.0~36.6)</span>
              <span className="text-label text-[var(--color-primary)]">고온기 (36.7+)</span>
            </div>
            {(() => {
              const sortedDates = Object.keys(bbtRecords).sort()
              const shiftIdx = sortedDates.findIndex((d, i) =>
                i > 0 && bbtRecords[d] >= 36.7 && bbtRecords[sortedDates[i - 1]] < 36.7
              )
              if (shiftIdx > 0) {
                return (
                  <p className="text-caption text-[var(--color-primary)] mt-1 font-medium">
                    체온 상승 전환일: {sortedDates[shiftIdx]} (배란 추정)
                  </p>
                )
              }
              return null
            })()}
          </div>
        )}

        {/* 주기 이력 */}
        {lastPeriod && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-3">주기 이력</p>
            {(() => {
              const records = Object.entries(periodRecords)
                .filter(([, v]) => v === 'start')
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 6)
              if (records.length < 2) return (
                <p className="text-body text-tertiary">생리 시작일이 2회 이상 기록되면 주기 분석이 표시됩니다.</p>
              )
              const gaps: number[] = []
              for (let i = 1; i < records.length; i++) {
                const diff = (new Date(records[i - 1][0]).getTime() - new Date(records[i][0]).getTime()) / 86400000
                gaps.push(Math.round(diff))
              }
              const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
              const minG = Math.min(...gaps)
              const maxG = Math.max(...gaps)
              return (
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <div className="flex-1 bg-[var(--color-page-bg)] rounded-lg p-2.5 text-center">
                      <p className="text-label text-secondary">평균 주기</p>
                      <p className="text-subtitle font-bold text-primary">{avg}일</p>
                    </div>
                    <div className="flex-1 bg-[var(--color-page-bg)] rounded-lg p-2.5 text-center">
                      <p className="text-label text-secondary">범위</p>
                      <p className="text-subtitle font-bold text-primary">{minG}~{maxG}일</p>
                    </div>
                    <div className="flex-1 bg-[var(--color-page-bg)] rounded-lg p-2.5 text-center">
                      <p className="text-label text-secondary">기록</p>
                      <p className="text-subtitle font-bold text-primary">{records.length}회</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {records.slice(0, 4).map(([date], i) => (
                      <div key={date} className="flex justify-between text-body">
                        <span className="text-secondary">{date}</span>
                        {i < gaps.length && <span className="text-primary font-medium">{gaps[i]}일 주기</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* 정부 지원 · 혜택 */}
        <BenefitTabs />
      </div>

      {/* 기다림 일기 바텀시트 */}
      {journalSheetOpen && (
        <div className="fixed inset-0 z-[200] bg-black/40" onClick={() => setJournalSheetOpen(false)}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
            <div className="px-5 pb-5">
              <p className="text-subtitle text-primary mb-3 flex items-center gap-1.5"><PenIcon className="w-4 h-4" /> 기다림 일기</p>
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mb-3">
                {['아이에게 한마디', '오늘의 감사', '나에게 응원', '임신 기원', '기다림의 마음'].map(chip => (
                  <button key={chip} onClick={() => setJournalText(prev => prev ? prev + ' ' + chip : chip)}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--color-accent-bg)] text-caption font-medium text-[var(--color-primary)]">{chip}</button>
                ))}
              </div>
              <textarea value={journalText} onChange={e => setJournalText(e.target.value.slice(0, 500))}
                placeholder="아직 만나지 못한 아이에게, 오늘의 마음을 전해요"
                className="w-full h-28 text-body-emphasis p-3 bg-[#F5F1EC] rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" autoFocus />
              <p className="text-right text-caption text-tertiary mt-1">{journalText.length}/500</p>
              <button onClick={saveJournal} disabled={!journalText.trim()}
                className={`w-full py-3.5 rounded-xl text-subtitle mt-2 ${journalText.trim() ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-tertiary'}`}>
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-[#1A1918]/80 text-white text-body font-medium px-4 py-2.5 rounded-xl shadow-lg animate-[fadeIn_0.15s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  )
}

// ===== 임신 중 기다림 페이지 =====
// ===== 주차별 발달 가이드 — 세로형, 현재 중심 =====
const WEEK_GUIDE = [
  { w: '4~7', size: '/images/illustrations/f1.webm', name: '콩알', baby: '심장 뛰기 시작', mom: '입덧 시작, 피로감', check: '첫 초음파, 엽산 복용' },
  { w: '8~11', size: '/images/illustrations/f2.webm', name: '딸기', baby: '손가락/발가락 형성', mom: '입덧 절정', check: '기형아 검사 (11주~)' },
  { w: '12~15', size: '/images/illustrations/f3.webm', name: '레몬', baby: '성별 구분 가능', mom: '입덧 완화, 안정기', check: '목덜미 투명대 검사' },
  { w: '16~19', size: '/images/illustrations/f4.webm', name: '아보카도', baby: '태동 느낌 시작', mom: '배가 나오기 시작', check: '쿼드 검사, 태교여행 적기' },
  { w: '20~23', size: '/images/illustrations/f5.webm', name: '망고', baby: '청각 발달, 소리 반응', mom: '태동 뚜렷', check: '정밀 초음파 (20주)' },
  { w: '24~27', size: '/images/illustrations/f6.webm', name: '옥수수', baby: '눈 뜨기 시작', mom: '요통, 부종', check: '임신성 당뇨 검사' },
  { w: '28~31', size: '/images/illustrations/f7.webm', name: '코코넛', baby: '폐 성숙 진행', mom: '숨참, 잦은 소변', check: '백일해 접종, 출산 준비' },
  { w: '32~35', size: '/images/illustrations/f8.webm', name: '파인애플', baby: '머리 아래로 전환', mom: '가진통 시작', check: '출산 가방, 산후조리원' },
  { w: '36~40', size: '/images/illustrations/f9.webm', name: '수박', baby: '출생 준비 완료', mom: '이슬/진통', check: '매주 검진, 진통 타이머' },
]

// 높이 상수
const SEL_H = 88    // 활성 항목 높이
const NON_H = 48    // 비활성 항목 높이
const GAP = 5       // 항목 간 gap
// 가시 영역: 활성 1 + 상하 인접 각 1개 + 클리핑
const CONTAINER_H = SEL_H + (NON_H + GAP) * 2 + Math.floor((NON_H + GAP) * 0.4)

function VerticalFetalGuide({ currentWeek }: { currentWeek: number }) {
  const currentIdx = useMemo(() => {
    const idx = WEEK_GUIDE.findIndex(g => {
      const [start, end] = g.w.split('~').map(Number)
      return currentWeek >= start && currentWeek <= end
    })
    return idx === -1 ? 0 : idx
  }, [currentWeek])

  const [selectedIdx, setSelectedIdx] = useState(currentIdx)
  useEffect(() => { setSelectedIdx(currentIdx) }, [currentIdx])

  // 터치 스와이프
  const touchStartY = useRef(0)
  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(dy) < 20) return
    if (dy > 0) setSelectedIdx(i => Math.min(i + 1, WEEK_GUIDE.length - 1))
    else setSelectedIdx(i => Math.max(i - 1, 0))
  }

  // 활성 항목이 컨테이너 중앙에 오도록 translateY 계산
  const translateY = useMemo(() => {
    // 각 항목 top = i*(NON_H+GAP), 단 selectedIdx 이후는 SEL_H 반영
    const itemTop = (i: number) => {
      if (i <= selectedIdx) return i * (NON_H + GAP)
      return selectedIdx * (NON_H + GAP) + SEL_H + GAP + (i - selectedIdx - 1) * (NON_H + GAP)
    }
    const center = CONTAINER_H / 2
    const selCenter = itemTop(selectedIdx) + SEL_H / 2
    return center - selCenter
  }, [selectedIdx])

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
      <p className="text-body-emphasis font-bold text-primary px-4 pt-4 pb-2">주차별 발달 가이드</p>
      <div className="relative overflow-hidden px-3 pb-3" style={{ height: CONTAINER_H }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* 상단 페이드 */}
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none" style={{ height: 36, background: 'linear-gradient(to bottom, white 0%, transparent 100%)' }} />
        {/* 하단 페이드 */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none" style={{ height: 36, background: 'linear-gradient(to top, white 0%, transparent 100%)' }} />

        <div
          style={{ transform: `translateY(${translateY}px)`, transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)', willChange: 'transform' }}
        >
          {WEEK_GUIDE.map((item, idx) => {
            const { w, size, name, baby, mom, check } = item
            const isSelected = idx === selectedIdx
            const isCurrent = idx === currentIdx
            const dist = Math.abs(idx - selectedIdx)
            const opacity = dist === 0 ? 1 : dist === 1 ? 0.75 : dist === 2 ? 0.45 : 0.2

            return (
              <div
                key={w}
                onClick={() => setSelectedIdx(idx)}
                className="cursor-pointer rounded-xl transition-all duration-300"
                style={{
                  height: isSelected ? SEL_H : NON_H,
                  marginBottom: GAP,
                  opacity,
                  overflow: 'hidden',
                  background: isSelected ? '#E8F5EE' : '#FAFAFA',
                  boxShadow: isSelected ? '0 0 0 2px rgba(var(--color-primary-rgb,80,160,120),0.25)' : 'none',
                }}
              >
                <div className={`flex items-center gap-2.5 px-3 h-full`}>
                  <IllustVideo
                    src={size}
                    variant="icon"
                    className={`shrink-0 transition-all duration-300 ${isSelected ? 'w-14 h-14' : 'w-9 h-9'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold transition-all duration-300 ${isSelected ? 'text-body text-[var(--color-primary)]' : 'text-caption text-secondary'}`}>
                        {w}주 · {name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded-full font-bold">지금</span>
                      )}
                    </div>
                    {isSelected ? (
                      <div className="mt-1">
                        <p className="text-label text-[#4A4744]">아기: {baby}</p>
                        <p className="text-label text-secondary">엄마: {mom}</p>
                        <p className="text-label text-[var(--color-primary)] font-medium">체크: {check}</p>
                      </div>
                    ) : (
                      <p className="text-label text-tertiary mt-0.5 truncate">{baby}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// WaitingBenefitTabs → 공유 컴포넌트로 이동됨 (BenefitTabs)
const WaitingBenefitTabs = BenefitTabs

export function PregnantWaitingPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'diary' | 'info' | 'benefit'>('diary')
  const [foodQuery, setFoodQuery] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [chosenNickname, setChosenNickname2] = useState<string>('')
  useEffect(() => {
    getProfile().then(p => { if (p?.chosen_nickname) setChosenNickname2(p.chosen_nickname) })
    getSecure('dodam_due_date').then(v => { if (v) setDueDate(v) })
  }, [])
  const currentWeek = (() => {
    if (!dueDate) return 0
    const ms = new Date(dueDate).getTime()
    if (isNaN(ms)) return 0
    const diff = Math.floor((ms - Date.now()) / 86400000)
    return Math.max(1, Math.min(42, 40 - Math.floor(diff / 7)))
  })()
  const daysLeft = (() => {
    if (!dueDate) return 0
    const ms = new Date(dueDate).getTime()
    if (isNaN(ms)) return 0
    return Math.max(0, Math.floor((ms - Date.now()) / 86400000))
  })()
  const trimester = currentWeek <= 13 ? '초기' : currentWeek <= 27 ? '중기' : '후기'

  // 기다림 일기
  const [diaries, setDiaries] = useState<{ text: string; date: string; mood: string; comment: string }[]>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_diary') || '[]') } catch { return [] } }
    return []
  })
  const [diaryText, setDiaryText] = useState('')
  const [diarySaving, setDiarySaving] = useState(false)
  const [diarySheetOpen, setDiarySheetOpen] = useState(false)

  // FAB에서 preg_journal 저장 시 목록 동기화
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.type === 'preg_journal') {
        try { setDiaries(JSON.parse(localStorage.getItem('dodam_preg_diary') || '[]')) } catch {}
      }
    }
    window.addEventListener('dodam-record', handler)
    return () => window.removeEventListener('dodam-record', handler)
  }, [])

  const saveDiary = async () => {
    if (!diaryText.trim()) return
    setDiarySaving(true)
    let comment = '오늘도 도담하게 잘 지내고 있어요'
    try {
      const res = await fetch('/api/ai-pregnant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'diary', text: diaryText, week: currentWeek, mood: '' }),
      })
      const data = await res.json()
      if (data.comment) comment = data.comment
    } catch { /* fallback */ }
    const entry = { text: diaryText.trim(), date: new Date().toISOString(), mood: '', comment }
    const next = [entry, ...diaries]
    setDiaries(next); localStorage.setItem('dodam_preg_diary', JSON.stringify(next))
    setDiaryText(''); setDiarySaving(false)
  }

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      <div className="max-w-lg mx-auto w-full px-5 pt-5 pb-24 space-y-3">
        {/* 출산 확인 (D-day 지남) */}
        {daysLeft <= 0 && (
          <Link href="/birth" className="block bg-gradient-to-r from-[#FFF0E6] to-[#FFF8F3] rounded-xl border border-[#FFDDC8] p-5 text-center active:opacity-80">
            <IllustVideo src="/images/illustrations/h1.webm" variant="circle" className="w-20 h-20 mx-auto mb-2" />
            <p className="text-subtitle font-bold text-primary">{chosenNickname || '우리 아이'}, 만났나요?</p>
            <p className="text-body font-semibold text-[var(--color-primary)] mt-2">네, 만났어요! →</p>
          </Link>
        )}

        {/* 히어로 — 아이를 만나는 날 */}
        {daysLeft <= 0 ? (
          <div className="relative rounded-2xl border border-[#FFDDC8]/60 overflow-hidden p-6 text-center"
            style={{ background: 'linear-gradient(135deg, #FFF8F3 0%, #FFEEE0 100%)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 35%, rgba(255,160,100,0.18) 0%, transparent 70%)' }} />
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full animate-ping"
                style={{ background: 'radial-gradient(circle, rgba(255,140,80,0.25) 0%, transparent 70%)', animationDuration: '2.4s' }} />
              <div className="absolute -inset-3 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,160,100,0.22) 0%, transparent 65%)' }} />
              <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-[var(--color-primary)]/30 shadow-lg">
                <video src="/images/illustrations/h1.webm" autoPlay loop muted playsInline className="w-full h-full object-cover scale-110" />
                <div className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, transparent 45%, rgba(255,240,228,0.55) 100%)' }} />
              </div>
            </div>
            <p className="text-[19px] font-bold text-primary relative">만날 날이 지났어요!</p>
            <p className="text-[30px] font-bold text-[var(--color-primary)] mt-1 relative">D+{Math.abs(daysLeft)}</p>
            <p className="text-body text-[#9B7060] mt-1 relative">{currentWeek}주차 · {trimester}</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-white to-[#FFF8F3] rounded-xl border border-[#FFDDC8]/50 p-5 text-center">
            <video src="/images/illustrations/h1.webm" autoPlay loop muted playsInline className="w-16 h-16 object-contain mx-auto mb-2" />
            <p className="text-heading-3 text-primary">{daysLeft <= 7 ? '이번 주에 만나요!' : '아이를 만나는 날'}</p>
            <p className="text-heading-1 font-bold text-[var(--color-primary)] mt-1">D-{daysLeft}</p>
            <div className="w-full h-2 bg-[#E8E4DF] rounded-full mt-3">
              <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${Math.min((currentWeek / 40) * 100, 100)}%` }} />
            </div>
            <p className="text-body-emphasis text-secondary mt-2">{currentWeek}주차 · {trimester} · {Math.min(Math.round((currentWeek / 40) * 100), 100)}%</p>
          </div>
        )}

        {/* ━━━ 탭 네비게이션 ━━━ */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
          <div className="flex border-b border-[#E8E4DF]">
            {([
              { key: 'diary' as const, label: '일기·감성' },
              { key: 'info' as const, label: '발달·정보' },
              { key: 'benefit' as const, label: '혜택·준비' },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 text-caption font-semibold text-center relative transition-colors ${
                  tab === t.key ? 'text-[var(--color-primary)] bg-[var(--color-accent-bg)]/30' : 'text-tertiary'
                }`}>
                {t.label}
                {tab === t.key && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--color-primary)] rounded-full" />}
              </button>
            ))}
          </div>

          {/* ── 탭 1: 일기·감성 ── */}
          {tab === 'diary' && (
            <div className="p-3 space-y-3">
              {/* 기다림 일기 */}
              <div className="bg-[var(--color-page-bg)] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-body font-bold text-primary">기다림 일기</p>
                    {diaries.length > 0 && (
                      <span className="text-label font-bold text-white px-1.5 py-0.5 rounded-full bg-[var(--color-primary)]">{diaries.length}</span>
                    )}
                  </div>
                  {diaries.length > 0 && (
                    <Link href="/preg-diary"><span className="text-caption text-[var(--color-primary)] font-medium">전체보기 →</span></Link>
                  )}
                </div>
                {diaries.length > 0 && (
                  <div className="mb-2 p-2.5 bg-white rounded-lg border border-[#E8E4DF]">
                    <p className="text-label text-tertiary mb-1">{new Date(diaries[0].date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</p>
                    <p className="text-body text-primary leading-relaxed line-clamp-2">{diaries[0].text}</p>
                    {diaries[0].comment && <p className="text-caption text-[var(--color-primary)] mt-1 italic">{diaries[0].comment}</p>}
                  </div>
                )}
                <button onClick={() => setDiarySheetOpen(true)}
                  className="w-full flex items-center gap-2.5 bg-white rounded-xl p-3 active:bg-[#F0EDE8] border border-[#E8E4DF]">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--color-page-bg)] border border-[#E8E4DF] shrink-0">
                    <PenIcon className="w-4 h-4 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-body font-bold text-primary">오늘의 기다림 일기 쓰기</p>
                    <p className="text-caption text-tertiary">{diaries.length > 0 ? '새 일기 추가하기' : '오늘의 첫 기다림 일기를 남겨보세요'}</p>
                  </div>
                  <span className="text-tertiary text-sm">→</span>
                </button>
              </div>

              {/* 이름 짓기 */}
              <Link href="/name" className="flex items-center gap-3 bg-[var(--color-page-bg)] rounded-xl p-3 active:bg-[#F0EDE8]">
                <SparkleIcon className="w-5 h-5 text-[#C4913E] shrink-0" />
                <div className="flex-1">
                  <p className="text-body font-semibold text-primary">이름 짓기</p>
                  <p className="text-caption text-secondary">AI 추천 · 한자 · 음양오행</p>
                </div>
                <span className="text-tertiary">→</span>
              </Link>

              {/* 마음 체크 */}
              <Link href="/mental-check" className="block bg-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-3 text-center active:opacity-80">
                <p className="text-body text-[var(--color-primary)] font-semibold">마음 체크 — 오늘 기분은 어때요?</p>
              </Link>

              {/* 재미 콘텐츠 */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { href: '/fortune', Icon: ActivityIcon, title: '바이오리듬' },
                  { href: '/fortune?tab=zodiac', Icon: CompassIcon, title: '띠 · 별자리' },
                  { href: '/fortune?tab=fortune', Icon: SparkleIcon, title: '오늘의 운세' },
                ] as const).map(item => (
                  <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5 bg-[var(--color-page-bg)] rounded-xl py-3 px-2 active:opacity-80">
                    <item.Icon className="w-5 h-5 text-secondary" />
                    <p className="text-caption font-semibold text-primary text-center leading-tight">{item.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── 탭 2: 발달·정보 ── */}
          {tab === 'info' && (
            <div className="p-3 space-y-3">
              <VerticalFetalGuide currentWeek={currentWeek} />
              {currentWeek > 0 && <HospitalGuide week={currentWeek} />}
              <AIMealCard mode="pregnant" value={currentWeek} />
              <form onSubmit={e => { e.preventDefault(); if (foodQuery.trim()) router.push(`/food-check?q=${encodeURIComponent(foodQuery.trim())}`) }}
                className="flex items-center gap-2 bg-[var(--color-page-bg)] rounded-xl border border-[#E8E4DF] p-2.5">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                  <span className="text-subtitle">🍽️</span>
                </div>
                <input type="text" value={foodQuery} onChange={e => setFoodQuery(e.target.value)}
                  placeholder="이 음식 먹어도 되나요? 검색"
                  className="flex-1 text-body bg-transparent outline-none text-primary placeholder:text-tertiary" />
                {foodQuery.trim() ? (
                  <button type="submit" className="shrink-0 px-3 py-1 rounded-lg bg-[var(--color-primary)] text-white text-caption font-semibold">확인</button>
                ) : (
                  <span className="text-caption text-tertiary shrink-0">AI 확인</span>
                )}
              </form>
            </div>
          )}

          {/* ── 탭 3: 혜택·준비 ── */}
          {tab === 'benefit' && (
            <div className="p-3 space-y-3">
              <WaitingBenefitTabs />
              {currentWeek >= 12 && <BabyItemChecklist currentWeek={currentWeek} />}
            </div>
          )}
        </div>
      </div>

      {/* 기다림 일기 바텀시트 */}
      {diarySheetOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setDiarySheetOpen(false)}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
            <div className="px-5 pb-5">
              <p className="text-subtitle text-primary mb-3 flex items-center gap-1.5"><PenIcon className="w-4 h-4" /> 기다림 일기</p>
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mb-3">
                {['아이에게 한마디', '태동 느낌', '들려준 음악', '맛있는 음식', '산책/외출'].map(text => (
                  <button key={text} onClick={() => setDiaryText(prev => prev ? prev : text + ' ')}
                    className="shrink-0 px-2.5 py-1.5 rounded-full bg-[var(--color-page-bg)] text-caption text-secondary">
                    {text}
                  </button>
                ))}
              </div>
              <textarea value={diaryText} onChange={e => setDiaryText(e.target.value.slice(0, 500))}
                placeholder={`${currentWeek}주차, 오늘 아이에게 하고 싶은 말이 있나요?`}
                className="w-full h-28 text-body-emphasis p-3 bg-[#F5F1EC] rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" autoFocus />
              <p className="text-right text-caption text-tertiary mt-1">{diaryText.length}/500</p>
              <button onClick={() => { saveDiary(); setDiarySheetOpen(false) }} disabled={!diaryText.trim() || diarySaving}
                className={`w-full py-3.5 rounded-xl text-subtitle mt-2 ${diaryText.trim() && !diarySaving ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-tertiary'}`}>
                {diarySaving ? 'AI 코멘트 생성 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 모드 기반 dispatcher — hydration-safe =====
export default function WaitingPage() {
  const [appMode, setAppMode] = useState<string | null>(null)
  useEffect(() => {
    setAppMode(localStorage.getItem('dodam_mode') || 'preparing')
  }, [])
  if (appMode === null) return null
  if (appMode === 'pregnant') return <PregnantWaitingPage />
  return <PreparingWaitingPage />
}
