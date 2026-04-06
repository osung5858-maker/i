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
    const status = searchParams.get('status')

    const supabase = createAdminSupabase()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('gathering_post_reports')
      .select(
        'id, reporter_id, post_id, reason, status, reviewed_by, reviewed_at, admin_note, created_at, reporter:user_profiles!gathering_post_reports_reporter_id_fkey(nickname), post:posts!gathering_post_reports_post_id_fkey(content, board_type, hidden, user_id)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status && ['pending', 'resolved', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('[Admin Reports API] Query error:', error)
      return NextResponse.json({ error: '신고 목록을 가져올 수 없습니다' }, { status: 500 })
    }

    return NextResponse.json({
      reports: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    })
  } catch (error) {
    console.error('[Admin Reports API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
