'use client'

import { PageHeader } from '@/components/layout/PageLayout'
import BabyFoodGuide from '@/components/feeding/BabyFoodGuide'

export default function BabyFoodPage() {
  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="이유식 가이드" showBack />
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28">
        <BabyFoodGuide />
      </div>
    </div>
  )
}
