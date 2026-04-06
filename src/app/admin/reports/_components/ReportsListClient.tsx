'use client'

import { useEffect, useState, useCallback } from 'react'

interface ReportPost {
  content: string | null
  board_type: string | null
  hidden: boolean
  user_id: string
}

interface ReportReporter {
  nickname: string | null
}

interface Report {
  id: string
  reporter_id: string
  post_id: string
  reason: string
  status: 'pending' | 'resolved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  admin_note: string | null
  created_at: string
  reporter: ReportReporter | null
  post: ReportPost | null
}

interface ReportsResponse {
  reports: Report[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_TABS = [
  { value: '', label: '전체' },
  { value: 'pending', label: '대기중' },
  { value: 'resolved', label: '처리됨' },
  { value: 'rejected', label: '거절됨' },
] as const

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '대기중' },
  resolved: { bg: 'bg-green-50', text: 'text-green-700', label: '처리됨' },
  rejected: { bg: 'bg-gray-100', text: 'text-gray-600', label: '거절됨' },
}

export default function ReportsListClient() {
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/admin/reports?${params}`)
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
  }, [page, statusFilter])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleAction = async (report: Report, action: 'resolved' | 'rejected', hidePost: boolean) => {
    const actionLabel = action === 'resolved' ? '승인' : '거절'
    const msg = hidePost
      ? `이 신고를 ${actionLabel}하고 게시글을 숨김 처리하시겠습니까?`
      : `이 신고를 ${actionLabel} 처리하시겠습니까?`
    if (!confirm(msg)) return

    setActionLoading(report.id)
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          admin_note: noteInputs[report.id] || '',
          hide_post: hidePost,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '처리 실패')
      }
      setNoteInputs((prev) => { const n = { ...prev }; delete n[report.id]; return n })
      await fetchReports()
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
      {/* Status tabs */}
      <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : !data || data.reports.length === 0 ? (
          <div className="p-8 text-center text-gray-400">신고 내역이 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">신고자</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">게시글 미리보기</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">신고 사유</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">상태</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">신고일</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">관리자 메모</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.map((report) => {
                    const badge = STATUS_BADGES[report.status] || STATUS_BADGES.pending
                    const isPending = report.status === 'pending'
                    return (
                      <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600">
                          {report.reporter?.nickname || '알 수 없음'}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="truncate block text-gray-800">
                            {report.post?.content?.slice(0, 40) || '(삭제된 게시글)'}
                            {(report.post?.content?.length ?? 0) > 40 && '...'}
                          </span>
                          {report.post?.hidden && (
                            <span className="text-xs text-red-500">(숨김 상태)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[160px]">
                          <span className="truncate block">{report.reason}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(report.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {isPending ? (
                            <input
                              type="text"
                              value={noteInputs[report.id] || ''}
                              onChange={(e) => setNoteInputs((prev) => ({ ...prev, [report.id]: e.target.value }))}
                              placeholder="관리자 메모 (선택)"
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : (
                            <span className="text-xs text-gray-500">{report.admin_note || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isPending ? (
                            <div className="flex gap-1 justify-center flex-wrap">
                              <button
                                onClick={() => handleAction(report, 'resolved', true)}
                                disabled={actionLoading === report.id}
                                className="px-2.5 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                                title="승인 + 게시글 숨김"
                              >
                                {actionLoading === report.id ? '...' : '승인+숨김'}
                              </button>
                              <button
                                onClick={() => handleAction(report, 'resolved', false)}
                                disabled={actionLoading === report.id}
                                className="px-2.5 py-1.5 text-xs rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading === report.id ? '...' : '승인'}
                              </button>
                              <button
                                onClick={() => handleAction(report, 'rejected', false)}
                                disabled={actionLoading === report.id}
                                className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading === report.id ? '...' : '거절'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">처리 완료</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-14" />
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      ))}
    </div>
  )
}
