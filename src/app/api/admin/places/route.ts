import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const CATEGORY_VALUES = [
  'pediatric',
  'kids_cafe',
  'nursing_room',
  'playground',
  'pharmacy',
  'culture_center',
] as const

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const verified = searchParams.get('verified')

    const supabase = createAdminSupabase()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('places')
      .select(
        'id, name, category, address, phone, avg_rating, review_count, source, verified, created_at',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (category && CATEGORY_VALUES.includes(category as typeof CATEGORY_VALUES[number])) {
      query = query.eq('category', category)
    }

    if (verified === 'true') {
      query = query.eq('verified', true)
    } else if (verified === 'false') {
      query = query.eq('verified', false)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('[Admin Places API] Query error:', error)
      return NextResponse.json({ error: '장소 목록을 가져올 수 없습니다' }, { status: 500 })
    }

    return NextResponse.json({
      places: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    })
  } catch (error) {
    console.error('[Admin Places API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
