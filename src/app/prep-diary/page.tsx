'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PenIcon } from '@/components/ui/Icons'

type JournalEntry = { text: string; date: string; comment?: string }

export default function PrepDiaryPage() {
  const router = useRouter()

  const [journals, setJournals] = useState<JournalEntry[]>([])
  useEffect(() => {
    try { setJournals(JSON.parse(localStorage.getItem('dodam_prep_journal') || '[]')) } catch { setJournals([]) }
  }, [])

  return (
    <div className="h-[calc(100dvh-72px)] flex flex-col bg-[#F5F1EC] overflow-hidden">
      <div className="shrink-0 sticky top-0 z-40 bg-[#F5F1EC] border-b border-[#E0DDD8] px-5 max-w-lg mx-auto w-full flex items-center justify-between h-12">
        <button onClick={() => router.back()} className="text-sm text-tertiary">뒤로</button>
        <h1 className="text-subtitle text-primary">기다림 일기</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain max-w-lg mx-auto w-full pb-4">
        {journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center">
              <PenIcon className="w-7 h-7 text-tertiary" />
            </div>
            <p className="text-subtitle text-primary">아직 기다림 일기가 없어요</p>
            <p className="text-body text-tertiary">기다림 페이지에서 첫 일기를 남겨보세요</p>
          </div>
        ) : (
          <div className="mx-4 mt-2 flex flex-col gap-3">
            {journals.map((entry, i) => (
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
                  <p className="text-body text-[var(--color-primary)] mt-3 italic leading-relaxed border-t border-[#F0EDE8] pt-3">
                    {entry.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
