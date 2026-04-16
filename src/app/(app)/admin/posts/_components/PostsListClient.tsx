'use client'

import { useEffect, useState, useCallback } from 'react'

interface Post {
  id: string
  user_id: string
  board_type: string
  board_key: string | null
  content: string
  photos: unknown
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

interface PostsResponse {
  posts: Post[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const BOARD_TYPE_LABELS: Record<string, string> = {
  community: '커뮤니티',
  gathering: '모임',
  market: '장터',
}

export default function PostsListClient() {
  const [data, setData] = useState<PostsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [boardTypeFilter, setBoardTypeFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (boardTypeFilter) params.set('board_type', boardTypeFilter)

      const res = await fetch(`/api/admin/posts?${params}`)
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [page, search, boardTypeFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const handleDelete = async (post: Post) => {
    if (!confirm('이 게시글을 삭제하시겠습니까? 복구할 수 없습니다.')) return

    setActionLoading(post.id)
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '삭제 실패')
      }
      await fetchPosts()
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">검색</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="내용 키워드 검색..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                검색
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">게시판</label>
            <select
              value={boardTypeFilter}
              onChange={(e) => { setBoardTypeFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">전체</option>
              <option value="community">커뮤니티</option>
              <option value="gathering">모임</option>
              <option value="market">장터</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : !data || data.posts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">게시글이 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">내용</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">게시판</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">작성자 ID</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">좋아요</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">댓글</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">작성일</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {data.posts.map((post) => (
                    <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 max-w-[240px]">
                        <span className="truncate block text-gray-800">
                          {post.content?.slice(0, 50) || '(내용 없음)'}
                          {(post.content?.length ?? 0) > 50 && '...'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
                          {BOARD_TYPE_LABELS[post.board_type] || post.board_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                        {post.user_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{post.like_count}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{post.comment_count}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(post.created_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(post)}
                          disabled={actionLoading === post.id}
                          className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === post.id ? '...' : '삭제'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                전체 {data.total}건 중 {(data.page - 1) * data.limit + 1}-{Math.min(data.page * data.limit, data.total)}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                >
                  이전
                </button>
                <span className="px-3 py-1.5 text-xs text-gray-600">
                  {data.page} / {data.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                >
                  다음
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="border-b border-gray-100 bg-gray-50 h-10" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-10" />
          <div className="h-4 bg-gray-200 rounded w-10" />
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  )
}
