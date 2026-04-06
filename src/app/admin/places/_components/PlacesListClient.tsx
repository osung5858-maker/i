'use client'

import { useEffect, useState, useCallback } from 'react'

interface Place {
  id: string
  name: string
  category: string
  address: string
  phone: string | null
  avg_rating: number
  review_count: number
  source: string
  verified: boolean
  created_at: string
}

interface PlacesResponse {
  places: Place[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const CATEGORY_LABELS: Record<string, string> = {
  pediatric: '소아과',
  kids_cafe: '키즈카페',
  nursing_room: '수유실',
  playground: '놀이터',
  pharmacy: '약국',
  culture_center: '문화센터',
}

export default function PlacesListClient() {
  const [data, setData] = useState<PlacesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPlaces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (categoryFilter) params.set('category', categoryFilter)
      if (verifiedFilter) params.set('verified', verifiedFilter)

      const res = await fetch(`/api/admin/places?${params}`)
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
  }, [page, search, categoryFilter, verifiedFilter])

  useEffect(() => { fetchPlaces() }, [fetchPlaces])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const handleToggleVerified = async (place: Place) => {
    const newVerified = !place.verified
    const msg = newVerified
      ? `'${place.name}' 장소를 인증 처리하시겠습니까?`
      : `'${place.name}' 장소의 인증을 해제하시겠습니까?`
    if (!confirm(msg)) return

    setActionLoading(place.id)
    try {
      const res = await fetch(`/api/admin/places/${place.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: newVerified }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '처리 실패')
      }
      await fetchPlaces()
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
                placeholder="장소명 검색..."
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
            <label className="block text-xs text-gray-500 mb-1">카테고리</label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">전체</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">인증 상태</label>
            <select
              value={verifiedFilter}
              onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">전체</option>
              <option value="true">인증됨</option>
              <option value="false">미인증</option>
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
        ) : !data || data.places.length === 0 ? (
          <div className="p-8 text-center text-gray-400">장소가 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">장소명</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">주소</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">카테고리</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">인증</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">리뷰</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">평점</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">등록일</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {data.places.map((place) => (
                    <PlaceRow
                      key={place.id}
                      place={place}
                      actionLoading={actionLoading}
                      onToggleVerified={handleToggleVerified}
                      formatDate={formatDate}
                    />
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

function PlaceRow({
  place,
  actionLoading,
  onToggleVerified,
  formatDate,
}: {
  place: Place
  actionLoading: string | null
  onToggleVerified: (place: Place) => void
  formatDate: (iso: string) => string
}) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{place.name}</td>
      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{place.address}</td>
      <td className="px-4 py-3">
        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
          {CATEGORY_LABELS[place.category] || place.category}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {place.verified ? (
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-600 font-medium">인증</span>
        ) : (
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500 font-medium">미인증</span>
        )}
      </td>
      <td className="px-4 py-3 text-center text-gray-600">{place.review_count}</td>
      <td className="px-4 py-3 text-center text-gray-600">
        {place.avg_rating > 0 ? Number(place.avg_rating).toFixed(1) : '-'}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(place.created_at)}</td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggleVerified(place)}
          disabled={actionLoading === place.id}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
            place.verified
              ? 'bg-red-50 text-red-700 hover:bg-red-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          {actionLoading === place.id ? '처리중...' : place.verified ? '인증 해제' : '인증'}
        </button>
      </td>
    </tr>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="border-b border-gray-100 bg-gray-50 h-10" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-10" />
          <div className="h-4 bg-gray-200 rounded w-10" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  )
}
