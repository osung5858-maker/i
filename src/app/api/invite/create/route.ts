import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { getAuthUser } from '@/lib/security/auth'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'

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

  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`invite-create:${authUser.id}:${ip}`, { limit: 10, windowMs: 60_000 })
  if (limited) return NextResponse.json({ error: '요청이 너무 많아요.' }, { status: 429 })

  let childId: string, expiresAt: string
  try {
    const body = await request.json()
    childId = body.childId; expiresAt = body.expiresAt
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!childId || !expiresAt) {
    return NextResponse.json({ error: 'childId, expiresAt required' }, { status: 400 })
  }

  // 서버에서 암호학적으로 안전한 토큰 생성
  const token = randomBytes(32).toString('hex')

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

  // user_id는 NULL로 — 수락 시 실제 유저 ID로 업데이트
  const { error } = await supabase.from('caregivers').insert({
    child_id: childId,
    role: 'caregiver',
    invite_token: token,
    invite_expires_at: expiresAt,
    permissions: { record: true, view: true, edit: false, delete: false },
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  return NextResponse.json({ success: true, token })
}
