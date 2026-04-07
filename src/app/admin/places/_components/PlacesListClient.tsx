'use client'

import { useEffect, useState, useCallback } from 'react'

interface Place {
  place_id: string
  place_name: string | null
  review_count: number
  avg_rating: number
  latest_review: string
}

interface PlacesResponse {
  places: Place[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function PlacesListClient() {
  const [data, setData] = useState<PlacesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const fetchPlaces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)

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
  }, [page, search])

  useEffect(() => { fetchPlaces() }, [fetchPlaces])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="장소명, 장소 ID 또는 리뷰 내용 검색..."
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : !data || data.places.length === 0 ? (
          <div className="p-8 text-center text-gray-400">리뷰가 등록된 장소가 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">장소명</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">리뷰 수</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">평균 평점</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">최근 리뷰</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">카카오맵</th>
                  </tr>
                </thead>
                <tbody>
                  {data.places.map((place, idx) => (
                    <tr key={place.place_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {(data.page - 1) * data.limit + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {place.place_name || <span className="text-gray-400 italic">이름 없음</span>}
                        </div>
                        <code className="text-[10px] text-gray-400">{place.place_id}</code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 font-medium">
                          {place.review_count}건
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-amber-500">★</span>{' '}
                        <span className="font-medium text-gray-800">{place.avg_rating}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(place.latest_review)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={`https://place.map.kakao.com/${place.place_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors inline-block"
                        >
                          보기
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                전체 {data.total}개 장소
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
          <div className="h-4 bg-gray-200 rounded w-8" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
      ))}
    </div>
  )
}
