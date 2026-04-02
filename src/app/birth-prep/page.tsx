'use client'

import { useRouter } from 'next/navigation'
import BabyItemChecklist from '@/components/pregnant/BabyItemChecklist'

export default function BirthPrepPage() {
  const router = useRouter()

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      {/* 헤더 */}
      <div className="sticky top-[72px] z-30 bg-white/95 backdrop-blur-lg border-b border-[#E8E4DF]/60">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full flex items-center justify-center text-primary active:bg-[#F0EDE8]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-subtitle font-bold text-primary flex-1">출산 준비물 체크리스트</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 pt-4 pb-8 space-y-3">
        {/* 안내 */}
        <div className="bg-[var(--color-primary-bg)] rounded-2xl px-4 py-3">
          <p className="text-body text-[var(--color-primary)] font-semibold">💡 주차에 맞게 준비해요</p>
          <p className="text-caption text-secondary mt-0.5">카테고리별로 필요한 시기가 달라요. 체크하면 자동 저장돼요.</p>
        </div>

        {/* 체크리스트 — 전체 항목 표시 (week=40) */}
        <BabyItemChecklist currentWeek={40} />
      </div>
    </div>
  )
}
