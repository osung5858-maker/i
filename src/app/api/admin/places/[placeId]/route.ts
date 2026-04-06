import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** GET: place detail with review count + average rating */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { placeId } = await params
    const supabase = createAdminSupabase()

    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('*')
      .eq('id', placeId)
      .single()

    if (placeError || !place) {
      return NextResponse.json({ error: '장소를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ place })
  } catch (error) {
    console.error('[Admin Place Detail API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/** PATCH: toggle verified status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { placeId } = await params
    const body = await request.json()
    const { verified } = body as { verified: boolean }

    if (typeof verified !== 'boolean') {
      return NextResponse.json({ error: 'verified 값이 필요합니다' }, { status: 400 })
    }

    const supabase = createAdminSupabase()

    const { data, error } = await supabase
      .from('places')
      .update({ verified })
      .eq('id', placeId)
      .select()
      .single()

    if (error) {
      console.error('[Admin Place Verify API] Update error:', error)
      return NextResponse.json({ error: '장소 상태 변경에 실패했습니다' }, { status: 500 })
    }

    // Write audit log
    await supabase.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: verified ? 'place_verify' : 'place_unverify',
      target_type: 'place',
      target_id: placeId,
      details: { verified, place_name: data.name },
    })

    return NextResponse.json({ place: data })
  } catch (error) {
    console.error('[Admin Place Verify API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
