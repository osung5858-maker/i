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
 * GET /api/admin/ads — 전체 광고 슬롯 목록 조회
 */
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
    const { data, error } = await supabase
      .from('ad_settings')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    return NextResponse.json({ slots: data })
  } catch (error) {
    console.error('[Admin Ads API] GET Error:', error)
    return NextResponse.json(
      { error: '광고 설정을 불러오는 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/admin/ads — 광고 슬롯 설정 업데이트
 * Body: { id, enabled?, unit_id?, width?, height? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const { id, enabled, unit_id, width, height } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: '슬롯 ID가 필요합니다' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }
    if (typeof enabled === 'boolean') updates.enabled = enabled
    if (typeof unit_id === 'string') updates.unit_id = unit_id
    if (typeof width === 'number') updates.width = width
    if (typeof height === 'number') updates.height = height

    const supabase = createAdminSupabase()

    const { data, error } = await supabase
      .from('ad_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Audit log
    await supabase.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: 'update_ad_setting',
      target_type: 'ad_settings',
      target_id: user.id, // UUID required by schema
      details: { slot_id: id, changes: updates },
    })

    return NextResponse.json({ slot: data })
  } catch (error) {
    console.error('[Admin Ads API] PATCH Error:', error)
    return NextResponse.json(
      { error: '광고 설정 업데이트 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
