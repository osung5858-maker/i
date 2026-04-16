'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

interface DetailedStats {
  dau_trend: { date: string; count: number }[]
  posts_per_day: { date: string; count: number }[]
  mode_distribution: { name: string; key: string; value: number }[]
  top_pages: { path: string; views: number }[]
}

const PIE_COLORS = ['#f59e0b', '#8b5cf6', '#10b981']

export default function StatsClient() {
  const [stats, setStats] = useState<DetailedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats/detailed')
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `HTTP ${res.status}`)
        }
        setStats(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) return <StatsSkeleton />

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">오류 발생</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Charts row - DAU + Posts per day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">일별 활성 사용자 (DAU, 30일)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dau_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval={Math.floor(stats.dau_trend.length / 8)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#6366f1' }}
                  activeDot={{ r: 5 }}
                  name="DAU"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Posts per day */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">일별 게시글 수 (30일)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.posts_per_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval={Math.floor(stats.posts_per_day.length / 8)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10b981" name="게시글" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mode distribution + Top pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mode distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">모드별 유저 분포</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.mode_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  dataKey="value"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={(entry: any) =>
                    `${entry.name} ${((entry.percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {stats.mode_distribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 pages table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">인기 페이지 Top 10 (30일)</h3>
          {stats.top_pages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">데이터가 없습니다</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-2 font-medium text-gray-600 w-10">#</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">페이지</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">조회수</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_pages.map((item, idx) => (
                    <tr key={item.path} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2 text-gray-800 font-mono text-xs">{item.path}</td>
                      <td className="px-3 py-2 text-right text-gray-600 font-medium">
                        {item.views.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-96">
          <div className="h-3 bg-gray-200 rounded w-48 mb-4" />
          <div className="h-72 bg-gray-100 rounded" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-96">
          <div className="h-3 bg-gray-200 rounded w-40 mb-4" />
          <div className="h-72 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-96">
          <div className="h-3 bg-gray-200 rounded w-36 mb-4" />
          <div className="h-72 bg-gray-100 rounded" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-96">
          <div className="h-3 bg-gray-200 rounded w-44 mb-4" />
          <div className="h-72 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  )
}
