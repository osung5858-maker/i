import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'

// 서비스 역할 클라이언트 — RLS 바이패스
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// GET /api/invite?token=xxx — 토큰 조회 (RLS 우회)
export async function GET(request: NextRequest) {
  const ip = getClientIP(request)
  const { limited } = checkRateLimit(`invite:${ip}`, { limit: 10, windowMs: 60_000 })
  if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { data: invite, error } = await supabase
    .from('caregivers')
    .select('*, children(name)')
    .eq('invite_token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ status: 'expired' })
  }

  if (invite.invite_expires_at && new Date(invite.invite_expires_at) < new Date()) {
    return NextResponse.json({ status: 'expired' })
  }

  if (invite.accepted_at) {
    return NextResponse.json({ status: 'accepted' })
  }

  return NextResponse.json({
    status: 'valid',
    childName: (invite.children as { name: string })?.name || '도담이',
  })
}

// POST /api/invite — 초대 수락 (RLS 우회)
export async function POST(request: NextRequest) {
  let token: string, userId: string
  try {
    const body = await request.json()
    token = body.token; userId = body.userId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!token || !userId) {
    return NextResponse.json({ error: 'Token and userId required' }, { status: 400 })
  }

  // 인증된 사용자가 자신의 userId로만 수락할 수 있도록 검증
  const { getAuthUser } = await import('@/lib/security/auth')
  const authUser = await getAuthUser()
  if (!authUser || authUser.id !== userId) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  const supabase = getAdminClient()

  // pending 상태(user_id IS NULL, accepted_at IS NULL)인 초대만 수락 가능
  const { data: invite, error: lookupErr } = await supabase
    .from('caregivers')
    .select('id, child_id')
    .eq('invite_token', token)
    .is('accepted_at', null)
    .is('user_id', null)
    .single()

  if (lookupErr || !invite) {
    return NextResponse.json({ error: '유효하지 않은 초대입니다' }, { status: 400 })
  }

  // 이미 이 아이의 caregiver인지 확인
  const { data: existing } = await supabase
    .from('caregivers')
    .select('id')
    .eq('child_id', invite.child_id)
    .eq('user_id', userId)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  if (existing) {
    // 이미 연결됨 — 중복 초대 행 정리
    await supabase.from('caregivers').delete().eq('id', invite.id)
    return NextResponse.json({ success: true, alreadyConnected: true })
  }

  const { error } = await supabase
    .from('caregivers')
    .update({
      user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
