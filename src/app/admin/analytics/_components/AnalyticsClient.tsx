'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

interface DailyView {
  date: string
  views: number
  unique_visitors: number
}

interface TopPage {
  path: string
  views: number
}

interface AnalyticsData {
  total_views: number
  unique_visitors: number
  avg_views_per_day: number
  daily_views: DailyView[]
  top_pages: TopPage[]
}

type RangeKey = '7d' | '30d' | '90d'

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '최근 7일', days: 7 },
  { key: '30d', label: '최근 30일', days: 30 },
  { key: '90d', label: '최근 90일', days: 90 },
]

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>('30d')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const days = RANGES.find((r) => r.key === range)?.days || 30
      const end = new Date()
      const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
      const params = new URLSearchParams({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      })
      const res = await fetch(`/api/admin/analytics?${params}`)
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
  }, [range])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <LoadingSkeleton />
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>
  if (!data) return <div className="p-8 text-center text-gray-400">데이터가 없습니다</div>

  const top10 = data.top_pages.slice(0, 10)
  const totalForPercent = data.total_views || 1

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-fit">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
              range === r.key
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="총 조회수" value={data.total_views.toLocaleString()} />
        <SummaryCard label="순 방문자" value={data.unique_visitors.toLocaleString()} />
        <SummaryCard label="일평균 조회수" value={data.avg_views_per_day.toLocaleString()} />
      </div>

      {/* Daily views line chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">일별 페이지뷰 추이</h3>
        {data.daily_views.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            기간 내 데이터가 없습니다
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.daily_views}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => {
                  const parts = v.split('-')
                  return `${parts[1]}/${parts[2]}`
                }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(v: any) => String(v)}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="views"
                name="조회수"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="unique_visitors"
                name="순 방문자"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top pages bar chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">인기 페이지 Top 10</h3>
        {top10.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            기간 내 데이터가 없습니다
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={top10.length * 40 + 40}>
            <BarChart data={top10} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="path"
                tick={{ fontSize: 11 }}
                width={110}
              />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="views" name="조회수" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detailed page table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-700 px-5 pt-5 pb-3">
          페이지별 상세 조회수
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">페이지 경로</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">조회수</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">비율</th>
              </tr>
            </thead>
            <tbody>
              {data.top_pages.map((page, idx) => (
                <tr
                  key={page.path}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                      {page.path}
                    </code>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-800 font-medium">
                    {page.views.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {((page.views / totalForPercent) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {data.top_pages.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    기간 내 페이지뷰 데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-xl w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-16" />
            <div className="h-8 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    </div>
  )
}
