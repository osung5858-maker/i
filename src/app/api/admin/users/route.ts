import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search')?.trim() || ''
    const mode = searchParams.get('mode') || ''
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') === 'asc' ? true : false

    const supabase = createAdminSupabase()
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Build query on user_profiles
    let query = supabase
      .from('user_profiles')
      .select('user_id, mode, chosen_nickname, region, my_role, created_at, updated_at', { count: 'exact' })

    // Filter by mode
    if (mode && ['preparing', 'pregnant', 'parenting'].includes(mode)) {
      query = query.eq('mode', mode)
    }

    // Search by nickname
    if (search) {
      query = query.ilike('chosen_nickname', `%${search}%`)
    }

    // Sort
    const sortColumn = sort === 'updated_at' ? 'updated_at' : 'created_at'
    query = query.order(sortColumn, { ascending: order })

    // Paginate
    query = query.range(from, to)

    const { data: profiles, count, error: profilesError } = await query

    if (profilesError) {
      console.error('[Admin Users API] profiles error:', profilesError)
      return NextResponse.json({ error: '유저 목록을 가져올 수 없습니다' }, { status: 500 })
    }

    // Fetch emails from auth.users for the returned profiles
    const userIds = (profiles || []).map((p) => p.user_id)
    let emailMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: authData } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      })

      if (authData?.users) {
        for (const u of authData.users) {
          if (userIds.includes(u.id)) {
            emailMap[u.id] = u.email || ''
          }
        }
      }
    }

    // If search includes email-like pattern and no nickname matches, search emails
    let emailSearchResults: typeof profiles = []
    if (search && search.includes('@') && (!profiles || profiles.length === 0)) {
      const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      if (authUsers?.users) {
        const matchedIds = authUsers.users
          .filter((u) => u.email?.toLowerCase().includes(search.toLowerCase()))
          .map((u) => u.id)

        if (matchedIds.length > 0) {
          let emailQuery = supabase
            .from('user_profiles')
            .select('user_id, mode, chosen_nickname, region, my_role, created_at, updated_at', { count: 'exact' })
            .in('user_id', matchedIds)

          if (mode && ['preparing', 'pregnant', 'parenting'].includes(mode)) {
            emailQuery = emailQuery.eq('mode', mode)
          }

          emailQuery = emailQuery.order(sortColumn, { ascending: order }).range(from, to)
          const { data: emailProfiles, count: emailCount } = await emailQuery

          if (emailProfiles && emailProfiles.length > 0) {
            // Update emailMap for these results
            for (const u of authUsers.users) {
              if (matchedIds.includes(u.id)) {
                emailMap[u.id] = u.email || ''
              }
            }
            return NextResponse.json({
              users: emailProfiles.map((p) => ({
                ...p,
                email: emailMap[p.user_id] || '',
              })),
              total: emailCount ?? 0,
              page,
              limit,
            })
          }
        }
      }
    }

    const users = (profiles || []).map((p) => ({
      ...p,
      email: emailMap[p.user_id] || '',
    }))

    return NextResponse.json({
      users,
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('[Admin Users API] Error:', error)
    return NextResponse.json(
      { error: '유저 목록을 가져오는 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
