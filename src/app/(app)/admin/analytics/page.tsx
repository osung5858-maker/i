import type { Metadata } from 'next'
import AnalyticsClient from './_components/AnalyticsClient'

export const metadata: Metadata = {
  title: '페이지 분석 | 도담 어드민',
  robots: { index: false, follow: false },
}

export default function AdminAnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">페이지 분석</h2>
        <p className="text-sm text-gray-500 mt-1">페이지별 방문 추이 및 사용자 분석</p>
      </div>
      <AnalyticsClient />
    </div>
  )
}
