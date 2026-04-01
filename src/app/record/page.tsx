'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import IllustVideo from '@/components/ui/IllustVideo'
import type { Child, GrowthRecord, CareEvent } from '@/types'
import { PregnantWaitingPage } from '@/app/waiting/page'
import dynamic from 'next/dynamic'

const LoadingSpinner = () => <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" /></div>

// Lazy load heavy components
const WaitingPage = dynamic(() => import('@/app/waiting/page'), { loading: LoadingSpinner })
const StatsReport = dynamic(() => import('@/components/growth-chart/StatsReport'), { loading: LoadingSpinner })
const DevelopmentCheck = dynamic(() => import('@/components/growth-chart/DevelopmentCheck'), { loading: LoadingSpinner })
const GrowthTimelapse = dynamic(() => import('@/components/growth-chart/GrowthTimelapse'), { loading: LoadingSpinner })
const CommunityComparison = dynamic(() => import('@/components/growth-chart/CommunityComparison'), { loading: LoadingSpinner })
const GrowthStory = dynamic(() => import('@/components/growth-chart/GrowthStory'), { loading: LoadingSpinner })
const SiblingCompare = dynamic(() => import('@/components/growth-chart/SiblingCompare'), { loading: LoadingSpinner })

// ===== 임신 중 기록 히스토리 =====
function PregnantRecord() {
  const [tab, setTab] = useState<'daily' | 'diary' | 'journey'>('daily')

  const MOOD_LABEL: Record<string, string> = { happy: '행복', calm: '평온', anxious: '불안', sick: '입덧', tired: '피곤' }
  const MOOD_COLOR: Record<string, string> = { happy: '#FF8FAB', calm: '#90C8A8', anxious: '#FFC078', sick: '#B8A0D4', tired: '#8EB4D4' }

  // 날짜 인덱스: preg_events 키 기반으로 최근 30일 스캔
  const dailyHistory = useMemo(() => {
    const results: { date: string; events: any[]; mood: string; health: any }[] = []
    for (let i = 0; i < 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const events = (() => { try { return JSON.parse(localStorage.getItem(`dodam_preg_events_${dateStr}`) || '[]') } catch { return [] } })()
      const mood = localStorage.getItem(`dodam_preg_mood_${dateStr}`) || ''
      const healthAll = (() => { try { return JSON.parse(localStorage.getItem('dodam_preg_health') || '{}') } catch { return {} } })()
      const health = healthAll[dateStr] || {}
      if (events.length > 0 || mood || Object.keys(health).length > 0) {
        results.push({ date: dateStr, events, mood, health })
      }
    }
    return results
  }, [])

  const diaries = useMemo<{ text: string; date: string; mood: string; comment: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('dodam_preg_diary') || '[]') } catch { return [] }
  }, [])

  const TABS = [{ key: 'daily' as const, label: '일별 기록' }, { key: 'diary' as const, label: '기다림 일기' }, { key: 'journey' as const, label: '여정' }]

  const EVENT_LABEL: Record<string, string> = {
    preg_water: '물 마시기', preg_walk: '걷기', preg_suppl: '영양제',
    preg_stretch: '스트레칭', preg_mood: '기분', preg_fetal_move: '태동',
    preg_weight: '체중', preg_edema: '부종',
    preg_folic: '엽산', preg_iron: '철분', preg_dha: 'DHA', preg_calcium: '칼슘', preg_vitd: '비타민D',
    preg_journal: '기다림 일기',
    preg_mood_happy: '기분', preg_mood_excited: '기분', preg_mood_calm: '기분', preg_mood_tired: '기분', preg_mood_anxious: '기분', preg_mood_sick: '기분',
    preg_edema_none: '부종', preg_edema_mild: '부종', preg_edema_severe: '부종',
  }
  const EVENT_COLOR: Record<string, string> = {
    preg_water: '#3B82F6', preg_walk: '#10B981', preg_suppl: '#F59E0B',
    preg_stretch: '#8B5CF6', preg_mood: '#FF8FAB', preg_fetal_move: '#5BA882',
    preg_weight: '#D08068', preg_edema: '#4A90D9',
    preg_folic: '#10B981', preg_iron: '#10B981', preg_dha: '#10B981', preg_calcium: '#10B981', preg_vitd: '#10B981',
    preg_journal: '#A78BFA',
    preg_mood_happy: '#FF8FAB', preg_mood_excited: '#FF8FAB', preg_mood_calm: '#FF8FAB', preg_mood_tired: '#FF8FAB', preg_mood_anxious: '#FF8FAB', preg_mood_sick: '#FF8FAB',
    preg_edema_none: '#4A90D9', preg_edema_mild: '#4A90D9', preg_edema_severe: '#4A90D9',
  }

  return (
    <>
      <div className="max-w-lg mx-auto w-full px-5 pt-3 pb-3">
        <div className="flex gap-2 bg-[#F0EDE8] p-1 rounded-xl">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 text-[13px] font-semibold text-center rounded-lg transition-colors ${tab === t.key ? 'bg-white text-[#1A1918] shadow-sm' : 'text-[#9E9A95]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-5 pb-4 space-y-3">
        {/* 일별 기록 */}
        {tab === 'daily' && (
          dailyHistory.length === 0 ? (
            <div className="text-center py-16">
              <IllustVideo src="/images/illustrations/empty-no-records.webm" className="w-48 h-48 mx-auto mb-4" />
              <p className="text-[13px] text-[#9E9A95]">아직 기록이 없어요</p>
            </div>
          ) : (
            dailyHistory.map(({ date, events, mood, health }) => (
              <div key={date} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-bold text-[#1A1918]">
                    {new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </p>
                  {mood && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: MOOD_COLOR[mood], backgroundColor: MOOD_COLOR[mood] + '20' }}>
                      {MOOD_LABEL[mood] || mood}
                    </span>
                  )}
                </div>
                {/* 건강 수치 */}
                {(health.weight || health.fetalMove > 0 || health.water > 0) && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {health.weight > 0 && <span className="text-[11px] bg-[#FCE4DC] text-[#D08068] px-2 py-0.5 rounded-full font-medium">{health.weight}kg</span>}
                    {health.fetalMove > 0 && <span className="text-[11px] bg-[#E8F5EF] text-[#5BA882] px-2 py-0.5 rounded-full font-medium">태동 {health.fetalMove}회</span>}
                    {health.water > 0 && <span className="text-[11px] bg-[#E6EFFF] text-[#3B82F6] px-2 py-0.5 rounded-full font-medium">물 {health.water}잔</span>}
                  </div>
                )}
                {/* 이벤트 목록 */}
                {events.length > 0 && (
                  <div className="space-y-1.5">
                    {events.map((ev, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[11px] text-[#9E9A95] w-10 shrink-0 font-mono">{ev.timeStr}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: EVENT_COLOR[ev.type] || '#6B6966', backgroundColor: (EVENT_COLOR[ev.type] || '#6B6966') + '18' }}>
                          {EVENT_LABEL[ev.type] || ev.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )
        )}

        {/* 기다림 일기 */}
        {tab === 'diary' && (
          diaries.length === 0 ? (
            <div className="text-center py-16">
              <IllustVideo src="/images/illustrations/empty-no-records.webm" className="w-48 h-48 mx-auto mb-4" />
              <p className="text-[13px] text-[#9E9A95]">아직 기다림 일기가 없어요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diaries.map((d, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-bold text-[#1A1918]">
                      {new Date(d.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                    </p>
                    {d.mood && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: MOOD_COLOR[d.mood], backgroundColor: MOOD_COLOR[d.mood] + '20' }}>{MOOD_LABEL[d.mood] || d.mood}</span>}
                  </div>
                  <p className="text-[13px] text-[#4A4744] leading-relaxed">{d.text}</p>
                  {d.comment && <p className="text-[12px] text-[var(--color-primary)] mt-2 italic">AI: {d.comment}</p>}
                </div>
              ))}
            </div>
          )
        )}

        {/* 여정 타임라인 */}
        {tab === 'journey' && <JourneyTimeline childName="아이" />}
      </div>
    </>
  )
}

// ===== 임신 준비 기록 히스토리 =====
function PreparingRecord() {
  const [tab, setTab] = useState<'daily' | 'cycle' | 'journey'>('daily')

  const SUPPL_NAMES: Record<string, string> = { folic: '엽산', vitd: '비타민D', iron: '철분', omega3: '오메가3' }
  const PREP_LABEL: Record<string, string> = {
    prep_folic: '엽산', prep_vitd: '비타민D', prep_iron: '철분', prep_omega3: '오메가3',
    prep_walk: '걷기', prep_stretch: '스트레칭', prep_breath: '심호흡', prep_meditate: '명상', prep_music: '음악감상',
    prep_journal: '기다림 일기',
  }
  const PREP_COLOR: Record<string, string> = {
    prep_folic: '#10B981', prep_vitd: '#10B981', prep_iron: '#10B981', prep_omega3: '#10B981',
    prep_walk: '#F59E0B', prep_stretch: '#F59E0B', prep_breath: '#F59E0B', prep_meditate: '#8B5CF6', prep_music: '#F472B6',
    prep_journal: '#A78BFA',
  }
  const MOOD_LABEL: Record<string, string> = { happy: '행복', excited: '설렘', calm: '평온', anxious: '불안', tired: '피곤', sad: '슬픔' }
  const MOOD_COLOR: Record<string, string> = { happy: '#FF8FAB', calm: '#90C8A8', anxious: '#FFC078', tired: '#8EB4D4', sad: '#A0A8C0' }

  const dailyHistory = useMemo(() => {
    const results: { date: string; done: string[]; mood: string; suppl: Record<string, number>; journal: string }[] = []
    for (let i = 0; i < 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const done: string[] = (() => { try { return JSON.parse(localStorage.getItem(`dodam_prep_done_${dateStr}`) || '[]') } catch { return [] } })()
      const mood = localStorage.getItem(`dodam_mood_${dateStr}`) || ''
      const suppl: Record<string, number> = (() => { try { return JSON.parse(localStorage.getItem(`dodam_suppl_${dateStr}`) || '{}') } catch { return {} } })()
      const journal: string = (() => { try { const j = JSON.parse(localStorage.getItem(`dodam_prep_journal_${dateStr}`) || '[]'); return j.filter(Boolean).join(' / ') } catch { return '' } })()
      if (done.length > 0 || mood || Object.keys(suppl).some(k => suppl[k] > 0) || journal) {
        results.push({ date: dateStr, done, mood, suppl, journal })
      }
    }
    return results
  }, [])

  const TABS = [{ key: 'daily' as const, label: '일별 기록' }, { key: 'cycle' as const, label: '생리 주기' }, { key: 'journey' as const, label: '여정' }]

  return (
    <>
      <div className="max-w-lg mx-auto w-full px-5 pt-3 pb-3">
        <div className="flex gap-2 bg-[#F0EDE8] p-1 rounded-xl">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 text-[13px] font-semibold text-center rounded-lg transition-colors ${tab === t.key ? 'bg-white text-[#1A1918] shadow-sm' : 'text-[#9E9A95]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-5 pb-4 space-y-3">
        {/* 일별 기록 */}
        {tab === 'daily' && (
          dailyHistory.length === 0 ? (
            <div className="text-center py-16">
              <IllustVideo src="/images/illustrations/empty-no-records.webm" className="w-48 h-48 mx-auto mb-4" />
              <p className="text-[13px] text-[#9E9A95]">아직 기록이 없어요</p>
              <p className="text-[12px] text-[#9E9A95] mt-1">영양제, 운동 등을 기록하면 여기에 모여요</p>
            </div>
          ) : (
            dailyHistory.map(({ date, done, mood, suppl, journal }) => {
              const supplDone = Object.entries(suppl).filter(([, v]) => v > 0)
              return (
                <div key={date} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-bold text-[#1A1918]">
                      {new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                    </p>
                    {mood && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: MOOD_COLOR[mood], backgroundColor: MOOD_COLOR[mood] + '20' }}>
                        {MOOD_LABEL[mood] || mood}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {supplDone.map(([key]) => (
                      <span key={key} className="text-[11px] bg-[#E8F5EF] text-[#10B981] px-2 py-0.5 rounded-full font-medium">{SUPPL_NAMES[key] || key}</span>
                    ))}
                    {done.map(type => (
                      <span key={type} className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: PREP_COLOR[type] || '#6B6966', backgroundColor: (PREP_COLOR[type] || '#6B6966') + '18' }}>
                        {PREP_LABEL[type] || type}
                      </span>
                    ))}
                  </div>
                  {journal && <p className="text-[12px] text-[#6B6966] mt-2 leading-relaxed border-t border-[#F0EDE8] pt-2">{journal}</p>}
                </div>
              )
            })
          )
        )}

        {/* 생리 주기 — 캘린더형 */}
        {tab === 'cycle' && <CycleHistory />}

        {/* 여정 */}
        {tab === 'journey' && <JourneyTimeline childName="아이" />}
      </div>
    </>
  )
}

// 생리 주기 히스토리 (임신 준비 전용)
function CycleHistory() {
  const cycles = useMemo<{ start: string; length: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem('dodam_cycle_history') || '[]') } catch { return [] }
  }, [])
  const lastPeriod = localStorage.getItem('dodam_last_period') || ''
  const cycleLength = Number(localStorage.getItem('dodam_cycle_length') || 28)

  if (!lastPeriod && cycles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[13px] text-[#9E9A95]">생리 주기 정보가 없어요</p>
        <p className="text-[12px] text-[#9E9A95] mt-1">설정에서 마지막 생리 시작일을 입력해보세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
        <p className="text-[13px] font-bold text-[#1A1918] mb-3">현재 주기 정보</p>
        <div className="grid grid-cols-2 gap-2">
          {lastPeriod && (
            <div className="bg-[var(--color-page-bg)] rounded-lg p-3 text-center">
              <p className="text-[11px] text-[#9E9A95]">마지막 생리</p>
              <p className="text-[13px] font-bold text-[#1A1918] mt-0.5">{new Date(lastPeriod).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</p>
            </div>
          )}
          <div className="bg-[var(--color-page-bg)] rounded-lg p-3 text-center">
            <p className="text-[11px] text-[#9E9A95]">평균 주기</p>
            <p className="text-[13px] font-bold text-[#1A1918] mt-0.5">{cycleLength}일</p>
          </div>
        </div>
      </div>
      {cycles.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <p className="text-[13px] font-bold text-[#1A1918] mb-3">주기 기록</p>
          <div className="space-y-2">
            {cycles.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F0EDE8] last:border-0">
                <p className="text-[13px] text-[#1A1918]">{new Date(c.start).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 시작</p>
                <span className="text-[12px] text-[#6B6966]">{c.length}일</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 여정 타임라인 — 기다림→임신→육아 통합 =====
function JourneyTimeline({ childName }: { childName: string }) {
  const [showForm, setShowForm] = useState(false)
  const [newText, setNewText] = useState('')
  const [journeyEntries, setJourneyEntries] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('dodam_journey_entries') || '[]') } catch { return [] }
  })

  const addJourneyEntry = () => {
    if (!newText.trim()) return
    const entry = { id: Date.now(), date: new Date().toISOString().split('T')[0], text: newText.trim(), createdAt: new Date().toISOString() }
    const updated = [entry, ...journeyEntries]
    setJourneyEntries(updated)
    localStorage.setItem('dodam_journey_entries', JSON.stringify(updated))
    setNewText(''); setShowForm(false)
  }

  const { letters, diaries, prepDiaries, checkups, pregTests } = useMemo(() => ({
    letters: (() => { try { return JSON.parse(localStorage.getItem('dodam_letters') || '[]') } catch { return [] } })(),
    diaries: (() => { try { return JSON.parse(localStorage.getItem('dodam_preg_diary') || '[]') } catch { return [] } })(),
    prepDiaries: (() => {
      // mode 1 기다림 일기: dodam_prep_journal_YYYY-MM-DD 키에 배열로 저장
      const result: { date: string; text: string; comment: string }[] = []
      for (let i = 0; i < 365; i++) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        try {
          const entries: string[] = JSON.parse(localStorage.getItem(`dodam_prep_journal_${dateStr}`) || '[]')
          entries.filter(Boolean).forEach(text => result.push({ date: dateStr, text, comment: '' }))
        } catch { /* skip */ }
      }
      return result
    })(),
    checkups: (() => { try { return JSON.parse(localStorage.getItem('dodam_checkup_records') || '[]') } catch { return [] } })(),
    pregTests: (() => { try { return JSON.parse(localStorage.getItem('dodam_preg_tests') || '[]') } catch { return [] } })(),
  }), []) // read once on mount

  const timeline = useMemo(() => {
    const items: { date: string; type: string; emoji: string; title: string; content: string; sub?: string }[] = []
    letters.forEach((l: any) => { items.push({ date: l.date, type: 'letter', emoji: '/images/illustrations/t1.webm', title: '아이에게 보낸 편지', content: l.text?.slice(0, 60) || '', sub: l.reply?.slice(0, 40) }) })
    diaries.forEach((d: any) => { items.push({ date: d.date, type: 'diary', emoji: '/images/illustrations/t2.webm', title: '기다림 일기 (임신중)', content: d.text?.slice(0, 60) || '', sub: d.comment?.slice(0, 40) }) })
    prepDiaries.forEach((d: any) => { items.push({ date: d.date, type: 'prep_diary', emoji: '/images/illustrations/t2.webm', title: '기다림 일기 (임신준비)', content: d.text?.slice(0, 60) || '' }) })
    checkups.forEach((c: any) => { items.push({ date: c.date, type: 'checkup', emoji: '/images/illustrations/t3.webm', title: `${c.week}주차 검진`, content: c.doctorNote || c.note || '', sub: c.babyWeight ? `${c.babyWeight}` : undefined }) })
    pregTests.forEach((t: any) => { if (t.result === '양성') items.push({ date: t.date, type: 'positive', emoji: '/images/illustrations/t4.webm', title: '양성! 아이가 찾아왔어요', content: `D+${t.dpo}에 확인` }) })
    journeyEntries.forEach((e: any) => { items.push({ date: e.date, type: 'manual', emoji: '/images/illustrations/t5.webm', title: '추억 한마디', content: e.text?.slice(0, 80) || '' }) })
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items
  }, [letters, diaries, prepDiaries, checkups, pregTests, journeyEntries])

  const hasJourney = timeline.length > 0

  return (
    <div className="px-5 pt-4 space-y-3">
      <div className="bg-gradient-to-br from-[#FFF8F3] to-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)]/50 p-5 text-center">
        <IllustVideo src={hasJourney ? '/images/illustrations/h3.webm' : '/images/illustrations/h2.webm'} variant="circle" className="w-24 h-24 mx-auto mb-2" />
        <p className="text-[16px] font-bold text-[#1A1918]">{hasJourney ? `${childName}를 만나기까지의 여정` : '여정이 시작될 거예요'}</p>
        {hasJourney && (
          <div className="flex justify-center gap-4 mt-3">
            {letters.length > 0 && <div className="text-center"><p className="text-[16px] font-bold text-[var(--color-primary)]">{letters.length}</p><p className="text-[13px] text-[#6B6966]">편지</p></div>}
            {(diaries.length + prepDiaries.length) > 0 && <div className="text-center"><p className="text-[16px] font-bold text-[var(--color-primary)]">{diaries.length + prepDiaries.length}</p><p className="text-[13px] text-[#6B6966]">기다림 일기</p></div>}
            {checkups.length > 0 && <div className="text-center"><p className="text-[16px] font-bold text-[var(--color-primary)]">{checkups.length}</p><p className="text-[13px] text-[#6B6966]">검진</p></div>}
          </div>
        )}
        {!hasJourney && <p className="text-[14px] text-[#6B6966] mt-2">임신준비·임신 중 일기, 편지, 검진 기록이 여기에 모여요</p>}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="w-full py-2.5 bg-white rounded-xl border border-[#E8E4DF] text-[13px] text-[var(--color-primary)] font-semibold active:bg-[#F5F1EC]">추억 남기기</button>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="이 순간을 기록해보세요..." className="w-full h-20 text-[13px] bg-[#F5F1EC] rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" maxLength={200} />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => { setShowForm(false); setNewText('') }} className="px-3 py-1.5 text-[14px] text-[#6B6966]">취소</button>
            <button onClick={addJourneyEntry} disabled={!newText.trim()} className="px-4 py-1.5 bg-[var(--color-primary)] text-white text-[14px] rounded-lg font-semibold disabled:opacity-40">저장</button>
          </div>
        </div>
      )}

      {timeline.length > 0 ? (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[#E0E0E0]" />
          {timeline.map((item, i) => (
            <div key={i} className="flex gap-3 mb-3 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 overflow-hidden ${item.type === 'positive' ? 'bg-[var(--color-primary)]' : 'bg-white border border-[#E0E0E0]'}`}>
                <IllustVideo src={item.emoji} variant="icon" className="w-7 h-7" />
              </div>
              <div className="flex-1 bg-white rounded-xl border border-[#E8E4DF] p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[14px] font-semibold text-[#1A1918]">{item.title}</p>
                  <span className="text-[13px] text-[#9E9A95]">{new Date(item.date).toLocaleDateString('ko-KR')}</span>
                </div>
                {item.content && <p className="text-[13px] text-[#6B6966] line-clamp-2">{item.content}</p>}
                {item.sub && <p className="text-[14px] text-[var(--color-primary)] mt-0.5 italic">{item.sub}</p>}
                {item.type === 'positive' && <p className="text-[13px] text-[var(--color-primary)] font-semibold mt-1">이 순간부터 모든 게 시작되었어요</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <IllustVideo src="/images/illustrations/empty-no-records.webm" className="w-48 h-48 mx-auto mb-4" />
          <p className="text-[13px] text-[#9E9A95]">아직 기록이 없어요</p>
          <p className="text-[13px] text-[#6B6966] mt-1">임신준비·임신 중 기다림 일기, 편지가 여기에 모여요</p>
        </div>
      )}
    </div>
  )
}

function getAgeMonths(birthdate: string): number {
  const birth = new Date(birthdate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

// ===== 육아 모드 성장 탭 =====
type ParentingTab = 'growth' | 'stats' | 'develop' | 'journey'

const PARENTING_TABS: { key: ParentingTab; label: string }[] = [
  { key: 'growth', label: '성장' },
  { key: 'stats', label: '통계' },
  { key: 'develop', label: '발달' },
  { key: 'journey', label: '여정' },
]

function ParentingRecord() {
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<CareEvent[]>([])
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ParentingTab>('growth')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 10000) // 10초 후 강제 해제
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/onboarding'); return }
        const { data: children } = await supabase.from('children').select('id,name,birthdate,sex,photo_url').eq('user_id', user.id).limit(1)
        if (!children || children.length === 0) { router.push('/settings/children/add'); return }
        const c = children[0] as Child
        setChild(c)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const [eventsRes, growthRes] = await Promise.all([
          supabase.from('events').select('id, type, start_ts, end_ts, amount_ml, unit, temperature, tags, memo, notes, child_id, recorder_id').eq('child_id', c.id).gte('start_ts', thirtyDaysAgo.toISOString()).order('start_ts', { ascending: false }),
          supabase.from('growth_records').select('id, child_id, measured_at, weight_kg, height_cm, head_cm, body_type, notes').eq('child_id', c.id).order('measured_at', { ascending: true }),
        ])
        if (eventsRes.data) setEvents(eventsRes.data as CareEvent[])
        if (growthRes.data) setRecords(growthRes.data as GrowthRecord[])
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => clearTimeout(timeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" /></div>
  }

  const ageMonths = child ? getAgeMonths(child.birthdate) : 0
  const latestRecord = records.length > 0 ? records[records.length - 1] : null

  return (
    <>
      <div className="max-w-lg mx-auto w-full px-5 pt-3 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div />
          <Link href="/growth/add" className="text-[13px] font-semibold text-[var(--color-primary)]">+ 측정</Link>
        </div>
        <div className="flex gap-2 bg-[#F0EDE8] p-1 rounded-xl">
          {PARENTING_TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 text-[13px] font-semibold text-center rounded-lg transition-colors ${tab === t.key ? 'bg-white text-[#1A1918] shadow-sm' : 'text-[#9E9A95]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full pb-4">
        {tab === 'growth' && (
          <div className="space-y-3 px-5 pt-4">
            {latestRecord ? (
              <>
              <div className="bg-white rounded-xl border border-[#D5D0CA] shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[15px] font-bold text-[#1A1918]">{child?.name}</p>
                    <p className="text-[13px] text-[#4A4744]">{ageMonths}개월</p>
                  </div>
                  <Link href="/growth/add" className="text-[13px] font-semibold text-[var(--color-primary)]">+ 측정</Link>
                </div>
                <div className="flex gap-3">
                  {latestRecord.weight_kg && (
                    <div className="flex-1 p-3 rounded-xl bg-[#F5F0EA] border border-[#E8E2DA]">
                      <p className="text-[13px] text-[#4A4744] font-medium">몸무게</p>
                      <p className="text-xl font-bold text-[#1A1918]">{Number(latestRecord.weight_kg).toFixed(1)}<span className="text-[13px] font-normal text-[#4A4744] ml-0.5">kg</span></p>
                    </div>
                  )}
                  {latestRecord.height_cm && (
                    <div className="flex-1 p-3 rounded-xl bg-[#F5F0EA] border border-[#E8E2DA]">
                      <p className="text-[13px] text-[#4A4744] font-medium">키</p>
                      <p className="text-xl font-bold text-[#1A1918]">{Number(latestRecord.height_cm).toFixed(1)}<span className="text-[13px] font-normal text-[#4A4744] ml-0.5">cm</span></p>
                    </div>
                  )}
                </div>
              </div>
              {/* AI 성장 스토리 */}
              <GrowthStory childName={child?.name || '도담이'} ageMonths={ageMonths} records={records} events={events} />
              {/* 형제자매 비교 AI */}
              {child && <SiblingCompare currentChild={child} ageMonths={ageMonths} />}
              </>
            ) : (
              <div className="bg-white rounded-xl border border-[#D5D0CA] shadow-sm p-6 text-center">
                <IllustVideo src="/images/illustrations/empty-no-growth.webm" className="w-48 h-48 mx-auto mb-4" />
                <p className="text-[14px] text-[#4A4744] mb-3">아직 성장 기록이 없어요</p>
                <Link href="/growth/add" className="inline-block px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-[13px] font-semibold">기록 추가</Link>
              </div>
            )}
          </div>
        )}
        {tab === 'stats' && (
          <div className="px-5 pt-4 space-y-4">
            <StatsReport events={events} ageMonths={ageMonths} />
            {records.length >= 2 && (
              <GrowthTimelapse records={records} childName={child?.name || '도담이'} birthdate={child?.birthdate} />
            )}
            {child && (
              <CommunityComparison childId={child.id} ageMonths={ageMonths} sex={child.sex} />
            )}
          </div>
        )}
        {tab === 'develop' && (
          <DevelopmentCheck ageMonths={ageMonths} />
        )}
        {tab === 'journey' && (
          <JourneyTimeline childName={child?.name || '도담이'} />
        )}
      </div>
    </>
  )
}

// ===== 메인: 모드별 분기 =====
export default function RecordPage() {
  const [mode, setMode] = useState<string>('')

  useEffect(() => {
    setMode(localStorage.getItem('dodam_mode') || 'parenting')
  }, [])

  if (!mode) {
    return <div className="flex items-center justify-center h-[100dvh]"><div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" /></div>
  }

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      {mode === 'parenting' && <ParentingRecord />}
      {mode === 'pregnant' && <PregnantRecord />}
      {mode === 'preparing' && <PreparingRecord />}
      {mode === 'waiting' && <PreparingRecord />}
    </div>
  )
}
