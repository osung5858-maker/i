import type { Metadata } from 'next'
import PostsListClient from './_components/PostsListClient'

export const metadata: Metadata = {
  title: '게시글 관리 | 도담 어드민',
  robots: { index: false, follow: false },
}

export default function AdminPostsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">게시글 관리</h2>
        <p className="text-sm text-gray-500 mt-1">전체 게시글 조회 및 숨김 관리</p>
      </div>
      <PostsListClient />
    </div>
  )
}
