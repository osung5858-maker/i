'use client'

import { useState, useEffect } from 'react'
import { BookOpenIcon, SparkleIcon, ChevronRightIcon } from '@/components/ui/Icons'
import { fetchUserRecords, upsertUserRecord } from '@/lib/supabase/userRecord'
import type { GrowthRecord, CareEvent } from '@/types'

interface Props {
  childName: string
  ageMonths: number
  records: GrowthRecord[]
  events: CareEvent[]
}

interface Story {
  title: string
  story: string
  highlights: string[]
  nextMilestone: string
}

interface StoryHistoryEntry {
  date: string
  ageMonths: number
  story: Story
}

async function loadHistoryFromDb(childName: string): Promise<StoryHistoryEntry[]> {
  try {
    const rows = await fetchUserRecords(['story_history'])
    const match = rows.find(r => (r.value as any).childName === childName)
    if (match) {
      const val = match.value as { entries?: StoryHistoryEntry[] }
      return val.entries || []
    }
  } catch { /* */ }
  return []
}

function saveHistoryToDb(childName: string, entries: StoryHistoryEntry[]) {
  const today = new Date().toISOString().split('T')[0]
  upsertUserRecord(today, 'story_history', { childName, entries: entries.slice(0, 20) } as Record<string, unknown>).catch(() => {})
}

export default function GrowthStory({ childName, ageMonths, records, events }: Props) {
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<StoryHistoryEntry[]>([])

  // 마운트 시 최신 캐시 복원 + 히스토리 로드
  useEffect(() => {
    loadHistoryFromDb(childName).then(h => {
      setHistory(h)
      const latest = h.find(entry => entry.ageMonths === ageMonths)
      if (latest) setStory(latest.story)
    })
  }, [childName, ageMonths])

  const generateStory = async () => {
    setLoading(true)
    setError(false)

    const feedEvents = events.filter(e => e.type === 'feed')
    const sleepEvents = events.filter(e => e.type === 'sleep')
    const feedTrend = feedEvents.length > 0
      ? `최근 30일 평균 수유 ${(feedEvents.length / 30).toFixed(1)}회/일`
      : undefined
    const sleepTrend = sleepEvents.length > 0
      ? `최근 30일 수면 기록 ${sleepEvents.length}건`
      : undefined

    const milestones: string[] = []
    try {
      const rows = await fetchUserRecords(['dev_check'])
      const match = rows.find(r => (r.value as any).ageMonths === ageMonths)
      if (match) {
        const items = (match.value as any).items
        if (Array.isArray(items) && items.length > 0) milestones.push(...items.slice(0, 5))
      }
    } catch { /* */ }

    const growthSummary = records.slice(-3).map(r => ({
      date: r.measured_at, height: r.height_cm, weight: r.weight_kg,
    }))

    try {
      const res = await fetch('/api/ai-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType: 'growth-story', childName, ageMonths, milestones,
          feedTrend, sleepTrend, growthRecords: growthSummary, specialMoments: [],
        }),
      })
      const data = await res.json()
      if (data.title && data.story) {
        setStory(data)
        const today = new Date().toISOString().split('T')[0]
        const newEntry: StoryHistoryEntry = { date: today, ageMonths, story: data }
        const updated = [newEntry, ...history.filter(h => !(h.date === today && h.ageMonths === ageMonths))].slice(0, 20)
        setHistory(updated)
        saveHistoryToDb(childName, updated)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const shareStory = async () => {
    if (!story) return
    const text = `${story.title}\n\n${story.story}\n\n${story.highlights.map(h => `- ${h}`).join('\n')}\n\n${story.nextMilestone}\n\n— 도담 AI 성장 스토리`
    if (navigator.share) {
      try { await navigator.share({ title: story.title, text }) } catch { /* */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    }
  }

  // 히스토리 보기
  if (showHistory) {
    return (
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-[#E8E4DF]">
          <p className="text-body-emphasis font-bold text-primary">성장 스토리 히스토리</p>
          <button onClick={() => setShowHistory(false)} className="text-caption text-secondary">닫기</button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-body text-tertiary text-center py-8">아직 스토리가 없어요</p>
          ) : (
            history.map((entry, i) => (
              <button
                key={i}
                onClick={() => { setStory(entry.story); setShowHistory(false) }}
                className="w-full px-4 py-3 text-left border-b border-[#F5F3F0] last:border-0 active:bg-[#F5F1EC]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body font-semibold text-primary">{entry.story.title}</p>
                    <p className="text-label text-tertiary mt-0.5">{entry.date} · {entry.ageMonths}개월</p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-tertiary" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  // 스토리 미생성 상태
  if (!story && !loading) {
    return (
      <div className="bg-gradient-to-br from-[#FFF8F3] to-[#F5F0FF] rounded-2xl border border-[#E8DFD5] p-5 text-center">
        <BookOpenIcon className="w-7 h-7 mx-auto mb-2 text-secondary" />
        <p className="text-subtitle text-primary mb-1">{childName}의 성장 스토리</p>
        <p className="text-body text-secondary mb-4">AI가 기록 데이터를 바탕으로<br/>아이의 성장 이야기를 만들어드려요</p>
        <button onClick={generateStory} className="px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80">
          스토리 만들기
        </button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(true)} className="block mx-auto mt-2 text-caption text-secondary">
            이전 스토리 {history.length}개 보기
          </button>
        )}
        {error && <p className="text-caption text-[#D08068] mt-2">생성 실패. 다시 시도해주세요.</p>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-5 text-center">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-body text-secondary">AI가 {childName}의 성장 스토리를 쓰고 있어요...</p>
      </div>
    )
  }

  if (!story) return null

  return (
    <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#FFF8F3] to-[#F5F0FF] px-5 py-4">
        <p className="text-label text-tertiary mb-0.5">AI 성장 스토리 · {ageMonths}개월</p>
        <p className="text-subtitle font-bold text-primary">{story.title}</p>
      </div>

      <div className="px-5 py-4">
        <p className="text-body-emphasis text-[#4A4744] leading-relaxed whitespace-pre-line">{story.story}</p>

        {story.highlights.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {story.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <SparkleIcon className="w-3.5 h-3.5 shrink-0 text-[#C4913E] mt-0.5" />
                <p className="text-body text-[#5A5854]">{h}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-xl bg-[#F0F9F4] border border-[#D5E8DC]">
          <p className="text-caption text-[#2D7A4A] font-medium">{story.nextMilestone}</p>
        </div>
      </div>

      <div className="flex border-t border-[#E8E4DF]">
        <button onClick={shareStory} className="flex-1 py-3 text-body font-semibold text-[var(--color-primary)] text-center active:bg-[#F5F1EC]">
          공유하기
        </button>
        <div className="w-px bg-[#E8E4DF]" />
        <button onClick={generateStory} className="flex-1 py-3 text-body font-semibold text-secondary text-center active:bg-[#F5F1EC]">
          다시 만들기
        </button>
        <div className="w-px bg-[#E8E4DF]" />
        <button onClick={() => setShowHistory(true)} className="flex-1 py-3 text-body font-semibold text-secondary text-center active:bg-[#F5F1EC]">
          히스토리 ({history.length})
        </button>
      </div>
    </div>
  )
}
