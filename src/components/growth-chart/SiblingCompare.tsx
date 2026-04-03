'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BabyIcon, LightbulbIcon, ChevronRightIcon } from '@/components/ui/Icons'
import { shareSiblingCompare } from '@/lib/kakao/share-parenting'
import type { Child } from '@/types'
import { fetchUserRecords, upsertUserRecord } from '@/lib/supabase/userRecord'

interface SiblingInsight {
  insight: string
  olderAtSameAge: string
  uniqueTraits: string[]
  parentTip: string
  funFact: string
}

interface HistoryEntry {
  date: string
  ageMonths: number
  insight: SiblingInsight
}

interface Props {
  currentChild: Child
  ageMonths: number
}

async function loadHistoryFromDb(childId: string): Promise<HistoryEntry[]> {
  try {
    const rows = await fetchUserRecords(['sibling_history'])
    const match = rows.find(r => (r.value as any).childId === childId)
    if (match) {
      const val = match.value as { entries?: HistoryEntry[] }
      return val.entries || []
    }
  } catch { /* */ }
  return []
}

function saveHistoryToDb(childId: string, entries: HistoryEntry[]) {
  const today = new Date().toISOString().split('T')[0]
  upsertUserRecord(today, 'sibling_history', { childId, entries: entries.slice(0, 20) } as Record<string, unknown>).catch(() => {})
}

export default function SiblingCompare({ currentChild, ageMonths }: Props) {
  const [siblings, setSiblings] = useState<Child[]>([])
  const [insight, setInsight] = useState<SiblingInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    async function loadSiblings() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('children').select('*').eq('user_id', user.id).order('birthdate', { ascending: true })
      if (data && data.length > 1) {
        setSiblings(data.filter((c: Child) => c.id !== currentChild.id) as Child[])
      }
      setLoaded(true)
    }
    loadSiblings()

    // 히스토리 복원
    loadHistoryFromDb(currentChild.id).then(h => {
      setHistory(h)
      // restore latest insight for same ageMonths
      const latest = h.find(entry => entry.ageMonths === ageMonths)
      if (latest) { setInsight(latest.insight); setLoaded(true) }
    })
  }, [currentChild.id, ageMonths])

  if (loaded && siblings.length === 0) return null
  if (!loaded) return null

  const getChildAge = (birthdate: string) => {
    const birth = new Date(birthdate)
    const now = new Date()
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  }

  const fetchInsight = async () => {
    setLoading(true)
    const children = [
      { name: currentChild.name, ageMonths, milestones: [], feedPattern: '', sleepPattern: '' },
      ...siblings.map(s => ({
        name: s.name, ageMonths: getChildAge(s.birthdate), milestones: [], feedPattern: '', sleepPattern: '',
      })),
    ]

    try {
      const res = await fetch('/api/ai-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardType: 'sibling-compare', children }),
      })
      const data = await res.json()
      if (data.insight) {
        setInsight(data)
        const today = new Date().toISOString().split('T')[0]
        const updatedHistory = [{ date: today, ageMonths, insight: data } as HistoryEntry, ...history.filter(h => !(h.date === today && h.ageMonths === ageMonths))].slice(0, 20)
        saveHistoryToDb(currentChild.id, updatedHistory)
        setHistory(updatedHistory)
      }
    } catch { /* */ }
    setLoading(false)
  }

  // 히스토리 보기
  if (showHistory) {
    return (
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-[#E8E4DF]">
          <p className="text-body-emphasis font-bold text-primary">비교 히스토리</p>
          <button onClick={() => setShowHistory(false)} className="text-caption text-secondary">닫기</button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-body text-tertiary text-center py-8">아직 비교 기록이 없어요</p>
          ) : (
            history.map((entry, i) => (
              <button
                key={i}
                onClick={() => { setInsight(entry.insight); setShowHistory(false) }}
                className="w-full px-4 py-3 text-left border-b border-[#F5F3F0] last:border-0 active:bg-[#F5F1EC]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body font-semibold text-primary">{entry.ageMonths}개월 비교</p>
                    <p className="text-label text-tertiary">{entry.date}</p>
                    <p className="text-label text-secondary mt-0.5 line-clamp-1">{entry.insight.insight.slice(0, 50)}...</p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-tertiary shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  if (!insight && !loading) {
    return (
      <div className="bg-gradient-to-br from-[#F5F0FF] to-[#FFF8F3] rounded-2xl border border-[#E0D8EF] p-5 text-center">
        <div className="flex justify-center gap-1 mb-2"><BabyIcon className="w-6 h-6 text-tertiary" /><BabyIcon className="w-6 h-6 text-tertiary" /></div>
        <p className="text-subtitle text-primary mb-1">형제자매 AI 인사이트</p>
        <p className="text-body text-secondary mb-1">
          {currentChild.name}과(와) {siblings.map(s => s.name).join(', ')}의
        </p>
        <p className="text-body text-secondary mb-4">성장을 비교해볼까요?</p>
        <button onClick={fetchInsight} className="px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80">
          비교 분석하기
        </button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="block mx-auto mt-2 text-caption text-secondary">
            이전 비교 {history.length}개 보기
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-5 text-center">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-body text-secondary">형제자매 인사이트 분석 중...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BabyIcon className="w-4 h-4 text-tertiary" /><BabyIcon className="w-4 h-4 text-tertiary" />
          <h3 className="text-body font-bold text-primary">형제자매 AI 인사이트 · {ageMonths}개월</h3>
        </div>
      </div>

      <p className="text-body-emphasis text-[#4A4744] leading-relaxed">{insight!.insight}</p>

      {insight!.olderAtSameAge && (
        <div className="p-3 rounded-xl bg-[#FFF8F3] border border-[#F0E4D8]">
          <p className="text-label text-tertiary mb-1">{siblings[0]?.name}이(가) 이 월령이었을 때</p>
          <p className="text-body text-[#5A5854]">{insight!.olderAtSameAge}</p>
        </div>
      )}

      {insight!.uniqueTraits.length > 0 && (
        <div className="flex gap-2">
          {insight!.uniqueTraits.map((trait, i) => (
            <div key={i} className="flex-1 p-2.5 rounded-xl bg-[#F5F0FF] border border-[#E0D8EF]">
              <p className="text-label text-[#7A6FA0] font-medium mb-0.5">
                {i === 0 ? currentChild.name : siblings[i - 1]?.name || ''}
              </p>
              <p className="text-caption text-[#5A5854]">{trait}</p>
            </div>
          ))}
        </div>
      )}

      {insight!.funFact && (
        <div className="flex items-start gap-1.5">
          <LightbulbIcon className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <p className="text-body text-[var(--color-primary)] font-medium">{insight!.funFact}</p>
        </div>
      )}

      <div className="p-3 rounded-xl bg-[#F0F9F4] border border-[#D5E8DC]">
        <p className="text-caption text-[#2D7A4A]">{insight!.parentTip}</p>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={fetchInsight} className="flex-1 py-2 text-caption text-secondary font-medium bg-[var(--color-page-bg)] rounded-lg active:bg-[#E8E4DF]">
          다시 분석
        </button>
        <button onClick={() => setShowHistory(true)} className="flex-1 py-2 text-caption text-secondary font-medium bg-[var(--color-page-bg)] rounded-lg active:bg-[#E8E4DF]">
          히스토리 ({history.length})
        </button>
        <button onClick={() => shareSiblingCompare(insight!.insight)} className="flex-1 py-2 text-caption text-[var(--color-primary)] font-semibold bg-[var(--color-page-bg)] rounded-lg active:bg-[#E8E4DF]">
          공유
        </button>
      </div>
    </div>
  )
}
