import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** Admin auth guard helper */
async function requireAdmin() {
  const user = await getAuthUser()
  if (!user) {
    return { error: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }), user: null }
  }
  if (user.app_metadata?.role !== 'admin') {
    return { error: NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 }), user: null }
  }
  return { error: null, user }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { error: authError } = await requireAdmin()
    if (authError) return authError

    const { userId } = await params
    const supabase = createAdminSupabase()

    // Parallel: profile, posts count, comments count, audit log
    const [profileRes, postsRes, commentsRes, auditRes, authUserRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('admin_audit_log')
        .select('*')
        .eq('target_id', userId)
        .eq('target_type', 'user')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.auth.admin.getUserById(userId),
    ])

    if (profileRes.error) {
      return NextResponse.json({ error: '유저를 찾을 수 없습니다' }, { status: 404 })
    }

    const email = authUserRes.data?.user?.email || ''
    const lastSignIn = authUserRes.data?.user?.last_sign_in_at || null
    const isBanned = authUserRes.data?.user?.banned_until
      ? new Date(authUserRes.data.user.banned_until) > new Date()
      : false

    return NextResponse.json({
      profile: {
        ...profileRes.data,
        email,
        last_sign_in_at: lastSignIn,
        is_banned: isBanned,
        banned_until: authUserRes.data?.user?.banned_until || null,
      },
      posts_count: postsRes.count ?? 0,
      comments_count: commentsRes.count ?? 0,
      audit_log: auditRes.data || [],
    })
  } catch (error) {
    console.error('[Admin User Detail API] Error:', error)
    return NextResponse.json(
      { error: '유저 정보를 가져오는 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { error: authError, user: adminUser } = await requireAdmin()
    if (authError) return authError

    const { userId } = await params
    const body = await request.json()
    const { action } = body as { action: 'suspend' | 'activate' }

    if (!action || !['suspend', 'activate'].includes(action)) {
      return NextResponse.json({ error: '유효하지 않은 액션입니다' }, { status: 400 })
    }

    const supabase = createAdminSupabase()

    // Check target user exists
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: '유저를 찾을 수 없습니다' }, { status: 404 })
    }

    // Update auth user ban status
    if (action === 'suspend') {
      // Ban for 100 years (effectively permanent)
      const banUntil = new Date()
      banUntil.setFullYear(banUntil.getFullYear() + 100)
      const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: '876000h', // ~100 years
      })
      if (banError) {
        console.error('[Admin User PATCH] ban error:', banError)
        return NextResponse.json({ error: '유저 정지에 실패했습니다' }, { status: 500 })
      }
    } else {
      // Activate: remove ban
      const { error: unbanError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      })
      if (unbanError) {
        console.error('[Admin User PATCH] unban error:', unbanError)
        return NextResponse.json({ error: '유저 활성화에 실패했습니다' }, { status: 500 })
      }
    }

    // Log to admin_audit_log
    await supabase.from('admin_audit_log').insert({
      admin_user_id: adminUser!.id,
      action: action === 'suspend' ? 'user_suspend' : 'user_activate',
      target_type: 'user',
      target_id: userId,
      details: {
        action,
        performed_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: action === 'suspend' ? '유저가 정지되었습니다' : '유저가 활성화되었습니다',
    })
  } catch (error) {
    console.error('[Admin User PATCH] Error:', error)
    return NextResponse.json(
      { error: '유저 상태 변경 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
