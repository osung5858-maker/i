import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { reportId } = await params
    const body = await request.json()
    const { status } = body as {
      status: 'resolved' | 'rejected'
    }

    if (!status || !['resolved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'status는 resolved 또는 rejected여야 합니다' },
        { status: 400 },
      )
    }

    const supabase = createAdminSupabase()

    // gathering_post_reports 실제 컬럼: id, post_id, reporter_id, reason, status, created_at
    const { data: report, error: reportError } = await supabase
      .from('gathering_post_reports')
      .update({ status })
      .eq('id', reportId)
      .select()
      .single()

    if (reportError || !report) {
      console.error('[Admin Report Action API] Update error:', reportError)
      return NextResponse.json({ error: '신고 처리에 실패했습니다' }, { status: 500 })
    }

    // resolved인 경우 해당 게시글 삭제 (gathering_posts 테이블)
    if (status === 'resolved' && report.post_id) {
      await supabase
        .from('gathering_posts')
        .delete()
        .eq('id', report.post_id)
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('[Admin Report Action API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
