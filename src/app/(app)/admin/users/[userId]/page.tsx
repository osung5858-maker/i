import type { Metadata } from 'next'
import UserDetailClient from './_components/UserDetailClient'

export const metadata: Metadata = {
  title: '유저 상세 | 도담 어드민',
  robots: { index: false, follow: false },
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  return (
    <div>
      <UserDetailClient userId={userId} />
    </div>
  )
}
