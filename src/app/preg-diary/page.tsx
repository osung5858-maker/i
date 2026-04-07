'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PenIcon, SparkleIcon } from '@/components/ui/Icons'
import PageHeader from '@/components/layout/PageHeader'
import { fetchPregRecords } from '@/lib/supabase/pregRecord'

type DiaryEntry = { text: string; date: string; mood: string; comment: string }

export default function PregDiaryPage() {
  const router = useRouter()

  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  useEffect(() => {
    const load = async () => {
      const rows = await fetchPregRecords(['diary'])
      const entries: DiaryEntry[] = rows.map(r => ({
        text: String((r.value as Record<string, unknown>).text ?? ''),
        date: String((r.value as Record<string, unknown>).date ?? r.record_date),
        mood: String((r.value as Record<string, unknown>).mood ?? ''),
        comment: String((r.value as Record<string, unknown>).comment ?? ''),
      }))
      setDiaries(entries)
    }
    load().catch(() => {})
  }, [])

  return (
    <div className="h-[calc(100dvh-144px)] flex flex-col bg-[#F5F1EC] overflow-hidden">
      <PageHeader title="기다림 일기" standalone />

      <div className="flex-1 overflow-y-auto overscroll-contain max-w-lg mx-auto w-full pb-4">
        {diaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center">
              <PenIcon className="w-7 h-7 text-tertiary" />
            </div>
            <p className="text-subtitle text-primary">아직 기다림 일기가 없어요</p>
            <p className="text-body text-tertiary">기다림 페이지에서 첫 일기를 남겨보세요</p>
          </div>
        ) : (
          <div className="mx-4 mt-2 flex flex-col gap-3">
            {diaries.map((entry, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-caption text-tertiary">
                    {new Date(entry.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {' '}
                    {new Date(entry.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-body-emphasis text-primary leading-relaxed">{entry.text}</p>
                {entry.comment && (
                  <div className="mt-3 pt-3 border-t border-[#F0EDE8]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <SparkleIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span className="text-caption font-bold text-[var(--color-primary)]">아기의 답장</span>
                    </div>
                    <p className="text-body text-[var(--color-primary)] italic leading-relaxed">
                      {entry.comment}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
