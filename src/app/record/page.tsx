'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DiaryView from '@/components/diary/DiaryView'
import StatsReport from '@/components/growth-chart/StatsReport'
import DevelopmentCheck from '@/components/growth-chart/DevelopmentCheck'
import GrowthTimelapse from '@/components/growth-chart/GrowthTimelapse'
import CommunityComparison from '@/components/growth-chart/CommunityComparison'
import type { Child, GrowthRecord, CareEvent } from '@/types'
import { PregnantWaitingPage } from '@/app/waiting/page'
import dynamic from 'next/dynamic'

// 임신 전: waiting 페이지의 기본 콘텐츠를 그대로 사용 (lazy load)
const WaitingPage = dynamic(() => import('@/app/waiting/page'), { loading: () => <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" /></div> })

function PreparingRecord() {
  return <WaitingPage />
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

  const letters = (() => { try { return JSON.parse(localStorage.getItem('dodam_letters') || '[]') } catch { return [] } })()
  const diaries = (() => { try { return JSON.parse(localStorage.getItem('dodam_preg_diary') || '[]') } catch { return [] } })()
  const checkups = (() => { try { return JSON.parse(localStorage.getItem('dodam_checkup_records') || '[]') } catch { return [] } })()
  const pregTests = (() => { try { return JSON.parse(localStorage.getItem('dodam_preg_tests') || '[]') } catch { return [] } })()
  const timeline: { date: string; type: string; emoji: string; title: string; content: string; sub?: string }[] = []

  letters.forEach((l: any) => { timeline.push({ date: l.date, type: 'letter', emoji: '✉️', title: '아이에게 보낸 편지', content: l.text?.slice(0, 60) || '', sub: l.reply?.slice(0, 40) }) })
  diaries.forEach((d: any) => { timeline.push({ date: d.date, type: 'diary', emoji: '✍️', title: '태교일기', content: d.text?.slice(0, 60) || '', sub: d.comment?.slice(0, 40) }) })
  checkups.forEach((c: any) => { timeline.push({ date: c.date, type: 'checkup', emoji: '🏥', title: `${c.week}주차 검진`, content: c.doctorNote || c.note || '', sub: c.babyWeight ? `⚖️ ${c.babyWeight}` : undefined }) })
  pregTests.forEach((t: any) => { if (t.result === '양성') timeline.push({ date: t.date, type: 'positive', emoji: '🎉', title: '양성! 아이가 찾아왔어요', content: `D+${t.dpo}에 확인` }) })
  journeyEntries.forEach((e: any) => { timeline.push({ date: e.date, type: 'manual', emoji: '💭', title: '추억 한마디', content: e.text?.slice(0, 80) || '' }) })
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const hasJourney = timeline.length > 0

  return (
    <div className="px-5 pt-4 space-y-3">
      <div className="bg-gradient-to-br from-[#FFF8F3] to-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)]/50 p-5 text-center">
        <p className="text-3xl mb-2">{hasJourney ? '📖' : '🌱'}</p>
        <p className="text-[16px] font-bold text-[#1A1918]">{hasJourney ? `${childName}를 만나기까지의 여정` : '여정이 시작될 거예요'}</p>
        {hasJourney && (
          <div className="flex justify-center gap-4 mt-3">
            {letters.length > 0 && <div className="text-center"><p className="text-[16px] font-bold text-[var(--color-primary)]">{letters.length}</p><p className="text-[13px] text-[#6B6966]">편지</p></div>}
            {diaries.length > 0 && <div className="text-center"><p className="text-[16px] font-bold text-[var(--color-primary)]">{diaries.length}</p><p className="text-[13px] text-[#6B6966]">태교일기</p></div>}
            {checkups.length > 0 && <div className="text-center"><p className="text-[16px] font-bold text-[var(--color-primary)]">{checkups.length}</p><p className="text-[13px] text-[#6B6966]">검진</p></div>}
          </div>
        )}
        {!hasJourney && <p className="text-[14px] text-[#6B6966] mt-2">편지, 태교일기, 검진 기록이 여기에 모여요</p>}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="w-full py-2.5 bg-white rounded-xl border border-[#E8E4DF] text-[13px] text-[var(--color-primary)] font-semibold active:bg-[#F5F1EC]">💭 추억 남기기</button>
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${item.type === 'positive' ? 'bg-[var(--color-primary)]' : 'bg-white border border-[#E0E0E0]'}`}>
                <span className="text-[14px]">{item.emoji}</span>
              </div>
              <div className="flex-1 bg-white rounded-xl border border-[#E8E4DF] p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[14px] font-semibold text-[#1A1918]">{item.title}</p>
                  <span className="text-[13px] text-[#9E9A95]">{new Date(item.date).toLocaleDateString('ko-KR')}</span>
                </div>
                {item.content && <p className="text-[13px] text-[#6B6966] line-clamp-2">{item.content}</p>}
                {item.sub && <p className="text-[14px] text-[var(--color-primary)] mt-0.5 italic">{item.sub}</p>}
                {item.type === 'positive' && <p className="text-[13px] text-[var(--color-primary)] font-semibold mt-1">🎉 이 순간부터 모든 게 시작되었어요</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-[13px] text-[#9E9A95]">아직 기록이 없어요</p>
          <p className="text-[13px] text-[#6B6966] mt-1">편지를 쓰거나, 태교일기를 남기면 여기에 모여요</p>
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

function ParentingRecord() {
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<CareEvent[]>([])
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ParentingTab>('growth')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      const { data: children } = await supabase.from('children').select('*').eq('user_id', user.id).limit(1)
      if (!children || children.length === 0) { router.push('/settings/children/add'); return }
      const c = children[0] as Child
      setChild(c)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const [eventsRes, growthRes] = await Promise.all([
        supabase.from('events').select('*').eq('child_id', c.id).gte('start_ts', thirtyDaysAgo.toISOString()).order('start_ts', { ascending: false }),
        supabase.from('growth_records').select('*').eq('child_id', c.id).order('measured_at', { ascending: true }),
      ])
      if (eventsRes.data) setEvents(eventsRes.data as CareEvent[])
      if (growthRes.data) setRecords(growthRes.data as GrowthRecord[])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" /></div>
  }

  const ageMonths = child ? getAgeMonths(child.birthdate) : 0
  const latestRecord = records.length > 0 ? records[records.length - 1] : null

  const TABS: { key: ParentingTab; label: string }[] = [
    { key: 'growth', label: '성장' },
    { key: 'stats', label: '통계' },
    { key: 'develop', label: '발달' },
    { key: 'journey', label: '여정' },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-[#E8E4DF]/60">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <h1 className="text-[17px] font-bold text-[#1A1918] truncate min-w-0">성장</h1>
          <Link href="/growth/add" className="text-[13px] font-semibold text-[var(--color-primary)] whitespace-nowrap shrink-0 ml-3">+ 기록</Link>
        </div>
        <div className="flex px-5 pb-2 max-w-lg mx-auto w-full gap-1.5">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-[13px] font-semibold text-center rounded-xl transition-colors ${tab === t.key ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-[#9E9A95]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full pb-28">
        {tab === 'growth' && (
          <div className="space-y-3 px-5 pt-4">
            {latestRecord ? (
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
            ) : (
              <div className="bg-white rounded-xl border border-[#D5D0CA] shadow-sm p-6 text-center">
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
    <div className="min-h-[100dvh] bg-[#FFF9F5]">
      {mode === 'parenting' && <ParentingRecord />}
      {mode === 'pregnant' && <PregnantWaitingPage />}
      {mode === 'preparing' && <PreparingRecord />}
    </div>
  )
}
