import type { Metadata } from 'next'
import StatsClient from './_components/StatsClient'

export const metadata: Metadata = {
  title: '상세 통계 | 도담 어드민',
  robots: { index: false, follow: false },
}

export default function AdminStatsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">상세 통계</h2>
        <p className="text-sm text-gray-500 mt-1">30일간 DAU, 게시글 추이, 모드 분포, 인기 페이지</p>
      </div>
      <StatsClient />
    </div>
  )
}
