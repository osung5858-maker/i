import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// POST /api/invite/create — 초대 토큰 생성 (RLS 우회)
export async function POST(request: NextRequest) {
  // 인증된 사용자만 가능
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  let childId: string, token: string, expiresAt: string
  try {
    const body = await request.json()
    childId = body.childId; token = body.token; expiresAt = body.expiresAt
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!childId || !token || !expiresAt) {
    return NextResponse.json({ error: 'childId, token, expiresAt required' }, { status: 400 })
  }

  // 해당 아이가 이 유저의 아이인지 확인
  const supabase = getAdminClient()
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('user_id', authUser.id)
    .single()

  if (!child) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  const { error } = await supabase.from('caregivers').insert({
    child_id: childId,
    user_id: '00000000-0000-0000-0000-000000000000',
    role: 'caregiver',
    invite_token: token,
    invite_expires_at: expiresAt,
    permissions: { record: true, view: true, edit: false, delete: false },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
