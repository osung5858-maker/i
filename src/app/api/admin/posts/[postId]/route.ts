import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** GET: single post detail with user info and comments */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { postId } = await params
    const supabase = createAdminSupabase()

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(
        '*, user_profiles!posts_user_id_fkey(nickname, mode)',
      )
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: comments } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at, user_profiles!comments_user_id_fkey(nickname)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    return NextResponse.json({ post, comments: comments ?? [] })
  } catch (error) {
    console.error('[Admin Post Detail API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/** PATCH: toggle hidden status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { postId } = await params
    const body = await request.json()
    const { hidden } = body as { hidden: boolean }

    if (typeof hidden !== 'boolean') {
      return NextResponse.json({ error: 'hidden 값이 필요합니다' }, { status: 400 })
    }

    const supabase = createAdminSupabase()

    const updateData = hidden
      ? { hidden: true, hidden_by: user.id, hidden_at: new Date().toISOString() }
      : { hidden: false, hidden_by: null, hidden_at: null }

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (error) {
      console.error('[Admin Post Hide API] Update error:', error)
      return NextResponse.json({ error: '게시글 상태 변경에 실패했습니다' }, { status: 500 })
    }

    // Write audit log
    await supabase.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: hidden ? 'post_hide' : 'post_unhide',
      target_type: 'post',
      target_id: postId,
      details: { hidden, post_content_preview: data.content?.slice(0, 100) },
    })

    return NextResponse.json({ post: data })
  } catch (error) {
    console.error('[Admin Post Hide API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
