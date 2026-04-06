import type { Metadata } from 'next'
import UserListClient from './_components/UserListClient'

export const metadata: Metadata = {
  title: '유저 관리 | 도담 어드민',
  robots: { index: false, follow: false },
}

export default function AdminUsersPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">유저 관리</h2>
        <p className="text-sm text-gray-500 mt-1">전체 유저 목록 조회 및 관리</p>
      </div>
      <UserListClient />
    </div>
  )
}
