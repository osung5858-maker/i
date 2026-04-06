import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

/**
 * Service-role Supabase client for admin operations.
 * Bypasses RLS — only used in server-side API routes with admin auth guard.
 */
function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  try {
    // Auth guard: verify admin role
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const supabase = createAdminSupabase()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Parallel queries for performance
    const [
      usersRes,
      newTodayRes,
      postsRes,
      todayPostsRes,
      pendingReportsRes,
      modeDistRes,
      dauRes,
      mauRes,
      dailySignupsRes,
    ] = await Promise.all([
      // Total users
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      // New users today
      supabase.from('user_profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      // Total posts
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      // Today's posts
      supabase.from('posts').select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      // Pending reports
      supabase.from('gathering_post_reports').select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      // Mode distribution
      supabase.from('user_profiles').select('mode'),
      // DAU: distinct users who posted or have events today
      supabase.from('posts').select('user_id')
        .gte('created_at', todayStart),
      // MAU: distinct users who posted in last 30 days
      supabase.from('posts').select('user_id')
        .gte('created_at', thirtyDaysAgo),
      // Daily signups for last 7 days
      supabase.from('user_profiles').select('created_at')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true }),
    ])

    // Process mode distribution
    const modeMap: Record<string, number> = { preparing: 0, pregnant: 0, parenting: 0 }
    if (modeDistRes.data) {
      for (const row of modeDistRes.data) {
        const m = row.mode as string
        if (m && modeMap[m] !== undefined) modeMap[m]++
      }
    }
    const mode_distribution = Object.entries(modeMap).map(([name, value]) => ({
      name: name === 'preparing' ? '준비중' : name === 'pregnant' ? '임신중' : '육아중',
      value,
    }))

    // Process DAU (distinct user IDs)
    const dauSet = new Set<string>()
    if (dauRes.data) {
      for (const row of dauRes.data) dauSet.add(row.user_id)
    }

    // Process MAU (distinct user IDs)
    const mauSet = new Set<string>()
    if (mauRes.data) {
      for (const row of mauRes.data) mauSet.add(row.user_id)
    }

    // Process daily signups (group by date)
    const signupsByDate: Record<string, number> = {}
    // Initialize all 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = `${d.getMonth() + 1}/${d.getDate()}`
      signupsByDate[key] = 0
    }
    if (dailySignupsRes.data) {
      for (const row of dailySignupsRes.data) {
        const d = new Date(row.created_at)
        const key = `${d.getMonth() + 1}/${d.getDate()}`
        if (signupsByDate[key] !== undefined) signupsByDate[key]++
      }
    }
    const daily_signups_7d = Object.entries(signupsByDate).map(([date, count]) => ({
      date,
      count,
    }))

    return NextResponse.json({
      total_users: usersRes.count ?? 0,
      dau: dauSet.size,
      mau: mauSet.size,
      new_today: newTodayRes.count ?? 0,
      total_posts: postsRes.count ?? 0,
      today_posts: todayPostsRes.count ?? 0,
      pending_reports: pendingReportsRes.count ?? 0,
      mode_distribution,
      daily_signups_7d,
    })
  } catch (error) {
    console.error('[Admin Stats API] Error:', error)
    return NextResponse.json(
      { error: '통계 데이터를 가져오는 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
