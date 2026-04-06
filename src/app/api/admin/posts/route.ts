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
    const boardType = searchParams.get('board_type')
    const hidden = searchParams.get('hidden')
    const search = searchParams.get('search')

    const supabase = createAdminSupabase()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('posts')
      .select(
        'id, user_id, board_type, board_key, content, photos, like_count, comment_count, hidden, hidden_by, hidden_at, created_at, updated_at, user_profiles!posts_user_id_fkey(nickname, mode)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (boardType) {
      query = query.eq('board_type', boardType)
    }

    if (hidden === 'true') {
      query = query.eq('hidden', true)
    } else if (hidden === 'false') {
      query = query.eq('hidden', false)
    }

    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('[Admin Posts API] Query error:', error)
      return NextResponse.json({ error: '게시글 목록을 가져올 수 없습니다' }, { status: 500 })
    }

    return NextResponse.json({
      posts: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    })
  } catch (error) {
    console.error('[Admin Posts API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
