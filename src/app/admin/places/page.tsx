import type { Metadata } from 'next'
import PlacesListClient from './_components/PlacesListClient'

export const metadata: Metadata = {
  title: '장소 관리 | 도담 어드민',
  robots: { index: false, follow: false },
}

export default function AdminPlacesPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">장소 관리</h2>
        <p className="text-sm text-gray-500 mt-1">등록된 장소 조회 및 인증 관리</p>
      </div>
      <PlacesListClient />
    </div>
  )
}
