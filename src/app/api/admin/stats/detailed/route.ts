import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const supabase = createAdminSupabase()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [pageViewsRes, postsRes, modeRes, topPagesRes] = await Promise.all([
      // Page views for DAU calculation (30 days)
      supabase
        .from('page_views')
        .select('user_id, created_at')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true }),
      // Posts per day (30 days)
      supabase
        .from('posts')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true }),
      // Mode distribution over time
      supabase
        .from('user_profiles')
        .select('mode, created_at'),
      // Top pages
      supabase
        .from('page_views')
        .select('path')
        .gte('created_at', thirtyDaysAgo),
    ])

    // --- DAU trend (30 days) ---
    const dauByDate = buildDailyMap(now, 30)
    if (pageViewsRes.data) {
      const dateUserMap: Record<string, Set<string>> = {}
      for (const row of pageViewsRes.data) {
        if (!row.user_id) continue
        const dateKey = toDateKey(row.created_at)
        if (!dateUserMap[dateKey]) dateUserMap[dateKey] = new Set()
        dateUserMap[dateKey].add(row.user_id)
      }
      for (const [dateKey, users] of Object.entries(dateUserMap)) {
        if (dauByDate[dateKey] !== undefined) {
          dauByDate[dateKey] = users.size
        }
      }
    }
    const dau_trend = Object.entries(dauByDate).map(([date, count]) => ({ date, count }))

    // --- Posts per day (30 days) ---
    const postsByDate = buildDailyMap(now, 30)
    if (postsRes.data) {
      for (const row of postsRes.data) {
        const dateKey = toDateKey(row.created_at)
        if (postsByDate[dateKey] !== undefined) postsByDate[dateKey]++
      }
    }
    const posts_per_day = Object.entries(postsByDate).map(([date, count]) => ({ date, count }))

    // --- Mode distribution ---
    const modeMap: Record<string, number> = { preparing: 0, pregnant: 0, parenting: 0 }
    if (modeRes.data) {
      for (const row of modeRes.data) {
        const m = row.mode as string
        if (m && modeMap[m] !== undefined) modeMap[m]++
      }
    }
    const mode_distribution = Object.entries(modeMap).map(([key, value]) => ({
      name: key === 'preparing' ? '준비중' : key === 'pregnant' ? '임신중' : '육아중',
      key,
      value,
    }))

    // --- Top 10 visited pages ---
    const pageCountMap: Record<string, number> = {}
    if (topPagesRes.data) {
      for (const row of topPagesRes.data) {
        const p = row.path as string
        if (!p) continue
        pageCountMap[p] = (pageCountMap[p] || 0) + 1
      }
    }
    const top_pages = Object.entries(pageCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }))

    return NextResponse.json({
      dau_trend,
      posts_per_day,
      mode_distribution,
      top_pages,
    })
  } catch (error) {
    console.error('[Admin Detailed Stats API] Error:', error)
    return NextResponse.json(
      { error: '상세 통계 데이터를 가져오는 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}

/** Build a date->0 map for the last N days */
function buildDailyMap(now: Date, days: number): Record<string, number> {
  const map: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    map[toDateKey(d.toISOString())] = 0
  }
  return map
}

/** ISO string -> M/D format */
function toDateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
