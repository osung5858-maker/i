import type { Metadata } from 'next'
import ReportsListClient from './_components/ReportsListClient'

export const metadata: Metadata = {
  title: '신고 관리 | 도담 어드민',
  robots: { index: false, follow: false },
}

export default function AdminReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">신고 관리</h2>
        <p className="text-sm text-gray-500 mt-1">게시글 신고 접수 및 처리</p>
      </div>
      <ReportsListClient />
    </div>
  )
}
