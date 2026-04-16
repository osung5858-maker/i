import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'

/**
 * POST /api/nicknames — user_id 배열을 받아 닉네임 맵 반환
 * Body: { userIds: string[] }
 * Response: { [userId]: nickname }
 */
export async function POST(request: Request) {
  const ct = request.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  try {
    // Auth check
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getClientIP(request)
    const { limited } = checkRateLimit(`nicknames:${user.id}:${ip}`, { limit: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: '요청이 너무 많아요.' }, { status: 429 })

    const { userIds } = await request.json()
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({})
    }

    // Cap at 100 to prevent abuse
    const ids = userIds.slice(0, 100)

    // Service role client to bypass RLS
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      console.warn('[api/nicknames] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key (RLS may block)')
    }
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: profiles } = await adminSupabase
      .from('user_profiles')
      .select('user_id, chosen_nickname')
      .in('user_id', ids)

    const map: Record<string, string> = {}
    if (profiles) {
      for (const p of profiles) {
        if (p.chosen_nickname) map[p.user_id] = p.chosen_nickname
      }
    }

    // chosen_nickname이 없는 유저는 auth.users metadata에서 name 가져오기 (병렬)
    const missingIds = ids.filter(id => !map[id])
    if (missingIds.length > 0) {
      const results = await Promise.allSettled(
        missingIds.map(uid => adminSupabase.auth.admin.getUserById(uid))
      )
      for (let i = 0; i < missingIds.length; i++) {
        const result = results[i]
        if (result.status === 'fulfilled') {
          const u = result.value.data?.user
          if (u) {
            const name = u.user_metadata?.name || u.user_metadata?.full_name
            if (name) map[missingIds[i]] = name
          }
        }
      }
    }

    // 여전히 닉네임이 없는 유저에게 해시 기반 자동 닉네임 부여 (OO맘/OO파파 형식)
    const PREFIXES = ['하늘', '별빛', '구름', '달빛', '햇살', '바다', '봄날', '꽃잎', '초록', '노을', '이슬', '보라']
    const SUFFIXES = ['맘', '파파', '맘', '파파', '맘', '파파', '맘', '파파', '맘', '맘', '파파', '맘']
    for (const uid of ids) {
      if (!map[uid]) {
        let hash = 0
        for (let i = 0; i < uid.length; i++) {
          hash = ((hash << 5) - hash) + uid.charCodeAt(i)
          hash |= 0
        }
        hash = Math.abs(hash)
        const prefix = PREFIXES[hash % PREFIXES.length]
        const suffix = SUFFIXES[(hash >> 4) % SUFFIXES.length]
        map[uid] = `${prefix}${suffix}`
      }
    }

    return NextResponse.json(map)
  } catch (err) {
    console.error('[api/nicknames] error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
