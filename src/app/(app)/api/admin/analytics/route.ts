import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * GET /api/admin/analytics — 페이지뷰 집계 데이터
 * Query params: start_date, end_date (ISO strings, defaults to last 30 days)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const now = new Date()
    const endDate = searchParams.get('end_date') || now.toISOString()
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const startDate = searchParams.get('start_date') || defaultStart

    const supabase = createAdminSupabase()

    // Fetch all page_views in the date range
    const { data: views, error } = await supabase
      .from('page_views')
      .select('path, user_id, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Admin Analytics API] page_views query error:', error.message)
    }

    const rows = views || []

    // --- Aggregate: top pages ---
    const pathCounts: Record<string, number> = {}
    for (const row of rows) {
      pathCounts[row.path] = (pathCounts[row.path] || 0) + 1
    }
    const topPages = Object.entries(pathCounts)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 30)

    // --- Aggregate: daily views + unique visitors ---
    const dailyMap: Record<string, { views: number; users: Set<string> }> = {}
    for (const row of rows) {
      const dateKey = row.created_at.slice(0, 10) // YYYY-MM-DD
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { views: 0, users: new Set() }
      }
      dailyMap[dateKey].views++
      if (row.user_id) dailyMap[dateKey].users.add(row.user_id)
    }

    const dailyViews = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        views: d.views,
        unique_visitors: d.users.size,
      }))

    // --- Summary ---
    const totalViews = rows.length
    const allUsers = new Set(rows.filter((r) => r.user_id).map((r) => r.user_id))
    const uniqueVisitors = allUsers.size
    const dayCount = dailyViews.length || 1
    const avgViewsPerDay = Math.round(totalViews / dayCount)

    return NextResponse.json({
      total_views: totalViews,
      unique_visitors: uniqueVisitors,
      avg_views_per_day: avgViewsPerDay,
      daily_views: dailyViews,
      top_pages: topPages,
      start_date: startDate,
      end_date: endDate,
    })
  } catch (error) {
    console.error('[Admin Analytics API] Error:', error)
    return NextResponse.json(
      { error: '페이지 분석 데이터를 불러오는 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
