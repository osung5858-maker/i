'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { shareLetter, sharePositiveTest } from '@/lib/kakao/share'

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
  { id: 'folic', icon: '💊', title: '엽산 복용', desc: '임신 3개월 전부터' },
  { id: 'checkup', icon: '🏥', title: '산전 건강검진', desc: '혈액·소변·풍진항체' },
  { id: 'dental', icon: '🦷', title: '치과 검진', desc: '임신 중 치료 어려우니 미리' },
  { id: 'vaccine', icon: '💉', title: '예방접종 확인', desc: '풍진·수두·A형간염' },
  { id: 'weight', icon: '⚖️', title: '적정 체중', desc: 'BMI 18.5~24.9' },
  { id: 'nosmoking', icon: '🚭', title: '금연·금주', desc: '3개월 전부터' },
  { id: 'exercise', icon: '🏃‍♀️', title: '규칙적 운동', desc: '주 3회' },
  { id: 'stress', icon: '🧘', title: '스트레스 관리', desc: '충분한 수면·명상' },
]

const GOV_SUPPORTS = [
  { title: '난임부부 시술비 지원', desc: '체외수정 최대 110만원 · 인공수정 최대 30만원', link: 'https://www.gov.kr/portal/service/serviceInfo/SME000000100' },
  { title: '임신 사전건강관리', desc: '보건소 무료 산전검사 · 풍진/빈혈 검사', link: 'https://www.mohw.go.kr/menu.es?mid=a10711020200' },
  { title: '엽산제·철분제 무료', desc: '보건소 등록 시 무료 제공', link: 'https://www.gov.kr/portal/service/serviceInfo/SD0000016094' },
  { title: '난임 원스톱 서비스', desc: '시술비·심리상담 통합 지원', link: 'https://www.gov.kr/portal/onestopSvc/Infertility' },
  { title: '맘편한임신 통합신청', desc: '임신 후 각종 지원 한번에 신청', link: 'https://www.gov.kr/portal/onestopSvc/fertility' },
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function WaitingPage() {
  const router = useRouter()
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
        '엄마 아빠의 마음이 별빛처럼 따뜻하게 닿고 있어요. 곧 그 품에 안길게요 ⭐',
        '아직 작은 씨앗이지만, 매일 조금씩 엄마 아빠를 닮아가고 있어요 🌱',
        '매일 보내주는 사랑, 꼭꼭 모아두고 있어요. 만나면 다 돌려줄게요 🎁',
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
  }

  const recordBBT = useCallback((date: string, temp: number) => {
    const next = { ...bbtRecords, [date]: temp }; setBbtRecords(next)
    localStorage.setItem('dodam_bbt_records', JSON.stringify(next))
  }, [bbtRecords])

  const recordOvulationTest = useCallback((date: string, positive: boolean) => {
    const next = { ...ovulationTests, [date]: positive }; setOvulationTests(next)
    localStorage.setItem('dodam_ovulation_tests', JSON.stringify(next))
  }, [ovulationTests])

  const [showPregConfirm, setShowPregConfirm] = useState(false)

  const addPregTest = (result: string) => {
    const dpo = cycle ? Math.floor((Date.now() - cycle.ovulationDay.getTime()) / 86400000) : 0
    const next = [{ date: new Date().toISOString().split('T')[0], result, dpo }, ...pregTests]
    setPregTests(next); localStorage.setItem('dodam_preg_tests', JSON.stringify(next))
    if (result === '양성') {
      setShowPregConfirm(true)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">기다림</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28 space-y-3">

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
                  <p className="text-3xl mb-2">🤞</p>
                  <p className="text-[18px] font-bold text-[#1A1918]">착상을 기다리는 중</p>
                  <p className="text-[24px] font-bold text-[#3D8A5A] mt-1">D+{dpo}</p>
                  <div className="w-full h-2 bg-[#F0F0F0] rounded-full mt-3 mb-2">
                    <div className="h-full bg-[#3D8A5A] rounded-full transition-all" style={{ width: `${Math.min((dpo / 14) * 100, 100)}%` }} />
                  </div>
                  <p className="text-[12px] text-[#868B94]">
                    {dpo <= 3 ? '아직 이른 시기예요. 평소처럼 지내세요' :
                     dpo <= 7 ? '착상이 진행 중일 수 있어요. 무리하지 마세요' :
                     dpo <= 10 ? '조급해하지 않아도 돼요. 자신을 돌보세요' :
                     '빠르면 테스트 가능. 서두르지 않아도 괜찮아요'}
                  </p>
                </>
              ) : isFertile ? (
                <>
                  <p className="text-3xl mb-2">💫</p>
                  <p className="text-[18px] font-bold text-[#3D8A5A]">지금 가임기예요</p>
                  <p className="text-[12px] text-[#868B94] mt-2">가장 좋은 시기. 도담하게 준비하고 있어요</p>
                </>
              ) : (
                <>
                  <p className="text-3xl mb-2">🌙</p>
                  <p className="text-[18px] font-bold text-[#1A1918]">다음 기회까지</p>
                  <p className="text-[24px] font-bold text-[#3D8A5A] mt-1">{daysToNext}일</p>
                  <p className="text-[12px] text-[#868B94] mt-2">지금은 몸과 마음을 돌보는 시간이에요</p>
                </>
              )}
            </div>
          )
        })()}

        {/* ━━━ 임신 테스트 (항상 접근 가능) ━━━ */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[13px] font-bold text-[#1A1918] mb-2">🤰 임신 테스트</p>
          <div className="flex gap-2 mb-2">
            <button onClick={() => addPregTest('양성')} className="flex-1 py-2.5 rounded-xl bg-[#F0F9F4] text-[13px] font-semibold text-[#3D8A5A] active:opacity-80">양성 ✚</button>
            <button onClick={() => addPregTest('음성')} className="flex-1 py-2.5 rounded-xl bg-[#F5F4F1] text-[13px] font-semibold text-[#868B94] active:opacity-80">음성 −</button>
          </div>
          {pregTests.length > 0 && (
            <div className="space-y-1">
              {pregTests.slice(0, 3).map((t, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-[11px] text-[#868B94]">{t.date} {t.dpo > 0 && `(D+${t.dpo})`}</span>
                  <span className={`text-[11px] font-semibold ${t.result === '양성' ? 'text-[#3D8A5A]' : 'text-[#868B94]'}`}>{t.result}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ━━━ 편지 ━━━ */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold text-[#1A1918]">✉️ 아이에게</p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{letters.length >= 30 ? '🌳' : letters.length >= 10 ? '🌿' : '🌱'}</span>
              <span className="text-[10px] text-[#868B94]">{letters.length}통</span>
            </div>
          </div>
          {letters.slice(0, 2).map((l, i) => (
            <div key={i} className="mb-2">
              <div className="p-3 bg-[#F0F9F4] rounded-xl rounded-bl-sm">
                <p className="text-[12px] text-[#1A1918] line-clamp-3">{l.text}</p>
                <p className="text-[9px] text-[#AEB1B9] mt-1 text-right">{l.from} · {new Date(l.date).toLocaleDateString('ko-KR')}</p>
              </div>
              <div className="p-3 bg-[#FFF8F3] rounded-xl rounded-tr-sm mt-1 ml-6">
                <p className="text-[12px] text-[#1A1918]">💌 {l.reply}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[9px] text-[#AEB1B9]">아이의 답장</p>
                  <button onClick={() => shareLetter(l.text, l.reply, letters.length - i)} className="text-[9px] text-[#3D8A5A] font-medium">카톡 공유</button>
                </div>
              </div>
            </div>
          ))}
          {letterOpen ? (
            <div>
              <textarea value={letterText} onChange={(e) => setLetterText(e.target.value.slice(0, 500))} placeholder="아이에게 하고 싶은 말..." className="w-full h-20 text-[13px] p-3 bg-[#F5F4F1] rounded-xl resize-none focus:outline-none" autoFocus />
              <div className="flex justify-between mt-2">
                <button onClick={() => setLetterOpen(false)} className="text-[12px] text-[#868B94]">취소</button>
                <button onClick={saveLetter} disabled={!letterText.trim() || letterSaving} className={`text-[12px] font-semibold px-3 py-1 rounded-lg ${letterText.trim() && !letterSaving ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#AEB1B9]'}`}>
                  {letterSaving ? 'AI가 답장 쓰는 중...' : '보내기'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setLetterOpen(true)} className="w-full py-2.5 text-[13px] font-semibold text-[#3D8A5A] bg-[#F0F9F4] rounded-xl">오늘의 편지 쓰기 ✉️</button>
          )}
        </div>

        {/* 주기 캘린더 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }} className="text-[#868B94] px-3 py-1">←</button>
            <p className="text-[14px] font-bold text-[#1A1918]">{calYear}년 {calMonth + 1}월</p>
            <button type="button" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }} className="text-[#868B94] px-3 py-1">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => <div key={d} className="text-center text-[9px] text-[#AEB1B9]">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e-${i}`} className="aspect-square" />)}
            {calDates.map((date) => {
              const status = getDateStatus(date)
              const isToday = formatDate(date) === formatDate(now)
              const ds = formatDate(date)
              return (
                <button key={ds} onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium ${
                    isToday ? 'ring-2 ring-[#3D8A5A]' : status === 'period' ? 'bg-[#FDE8E8] text-[#D08068]' : status === 'ovulation' ? 'bg-[#3D8A5A] text-white' : status === 'fertile' ? 'bg-[#C8F0D8] text-[#3D8A5A]' : 'bg-[#F7F8FA] text-[#1A1918]'
                  }`}>{date.getDate()}</button>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#FDE8E8]" /><span className="text-[9px] text-[#868B94]">생리</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#C8F0D8]" /><span className="text-[9px] text-[#868B94]">가임기</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#3D8A5A]" /><span className="text-[9px] text-[#868B94]">배란일</span></div>
          </div>
        </div>

        {selectedDate && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <p className="text-[13px] font-semibold text-[#1A1918] mb-3">{selectedDate}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#868B94]">기초체온</span>
                <input type="number" step="0.01" min="35" max="38" value={bbtRecords[selectedDate] || ''} onChange={(e) => recordBBT(selectedDate, Number(e.target.value))} placeholder="36.50" className="w-20 h-8 rounded-lg border border-[#f0f0f0] px-2 text-[12px] text-right" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#868B94]">배란 테스트</span>
                <div className="flex gap-1.5">
                  <button onClick={() => recordOvulationTest(selectedDate, true)} className={`px-3 py-1 rounded-lg text-[11px] ${ovulationTests[selectedDate] === true ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#868B94]'}`}>양성</button>
                  <button onClick={() => recordOvulationTest(selectedDate, false)} className={`px-3 py-1 rounded-lg text-[11px] ${ovulationTests[selectedDate] === false ? 'bg-[#D08068] text-white' : 'bg-[#F0F0F0] text-[#868B94]'}`}>음성</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 양성 확인 모달 */}
        {showPregConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 mx-6 max-w-sm w-full text-center shadow-xl">
              <span className="text-4xl">🥹</span>
              <h3 className="text-[18px] font-bold text-[#1A1918] mt-3 mb-1">정말이에요?</h3>
              <p className="text-[13px] text-[#868B94] mb-5 leading-relaxed">
                양성이 확인되었어요!<br />
                임신 모드로 전환할까요?
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => { sharePositiveTest(); router.push('/celebration') }}
                  className="w-full py-3 bg-[#3D8A5A] text-white text-[14px] font-semibold rounded-xl active:opacity-80"
                >
                  네, 임신했어요! 💛
                </button>
                <button
                  onClick={() => router.push('/celebration')}
                  className="w-full py-2.5 text-[13px] text-[#3D8A5A]"
                >
                  공유 없이 넘어가기
                </button>
                <button
                  onClick={() => setShowPregConfirm(false)}
                  className="w-full py-2 text-[12px] text-[#868B94]"
                >
                  아직 확인이 더 필요해요
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 체크리스트 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex justify-between mb-3">
            <p className="text-[14px] font-bold text-[#1A1918]">준비 체크리스트</p>
            <p className="text-[11px] text-[#868B94]">{CHECKLIST.filter((c) => checked[c.id]).length}/{CHECKLIST.length}</p>
          </div>
          {CHECKLIST.map((item) => (
            <button key={item.id} onClick={() => toggleCheck(item.id)} className="w-full flex items-center gap-3 py-2 rounded-lg active:bg-[#F5F4F1]">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked[item.id] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#AEB1B9]'}`}>
                {checked[item.id] && <span className="text-white text-[10px]">✓</span>}
              </div>
              <span className={`text-[13px] ${checked[item.id] ? 'text-[#AEB1B9] line-through' : 'text-[#1A1918]'}`}>{item.icon} {item.title}</span>
            </button>
          ))}
        </div>

        {/* 정부 지원 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-3">정부 지원</p>
          {GOV_SUPPORTS.map((item) => (
            <div key={item.title} className="p-3 bg-[#F5F4F1] rounded-xl mb-2 last:mb-0">
              <p className="text-[13px] font-semibold text-[#1A1918]">{item.title}</p>
              <p className="text-[11px] text-[#868B94]">{item.desc}</p>
              <a href={item.link} target="_blank" className="text-[10px] text-[#3D8A5A] mt-1 inline-block">자세히 보기 →</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
