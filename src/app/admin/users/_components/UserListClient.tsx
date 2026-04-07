'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'

interface UserRow {
  user_id: string
  name: string | null
  email: string
  mode: string | null
  status: string | null
  created_at: string
  updated_at: string
}

interface UsersResponse {
  users: UserRow[]
  total: number
  page: number
  limit: number
}

const MODE_LABELS: Record<string, string> = {
  preparing: '준비중',
  pregnant: '임신중',
  parenting: '육아중',
}

const MODE_COLORS: Record<string, string> = {
  preparing: 'bg-amber-100 text-amber-700',
  pregnant: 'bg-purple-100 text-purple-700',
  parenting: 'bg-green-100 text-green-700',
}

const columnHelper = createColumnHelper<UserRow>()

export default function UserListClient() {
  const [data, setData] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (modeFilter) params.set('mode', modeFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      const json: UsersResponse = await res.json()
      setData(json.users)
      setTotal(json.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedSearch, modeFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const columns = useMemo<ColumnDef<UserRow, unknown>[]>(
    () => [
      columnHelper.accessor('name', {
        header: '이름',
        cell: (info) => (
          <span className="font-medium text-gray-900">
            {info.getValue() || '-'}
          </span>
        ),
      }) as ColumnDef<UserRow, unknown>,
      columnHelper.accessor('email', {
        header: '이메일',
        cell: (info) => (
          <span className="text-gray-600 text-sm">{info.getValue() || '-'}</span>
        ),
      }) as ColumnDef<UserRow, unknown>,
      columnHelper.accessor('mode', {
        header: '모드',
        cell: (info) => {
          const mode = info.getValue()
          if (!mode) return <span className="text-gray-400">-</span>
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${MODE_COLORS[mode] || 'bg-gray-100 text-gray-600'}`}
            >
              {MODE_LABELS[mode] || mode}
            </span>
          )
        },
      }) as ColumnDef<UserRow, unknown>,
      columnHelper.accessor('status', {
        header: '상태',
        cell: (info) => {
          const status = info.getValue()
          if (!status) return <span className="text-gray-400">-</span>
          return (
            <span className="text-gray-600 text-sm">{status}</span>
          )
        },
      }) as ColumnDef<UserRow, unknown>,
      columnHelper.accessor('created_at', {
        header: '가입일',
        cell: (info) => {
          const val = info.getValue()
          if (!val) return '-'
          return (
            <span className="text-gray-600 text-sm">
              {new Date(val).toLocaleDateString('ko-KR')}
            </span>
          )
        },
      }) as ColumnDef<UserRow, unknown>,
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / limit),
  })

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="이름 또는 이메일 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        />
        <select
          value={modeFilter}
          onChange={(e) => {
            setModeFilter(e.target.value)
            setPage(1)
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">전체 모드</option>
          <option value="preparing">준비중</option>
          <option value="pregnant">임신중</option>
          <option value="parenting">육아중</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 font-medium">오류 발생</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-gray-100 bg-gray-50">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                      검색 결과가 없습니다
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-50 hover:bg-indigo-50/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!error && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              총 <span className="font-medium text-gray-700">{total.toLocaleString()}</span>명
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                이전
              </button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
