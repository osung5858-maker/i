import type { Metadata } from 'next'
import AdsClient from './_components/AdsClient'

export const metadata: Metadata = {
  title: '광고 관리 | 도담 어드민',
  robots: { index: false, follow: false },
}

export default function AdminAdsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">광고 관리</h2>
        <p className="text-sm text-gray-500 mt-1">광고 슬롯별 설정 관리 (활성/비활성, 광고 단위 ID, 크기)</p>
      </div>
      <AdsClient />
    </div>
  )
}
