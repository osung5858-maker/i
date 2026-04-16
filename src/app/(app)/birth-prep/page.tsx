'use client'

import BabyItemChecklist from '@/components/pregnant/BabyItemChecklist'
import PageHeader from '@/components/layout/PageHeader'

export default function BirthPrepPage() {
  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      <PageHeader title="출산 준비물 체크리스트" />

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
