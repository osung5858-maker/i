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

    // gathering_post_reports 실제 컬럼: id, post_id, reporter_id, reason, status, created_at
    let query = supabase
      .from('gathering_post_reports')
      .select(
        'id, reporter_id, post_id, reason, status, created_at',
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

    // post 내용 별도 조회 (gathering_post_reports → gathering_posts 참조)
    const postIds = [...new Set((data || []).map(r => r.post_id))]
    let postMap: Record<string, { content: string; user_id: string }> = {}
    if (postIds.length > 0) {
      const { data: posts } = await supabase
        .from('gathering_posts')
        .select('id, content, user_id')
        .in('id', postIds)
      if (posts) {
        for (const p of posts) {
          postMap[p.id] = { content: p.content, user_id: p.user_id }
        }
      }
    }

    const reports = (data || []).map(r => ({
      ...r,
      post_content: postMap[r.post_id]?.content?.substring(0, 100) || '',
      post_user_id: postMap[r.post_id]?.user_id || '',
    }))

    return NextResponse.json({
      reports,
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
