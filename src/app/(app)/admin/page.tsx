import type { Metadata } from 'next'
import DashboardClient from './_components/DashboardClient'

export const metadata: Metadata = {
  title: '대시보드 | 도담 어드민',
  robots: { index: false, follow: false },
}

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">대시보드</h2>
        <p className="text-sm text-gray-500 mt-1">서비스 핵심 지표 한눈에 보기</p>
      </div>
      <DashboardClient />
    </div>
  )
}
