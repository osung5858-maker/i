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
    const { status, admin_note, hide_post } = body as {
      status: 'resolved' | 'rejected'
      admin_note?: string
      hide_post?: boolean
    }

    if (!status || !['resolved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'status는 resolved 또는 rejected여야 합니다' },
        { status: 400 },
      )
    }

    const supabase = createAdminSupabase()

    // Update report
    const { data: report, error: reportError } = await supabase
      .from('gathering_post_reports')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_note: admin_note || null,
      })
      .eq('id', reportId)
      .select('*, post:posts!gathering_post_reports_post_id_fkey(id, content)')
      .single()

    if (reportError || !report) {
      console.error('[Admin Report Action API] Update error:', reportError)
      return NextResponse.json({ error: '신고 처리에 실패했습니다' }, { status: 500 })
    }

    // Optionally hide the reported post when resolving
    if (status === 'resolved' && hide_post && report.post_id) {
      const { error: hideError } = await supabase
        .from('posts')
        .update({
          hidden: true,
          hidden_by: user.id,
          hidden_at: new Date().toISOString(),
        })
        .eq('id', report.post_id)

      if (hideError) {
        console.error('[Admin Report Action API] Hide post error:', hideError)
      }

      // Audit log for post hide
      await supabase.from('admin_audit_log').insert({
        admin_user_id: user.id,
        action: 'post_hide_via_report',
        target_type: 'post',
        target_id: report.post_id,
        details: { report_id: reportId, reason: report.reason },
      })
    }

    // Audit log for report action
    await supabase.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: `report_${status}`,
      target_type: 'report',
      target_id: reportId,
      details: {
        status,
        admin_note: admin_note || null,
        hide_post: !!hide_post,
        post_id: report.post_id,
      },
    })

    return NextResponse.json({ report })
  } catch (error) {
    console.error('[Admin Report Action API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
