'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { shareLetter, sharePositiveTest } from '@/lib/kakao/share'
import { HeartIcon, PenIcon, SparkleIcon, EnvelopeIcon, PregnantIcon, MoonIcon, BabyIcon, ActivityIcon, CompassIcon, SproutIcon, ExternalLinkIcon } from '@/components/ui/Icons'
import IllustVideo from '@/components/ui/IllustVideo'
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

const CHECKLIST = [
  { id: 'folic', icon: '', title: '엽산 복용', desc: '임신 3개월 전부터' },
  { id: 'checkup', icon: '', title: '산전 건강검진', desc: '혈액·소변·풍진항체' },
  { id: 'dental', icon: '', title: '치과 검진', desc: '임신 중 치료 어려우니 미리' },
  { id: 'vaccine', icon: '', title: '예방접종 확인', desc: '풍진·수두·A형간염' },
  { id: 'weight', icon: '', title: '적정 체중', desc: 'BMI 18.5~24.9' },
  { id: 'nosmoking', icon: '', title: '금연·금주', desc: '3개월 전부터' },
  { id: 'exercise', icon: '', title: '규칙적 운동', desc: '주 3회' },
  { id: 'stress', icon: '', title: '스트레스 관리', desc: '충분한 수면·명상' },
]

const GOV_SUPPORTS = [
  { title: '난임부부 시술비 지원', desc: '체외수정 최대 110만원 · 인공수정 최대 30만원', link: 'https://www.gov.kr/portal/service/serviceInfo/SME000000100' },
  { title: '임신 사전건강관리', desc: '보건소 무료 산전검사 · 풍진/빈혈 검사', link: 'https://www.mohw.go.kr/menu.es?mid=a10711020200' },
  { title: '엽산제·철분제 무료', desc: '보건소 등록 시 무료 제공', link: 'https://www.gov.kr/portal/service/serviceInfo/SD0000016094' },
  { title: '난임 원스톱 서비스', desc: '시술비·심리상담 통합 지원', link: 'https://www.gov.kr/portal/onestopSvc/Infertility' },
  { title: '맘편한임신 통합신청', desc: '임신 후 각종 지원 한번에 신청', link: 'https://www.gov.kr/portal/onestopSvc/fertility' },
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function haptic() { if (navigator.vibrate) navigator.vibrate(20) }

export default function WaitingPage() {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); haptic(); setTimeout(() => setToast(null), 2000) }

  const [appMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_mode') || 'preparing'
    return 'preparing'
  })

  // 임신 중 모드일 때는 임신 중 전용 기다림 페이지
  if (appMode === 'pregnant') return <PregnantWaitingPage />

  const [lastPeriod] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_last_period') || ''
    return ''
  })
  const [cycleLength] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('dodam_cycle_length')) || 28
    return 28
  })
  const [periodRecords] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_period_records'); return s ? JSON.parse(s) : {}
    }
    return {}
  })
  const [bbtRecords, setBbtRecords] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_bbt_records'); return s ? JSON.parse(s) : {}
    }
    return {}
  })
  const [ovulationTests, setOvulationTests] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_ovulation_tests'); return s ? JSON.parse(s) : {}
    }
    return {}
  })
  const [intimacyDates, setIntimacyDates] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_intimacy_dates'); return s ? JSON.parse(s) : {}
    }
    return {}
  })
  const toggleIntimacy = (date: string) => {
    // 미래 날짜 하트 방지
    if (new Date(date) > new Date()) { showToast('미래 날짜는 기록할 수 없어요'); return }
    const next = { ...intimacyDates, [date]: !intimacyDates[date] }
    if (!next[date]) delete next[date]
    setIntimacyDates(next)
    localStorage.setItem('dodam_intimacy_dates', JSON.stringify(next))
    showToast(next[date] ? '함께한 날 기록!' : '기록 취소')
  }
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_preparing_checks'); return s ? JSON.parse(s) : {}
    }
    return {}
  })
  const [letters, setLetters] = useState<{ text: string; date: string; from: string; reply: string }[]>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_letters'); return s ? JSON.parse(s) : []
    }
    return []
  })
  const [letterText, setLetterText] = useState('')
  const [letterOpen, setLetterOpen] = useState(false)
  const [pregTests, setPregTests] = useState<{ date: string; result: string; dpo: number }[]>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_preg_tests'); return s ? JSON.parse(s) : []
    }
    return []
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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

  const [letterSaving, setLetterSaving] = useState(false)

  const saveLetter = async () => {
    if (!letterText.trim() || letterSaving) return
    setLetterSaving(true)

    // AI 답장 시도
    let reply = ''
    try {
      const res = await fetch('/api/ai-preparing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'letter', letterText: letterText.trim(), letterCount: letters.length }),
      })
      const data = await res.json()
      reply = data.reply || ''
    } catch { /* fallback */ }

    // AI 실패 시 폴백
    if (!reply) {
      const fallback = [
        '엄마 아빠의 마음이 별빛처럼 따뜻하게 닿고 있어요. 곧 그 품에 안길게요.',
        '아직 작은 씨앗이지만, 매일 조금씩 엄마 아빠를 닮아가고 있어요.',
        '매일 보내주는 사랑, 꼭꼭 모아두고 있어요. 만나면 다 돌려줄게요.',
      ]
      reply = fallback[Math.floor(Math.random() * fallback.length)]
    }

    const next = [{ text: letterText.trim(), date: new Date().toISOString(), from: '엄마', reply }, ...letters]
    setLetters(next); localStorage.setItem('dodam_letters', JSON.stringify(next))
    setLetterText(''); setLetterOpen(false); setLetterSaving(false)
  }

  const toggleCheck = (id: string) => {
    const next = { ...checked, [id]: !checked[id] }; setChecked(next)
    localStorage.setItem('dodam_preparing_checks', JSON.stringify(next))
    const done = Object.values(next).filter(Boolean).length
    showToast(next[id] ? `체크 완료! (${done}/${CHECKLIST.length})` : '체크 취소')
  }

  const recordBBT = useCallback((date: string, temp: number) => {
    if (!temp || temp < 35 || temp > 38) return
    const next = { ...bbtRecords, [date]: temp }; setBbtRecords(next)
    localStorage.setItem('dodam_bbt_records', JSON.stringify(next))
    showToast(`기초체온 ${temp.toFixed(2)}°C 기록!`)
  }, [bbtRecords]) // eslint-disable-line react-hooks/exhaustive-deps

  const recordOvulationTest = useCallback((date: string, positive: boolean) => {
    const next = { ...ovulationTests, [date]: positive }; setOvulationTests(next)
    localStorage.setItem('dodam_ovulation_tests', JSON.stringify(next))
    showToast(positive ? '배란 양성 기록!' : '배란 음성 기록')
  }, [ovulationTests]) // eslint-disable-line react-hooks/exhaustive-deps

  const [showPregConfirm, setShowPregConfirm] = useState(false)

  const addPregTest = (result: string) => {
    const dpo = cycle ? Math.floor((Date.now() - cycle.ovulationDay.getTime()) / 86400000) : 0
    const next = [{ date: new Date().toISOString().split('T')[0], result, dpo }, ...pregTests]
    setPregTests(next); localStorage.setItem('dodam_preg_tests', JSON.stringify(next))
    if (result === '양성') {
      setShowPregConfirm(true)
    } else {
      showToast(result === '음성' ? '기록 완료. 다음에 꼭 될 거예요' : '흐린 양성 기록됨')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <div className="max-w-lg mx-auto w-full px-5 pt-5 pb-28 space-y-3">

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
                  <p className="text-[18px] font-bold text-[#1A1918]">착상을 기다리는 중</p>
                  <p className="text-[24px] font-bold text-[var(--color-primary)] mt-1">D+{dpo}</p>
                  <div className="w-full h-2 bg-[#E8E4DF] rounded-full mt-3 mb-2">
                    <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${Math.min((dpo / 14) * 100, 100)}%` }} />
                  </div>
                  <p className="text-[14px] text-[#6B6966]">
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
                  <p className="text-[18px] font-bold text-[var(--color-primary)]">지금 가임기예요</p>
                  <p className="text-[14px] text-[#6B6966] mt-2">가장 좋은 시기. 도담하게 준비하고 있어요</p>
                </>
              ) : (
                <>
                  <div className="w-32 h-32 mx-auto mb-3 rounded-2xl overflow-hidden">
                    <video src="/images/illustrations/waiting-rest.webm" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[18px] font-bold text-[#1A1918]">다음 기회까지</p>
                  <p className="text-[24px] font-bold text-[var(--color-primary)] mt-1">{daysToNext}일</p>
                  <p className="text-[14px] text-[#6B6966] mt-2">지금은 몸과 마음을 돌보는 시간이에요</p>
                </>
              )}
            </div>
          )
        })()}

        {/* ━━━ 임신 테스트 (항상 접근 가능) ━━━ */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <p className="text-[13px] font-bold text-[#1A1918] mb-2">임신 테스트</p>
          <div className="flex gap-2 mb-2">
            <button onClick={() => addPregTest('양성')} className="flex-1 py-2.5 rounded-xl bg-[#F0F9F4] text-[13px] font-semibold text-[var(--color-primary)] active:opacity-80">양성 ✚</button>
            <button onClick={() => addPregTest('음성')} className="flex-1 py-2.5 rounded-xl bg-[var(--color-page-bg)] text-[13px] font-semibold text-[#6B6966] active:opacity-80">음성 −</button>
          </div>
          {pregTests.length > 0 && (
            <div className="space-y-1">
              {pregTests.slice(0, 3).map((t, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-[13px] text-[#6B6966]">{t.date} {t.dpo > 0 && `(D+${t.dpo})`}</span>
                  <span className={`text-[13px] font-semibold ${t.result === '양성' ? 'text-[var(--color-primary)]' : 'text-[#6B6966]'}`}>{t.result}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ━━━ 편지 ━━━ */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold text-[#1A1918] flex items-center gap-1"><EnvelopeIcon className="w-3.5 h-3.5" /> 아이에게</p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{letters.length >= 30 ? '+++' : letters.length >= 10 ? '++' : '+'}</span>
              <span className="text-[14px] text-[#6B6966]">{letters.length}통</span>
            </div>
          </div>
          {letters.slice(0, 2).map((l, i) => (
            <div key={i} className="mb-2">
              <div className="p-3 bg-[#F0F9F4] rounded-xl rounded-bl-sm">
                <p className="text-[14px] text-[#1A1918] line-clamp-3">{l.text}</p>
                <p className="text-[13px] text-[#9E9A95] mt-1 text-right">{l.from} · {new Date(l.date).toLocaleDateString('ko-KR')}</p>
              </div>
              <div className="p-3 bg-[#FFF8F3] rounded-xl rounded-tr-sm mt-1 ml-6">
                <p className="text-[14px] text-[#1A1918]">{l.reply}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[13px] text-[#9E9A95]">아이의 답장</p>
                  <button onClick={() => shareLetter(l.text, l.reply, letters.length - i)} className="text-[13px] text-[var(--color-primary)] font-medium">카톡 공유</button>
                </div>
              </div>
            </div>
          ))}
          {letterOpen ? (
            <div>
              <textarea value={letterText} onChange={(e) => setLetterText(e.target.value.slice(0, 500))} placeholder="아이에게 하고 싶은 말..." className="w-full h-20 text-[13px] p-3 bg-[var(--color-page-bg)] rounded-xl resize-none focus:outline-none" autoFocus />
              <div className="flex justify-between mt-2">
                <button onClick={() => setLetterOpen(false)} className="text-[14px] text-[#6B6966]">취소</button>
                <button onClick={saveLetter} disabled={!letterText.trim() || letterSaving} className={`text-[14px] font-semibold px-3 py-1 rounded-lg ${letterText.trim() && !letterSaving ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-[#9E9A95]'}`}>
                  {letterSaving ? 'AI가 답장 쓰는 중...' : '보내기'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setLetterOpen(true)} className="w-full py-2.5 text-[13px] font-semibold text-[var(--color-primary)] bg-[#F0F9F4] rounded-xl">오늘의 편지 쓰기</button>
          )}
        </div>

        {/* 주기 캘린더 */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }} className="text-[#6B6966] px-3 py-1">←</button>
            <p className="text-[14px] font-bold text-[#1A1918]">{calYear}년 {calMonth + 1}월</p>
            <button type="button" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }} className="text-[#6B6966] px-3 py-1">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => <div key={d} className="text-center text-[13px] text-[#9E9A95]">{d}</div>)}
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
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[14px] font-medium relative active:scale-95 transition-transform ${
                    isToday ? 'ring-2 ring-[var(--color-primary)]' : status === 'period' ? 'bg-[#FDE8E8] text-[#D08068]' : status === 'ovulation' ? 'bg-[var(--color-primary)] text-white' : status === 'fertile' ? 'bg-[var(--color-accent-bg)] text-[var(--color-primary)]' : 'bg-[#F0EDE8] text-[#1A1918]'
                  }`}>
                  {intimacyDates[ds] ? <HeartIcon className="w-3.5 h-3.5 text-[#D08068]" /> : date.getDate()}
                  {(bbtRecords[ds] || ovulationTests[ds] !== undefined) && <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[var(--color-primary)]" />}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#FDE8E8]" /><span className="text-[13px] text-[#6B6966]">생리</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent-bg)]" /><span className="text-[13px] text-[#6B6966]">가임기</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-primary)]" /><span className="text-[13px] text-[#6B6966]">배란일</span></div>
            <div className="flex items-center gap-1"><HeartIcon className="w-3.5 h-3.5 text-[#D08068]" /><span className="text-[13px] text-[#6B6966]">함께한 날</span></div>
          </div>
          <p className="text-[13px] text-[#9E9A95] text-center mt-2">날짜 탭 = 하트 토글 · 길게 누르면 체온/배란 기록</p>
        </div>

        {/* 날짜 기록 바텀시트 */}
        {selectedDate && (
          <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setSelectedDate(null)}>
            <div className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
              <div className="px-5 pb-5 space-y-3">
                <p className="text-[15px] font-bold text-[#1A1918]">{selectedDate} 기록</p>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#6B6966]">기초체온</span>
                  <input type="number" step="0.01" min="35" max="38" value={bbtRecords[selectedDate] || ''} onChange={(e) => recordBBT(selectedDate, Number(e.target.value))} placeholder="36.50" className="w-24 h-10 rounded-lg border border-[#E8E4DF] px-2 text-[14px] text-right" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#6B6966]">배란 테스트</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => recordOvulationTest(selectedDate, true)} className={`px-3 py-1.5 rounded-xl text-[13px] ${ovulationTests[selectedDate] === true ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-[#6B6966]'}`}>양성</button>
                    <button onClick={() => recordOvulationTest(selectedDate, false)} className={`px-3 py-1.5 rounded-xl text-[13px] ${ovulationTests[selectedDate] === false ? 'bg-[#D08068] text-white' : 'bg-[#E8E4DF] text-[#6B6966]'}`}>음성</button>
                  </div>
                </div>
                <button onClick={() => setSelectedDate(null)} className="w-full py-3 bg-[var(--color-primary)] text-white text-[14px] font-bold rounded-xl">완료</button>
              </div>
            </div>
          </div>
        )}

        {/* 양성 확인 모달 */}
        {showPregConfirm && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 mx-6 max-w-sm w-full text-center shadow-xl animate-[fadeIn_0.2s_ease-out]">
              <HeartIcon className="w-10 h-10 text-[var(--color-primary)] mx-auto" />
              <h3 className="text-[18px] font-bold text-[#1A1918] mt-3 mb-1">정말이에요?</h3>
              <p className="text-[13px] text-[#6B6966] mb-5 leading-relaxed">
                양성이 확인되었어요!<br />
                임신 모드로 전환할까요?
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => { sharePositiveTest(); router.push('/celebration') }}
                  className="w-full py-3 bg-[var(--color-primary)] text-white text-[14px] font-semibold rounded-xl active:opacity-80"
                >
                  네, 임신했어요!
                </button>
                <button
                  onClick={() => router.push('/celebration')}
                  className="w-full py-2.5 text-[13px] text-[var(--color-primary)]"
                >
                  공유 없이 넘어가기
                </button>
                <button
                  onClick={() => setShowPregConfirm(false)}
                  className="w-full py-2 text-[14px] text-[#6B6966]"
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
            <p className="text-[14px] font-bold text-[#1A1918]">준비 체크리스트</p>
            <p className="text-[13px] text-[#6B6966]">{CHECKLIST.filter((c) => checked[c.id]).length}/{CHECKLIST.length}</p>
          </div>
          {CHECKLIST.map((item) => (
            <button key={item.id} onClick={() => toggleCheck(item.id)} className="w-full flex items-center gap-3 py-2 rounded-lg active:bg-[var(--color-page-bg)]">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked[item.id] ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[#AEB1B9]'}`}>
                {checked[item.id] && <span className="text-white text-[14px]">✓</span>}
              </div>
              <span className={`text-[13px] ${checked[item.id] ? 'text-[#9E9A95] line-through' : 'text-[#1A1918]'}`}>{item.icon} {item.title}</span>
            </button>
          ))}
        </div>

        {/* BBT 기초체온 차트 */}
        {Object.keys(bbtRecords).length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-[14px] font-bold text-[#1A1918] mb-3">기초체온 차트</p>
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
                      <span className="text-[10px] text-[#6B6966]">{t.toFixed(1)}</span>
                      <div
                        className={`w-full rounded-t transition-all ${isHigh ? 'bg-[var(--color-primary)]' : 'bg-[#4A9B6E]'}`}
                        style={{ height: `${h}px` }}
                      />
                      <span className="text-[9px] text-[#9E9A95]">{d.slice(8)}</span>
                    </div>
                  )
                })
              })()}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[11px] text-[#9E9A95]">저온기 (36.0~36.6)</span>
              <span className="text-[11px] text-[var(--color-primary)]">고온기 (36.7+)</span>
            </div>
            {(() => {
              const sortedDates = Object.keys(bbtRecords).sort()
              const shiftIdx = sortedDates.findIndex((d, i) =>
                i > 0 && bbtRecords[d] >= 36.7 && bbtRecords[sortedDates[i - 1]] < 36.7
              )
              if (shiftIdx > 0) {
                return (
                  <p className="text-[12px] text-[var(--color-primary)] mt-1 font-medium">
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
            <p className="text-[14px] font-bold text-[#1A1918] mb-3">주기 이력</p>
            {(() => {
              const records = Object.entries(periodRecords)
                .filter(([, v]) => v === 'start')
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 6)
              if (records.length < 2) return (
                <p className="text-[13px] text-[#9E9A95]">생리 시작일이 2회 이상 기록되면 주기 분석이 표시됩니다.</p>
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
                      <p className="text-[11px] text-[#6B6966]">평균 주기</p>
                      <p className="text-[16px] font-bold text-[#1A1918]">{avg}일</p>
                    </div>
                    <div className="flex-1 bg-[var(--color-page-bg)] rounded-lg p-2.5 text-center">
                      <p className="text-[11px] text-[#6B6966]">범위</p>
                      <p className="text-[16px] font-bold text-[#1A1918]">{minG}~{maxG}일</p>
                    </div>
                    <div className="flex-1 bg-[var(--color-page-bg)] rounded-lg p-2.5 text-center">
                      <p className="text-[11px] text-[#6B6966]">기록</p>
                      <p className="text-[16px] font-bold text-[#1A1918]">{records.length}회</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {records.slice(0, 4).map(([date], i) => (
                      <div key={date} className="flex justify-between text-[13px]">
                        <span className="text-[#6B6966]">{date}</span>
                        {i < gaps.length && <span className="text-[#1A1918] font-medium">{gaps[i]}일 주기</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* 정부 지원 */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-3">정부 지원</p>
          {GOV_SUPPORTS.map((item) => (
            <div key={item.title} className="p-3 bg-[var(--color-page-bg)] rounded-xl mb-2 last:mb-0">
              <p className="text-[13px] font-semibold text-[#1A1918]">{item.title}</p>
              <p className="text-[13px] text-[#6B6966]">{item.desc}</p>
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[var(--color-primary)] mt-1 inline-flex items-center gap-1">자세히 보기 <ExternalLinkIcon className="w-3 h-3" /></a>
            </div>
          ))}
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-[#1A1918]/80 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-lg animate-[fadeIn_0.15s_ease-out]">
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

function VerticalFetalGuide({ currentWeek }: { currentWeek: number }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef<HTMLDivElement>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const currentIdx = useMemo(() => {
    const idx = WEEK_GUIDE.findIndex(g => {
      const [start, end] = g.w.split('~').map(Number)
      return currentWeek >= start && currentWeek <= end
    })
    return idx === -1 ? 0 : idx
  }, [currentWeek])

  // 초기 스크롤: 현재 단계를 가운데로
  useEffect(() => {
    setTimeout(() => {
      currentRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' })
    }, 50)
  }, [currentIdx])

  const handleTap = (i: number) => {
    if (i === currentIdx) return // 현재 단계는 항상 열려있음
    setExpandedIdx(prev => prev === i ? null : i)
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
      <p className="text-[14px] font-bold text-[#1A1918] px-4 pt-4 pb-2">주차별 발달 가이드</p>

      {/* 상하 그라데이션 */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          className="overflow-y-auto px-4 py-2 space-y-2"
          style={{ maxHeight: '400px' }}
        >
          {WEEK_GUIDE.map((g, i) => {
            const dist = Math.abs(i - currentIdx)
            const isCurrent = i === currentIdx
            const isAdjacent = dist === 1
            const isFar = dist >= 2
            const isExpanded = expandedIdx === i

            // 확장된 항목은 인접 단계처럼 보이도록
            const effectiveOpacity = isCurrent ? 1 : isExpanded ? 1 : isAdjacent ? 0.85 : 0.5
            const effectiveScale = isCurrent ? 1 : isExpanded ? 1 : isAdjacent ? 0.97 : 0.93
            const showDetail = isCurrent || isExpanded

            return (
              <div
                key={g.w}
                ref={isCurrent ? currentRef : undefined}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  opacity: effectiveOpacity,
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'center',
                }}
                onClick={() => handleTap(i)}
              >
                <div className={`p-3 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-[#E8F5EE] ring-2 ring-[var(--color-primary)]/30'
                    : isExpanded
                      ? 'bg-[#F5F3F0] ring-1 ring-[#D5D0CA]'
                      : 'bg-[#FAFAFA]'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <IllustVideo src={g.size} variant="icon" className={`shrink-0 transition-all duration-300 ${isCurrent || isExpanded ? 'w-16 h-16' : isAdjacent ? 'w-12 h-12' : 'w-8 h-8'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${isCurrent ? 'text-[13px] text-[var(--color-primary)]' : 'text-[12px] text-[#6B6966]'}`}>
                          {g.w}주 · {g.name}
                        </span>
                        {isCurrent && <span className="text-[9px] bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded-full font-bold">지금</span>}
                        {!isCurrent && !isExpanded && (isFar) && <span className="text-[10px] text-[#9E9A95]">탭하여 보기</span>}
                      </div>

                      {/* 상세 정보: 현재 단계 또는 확장된 항목 */}
                      {showDetail && (
                        <div className="mt-1.5">
                          <p className="text-[12px] text-[#4A4744]">아기: {g.baby}</p>
                          <p className="text-[12px] text-[#6B6966]">엄마: {g.mom}</p>
                          <p className="text-[12px] text-[var(--color-primary)] font-medium">체크: {g.check}</p>
                        </div>
                      )}

                      {/* 인접 단계(확장 안 됨): 아기 정보만 */}
                      {!showDetail && isAdjacent && (
                        <p className="text-[11px] text-[#9E9A95] mt-0.5">{g.baby}</p>
                      )}
                    </div>
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

// ===== 기다림 페이지 — 혜택 3탭 =====
function WaitingBenefitTabs() {
  const [tab, setTab] = useState<'money' | 'health' | 'box'>('money')

  const TABS = [
    { key: 'money' as const, label: '카드/급여' },
    { key: 'health' as const, label: '의료/건강' },
    { key: 'box' as const, label: '축하박스/기타' },
  ]

  const moneyItems = [
    { t: '국민행복카드', d: '임신 1회당 100만원 (다태아 140만원)', u: 'https://www.gov.kr/portal/onestopSvc/fertility' },
    { t: '첫만남이용권', d: '첫째 200만원 · 둘째 이상 300만원', u: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050455' },
    { t: '부모급여', d: '0세 월 100만원 · 1세 월 50만원', u: 'https://www.gov.kr/portal/service/serviceInfo/SD0000054655' },
    { t: '아동수당', d: '만 8세 미만 월 10만원', u: 'https://www.gov.kr/portal/service/serviceInfo/135200000120' },
    { t: '난임 시술비 지원', d: '체외수정 최대 110만원 · 인공수정 30만원', u: 'https://www.gov.kr/portal/service/serviceInfo/SME000000100' },
    { t: '다자녀 전기요금 할인', d: '3자녀 이상 30% 감면', u: 'https://www.gov.kr/portal/service/serviceInfo/SD0000022936' },
    { t: '맘편한임신 통합신청', d: '각종 지원 한번에 신청', u: 'https://www.gov.kr/portal/onestopSvc/fertility' },
  ]

  const healthItems = [
    { t: '엽산·철분제 무료', d: '보건소 등록 시 무료 제공', u: 'https://www.gov.kr/portal/service/serviceInfo/SD0000016094' },
    { t: '임산부 건강관리', d: '보건소 무료 산전검사 · 풍진/빈혈', u: 'https://www.mohw.go.kr/menu.es?mid=a10711020200' },
    { t: '영유아 건강검진', d: '생후 14일~72개월 무료 검진', u: 'https://www.nhis.or.kr/nhis/healthin/wbhace04200m01.do' },
    { t: '고위험 임산부 의료비', d: '의료비 90% 지원 (소득 무관)', u: 'https://www.gov.kr/portal/service/serviceInfo/135200000114' },
    { t: '산후도우미 서비스', d: '정부 바우처 산후도우미', u: 'https://www.gov.kr/portal/onestopSvc/happyBirth' },
  ]

  const boxItems = [
    { t: '베베폼 축하박스', d: '임신/출산 선물 꾸러미', u: 'https://bebeform.co.kr/giftbox/' },
    { t: '맘큐 하기스 허그박스', d: '기저귀 · 물티슈 · 산모용품', u: 'https://www.momq.co.kr/event/202004180005#hugboxEventTop' },
    { t: '베베킹 축하박스', d: '매월 200명 선물 증정', u: 'https://bebeking.co.kr/theme/bbk2026/contents/bebebox.php' },
    { t: '더블하트 더블박스', d: '약 20만원 상당 육아 필수템', u: 'https://m.doubleheart.co.kr/board/event/read.html?no=43417&board_no=8' },
    { t: '맘스다이어리 맘스팩', d: '임산부 맞춤 샘플 박스', u: 'https://event.momsdiary.co.kr/com_event/momspack/2026/3m/index.html?' },
    { t: '베베숲 마음박스', d: '임신 · 출산 축하 선물 꾸러미', u: 'https://www.bebesup.co.kr/proc/heartbox' },
    { t: '페넬로페 더 퍼스트 박스', d: '신생아 첫 선물 박스', u: 'https://pf.kakao.com/_dxfaRxd/103498627' },
    { t: '맘스팩', d: '매월 임산부 박스 발송', u: 'https://www.momspack.co.kr/' },
  ]

  const items = tab === 'money' ? moneyItems : tab === 'health' ? healthItems : boxItems

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
      <div className="flex border-b border-[#E8E4DF]">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-[12px] font-semibold text-center relative transition-colors ${
              tab === t.key ? 'text-[var(--color-primary)] bg-[var(--color-accent-bg)]/30' : 'text-[#9E9A95]'
            }`}>
            {t.label}
            {tab === t.key && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--color-primary)] rounded-full" />}
          </button>
        ))}
      </div>
      <div className="p-3 max-h-[320px] overflow-y-auto space-y-1.5">
        {items.map(it => (
          <a key={it.t} href={it.u} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-2.5 bg-[var(--color-page-bg)] rounded-xl active:bg-[#E8E4DF]">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1A1918]">{it.t}</p>
              <p className="text-[11px] text-[#6B6966]">{it.d}</p>
            </div>
            <ExternalLinkIcon className="w-3.5 h-3.5 text-[#9E9A95] shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}

export function PregnantWaitingPage() {
  const dueDate = typeof window !== 'undefined' ? localStorage.getItem('dodam_due_date') || '' : ''
  const currentWeek = (() => {
    if (!dueDate) return 0
    const diff = Math.floor((new Date(dueDate).getTime() - Date.now()) / 86400000)
    return Math.max(1, Math.min(42, 40 - Math.floor(diff / 7)))
  })()
  const daysLeft = dueDate ? Math.max(0, Math.floor((new Date(dueDate).getTime() - Date.now()) / 86400000)) : 0
  const trimester = currentWeek <= 13 ? '초기' : currentWeek <= 27 ? '중기' : '후기'

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <div className="max-w-lg mx-auto w-full px-5 pt-5 pb-28 space-y-3">
        {/* 출산 확인 (D-day 지남) */}
        {daysLeft <= 0 && (
          <Link href="/birth" className="block bg-gradient-to-r from-[#FFF0E6] to-[#FFF8F3] rounded-xl border border-[#FFDDC8] p-5 text-center active:opacity-80">
            <IllustVideo src="/images/illustrations/h1.webm" variant="circle" className="w-20 h-20 mx-auto mb-2" />
            <p className="text-[16px] font-bold text-[#1A1918]">우리 아이, 만났나요?</p>
            <p className="text-[13px] font-semibold text-[var(--color-primary)] mt-2">네, 만났어요! →</p>
          </Link>
        )}

        {/* 히어로 — 아이를 만나는 날 */}
        <div className="bg-gradient-to-br from-white to-[#FFF8F3] rounded-xl border border-[#FFDDC8]/50 p-5 text-center">
          <video src="/images/illustrations/h1.webm" autoPlay loop muted playsInline className="w-16 h-16 object-contain mx-auto mb-2" />
          <p className="text-[18px] font-bold text-[#1A1918]">{daysLeft <= 0 ? '만날 날이 지났어요!' : daysLeft <= 7 ? '이번 주에 만나요!' : '아이를 만나는 날'}</p>
          <p className="text-[28px] font-bold text-[var(--color-primary)] mt-1">{daysLeft <= 0 ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`}</p>
          <div className="w-full h-2 bg-[#E8E4DF] rounded-full mt-3">
            <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${(currentWeek / 40) * 100}%` }} />
          </div>
          <p className="text-[14px] text-[#6B6966] mt-2">{currentWeek}주차 · {trimester} · {Math.round((currentWeek / 40) * 100)}%</p>
        </div>

        {/* 태교 일기 바로가기 */}
        <Link href="/pregnant" className="block bg-white rounded-xl border border-[#E8E4DF] p-4 active:bg-[var(--color-page-bg)]">
          <div className="flex items-center gap-3">
            <PenIcon className="w-6 h-6 text-[#6B6966]" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[#1A1918]">오늘의 태교일기</p>
              <p className="text-[14px] text-[#6B6966]">아이에게 한마디 남겨보세요</p>
            </div>
            <span className="text-[#9E9A95]">→</span>
          </div>
        </Link>

        {/* 이름 짓기 */}
        <Link href="/name" className="block bg-white rounded-xl border border-[#E8E4DF] p-4 active:bg-[var(--color-page-bg)]">
          <div className="flex items-center gap-3">
            <SparkleIcon className="w-6 h-6 text-[#C4913E]" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[#1A1918]">이름 짓기</p>
              <p className="text-[14px] text-[#6B6966]">AI 추천 · 한자 · 음양오행</p>
            </div>
            <span className="text-[#9E9A95]">→</span>
          </div>
        </Link>

        {/* 주차별 발달 가이드 — 세로형 (현재 중심, 전후 축소) */}
        <VerticalFetalGuide currentWeek={currentWeek} />

        {/* 정부 지원 · 혜택 — 3탭 */}
        <WaitingBenefitTabs />

        {/* 재미 콘텐츠 */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <p className="text-[13px] font-bold text-[#1A1918] mb-2">재미</p>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/fortune" className="block bg-[var(--color-page-bg)] rounded-lg p-3 text-center active:opacity-80">
              <ActivityIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
              <p className="text-[14px] font-semibold text-[#1A1918]">바이오리듬</p>
            </Link>
            <Link href="/fortune?tab=zodiac" className="block bg-[var(--color-page-bg)] rounded-lg p-3 text-center active:opacity-80">
              <CompassIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
              <p className="text-[14px] font-semibold text-[#1A1918]">띠 · 별자리</p>
            </Link>
            <Link href="/fortune?tab=fortune" className="block bg-[var(--color-page-bg)] rounded-lg p-3 text-center active:opacity-80">
              <SparkleIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
              <p className="text-[14px] font-semibold text-[#1A1918]">오늘의 운세</p>
            </Link>
          </div>
        </div>

        {/* 마음 체크 */}
        <Link href="/mental-check" className="block bg-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-3 text-center active:opacity-80">
          <p className="text-[14px] text-[var(--color-primary)] font-semibold">마음 체크 — 오늘 기분은 어때요?</p>
        </Link>
      </div>
    </div>
  )
}
