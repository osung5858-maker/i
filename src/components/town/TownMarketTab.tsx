'use client'

import { Suspense } from 'react'
import { CommunityPageInner } from '@/app/(app)/community/page'

// 도담장터는 기존 커뮤니티의 장터 기능을 사용합니다
export default function TownMarketTab({ range }: { range: number }) {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    }>
      <CommunityPageInner initialTab="market" hideHeader />
    </Suspense>
  )
}
