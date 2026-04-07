import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface ReviewRow {
  place_id: string
  place_name: string | null
  rating: number
  content: string
  created_at: string
}

/**
 * GET /api/admin/places — 리뷰가 존재하는 장소 목록 (reviews 테이블 집계)
 */
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

    const supabase = createAdminSupabase()

    // reviews 테이블에서 place_id별 집계
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('place_id, place_name, rating, content, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin Places API] Reviews query error:', error)
      return NextResponse.json({ error: '리뷰 데이터를 가져올 수 없습니다' }, { status: 500 })
    }

    const rows = (reviews ?? []) as ReviewRow[]

    // place_id별 집계
    const placeMap = new Map<string, {
      place_id: string
      place_name: string | null
      review_count: number
      avg_rating: number
      total_rating: number
      latest_review: string
      latest_content: string
    }>()

    for (const row of rows) {
      if (!row.place_id) continue
      const existing = placeMap.get(row.place_id)
      if (existing) {
        existing.review_count++
        existing.total_rating += row.rating
        existing.avg_rating = existing.total_rating / existing.review_count
        if (!existing.place_name && row.place_name) existing.place_name = row.place_name
        if (row.created_at > existing.latest_review) {
          existing.latest_review = row.created_at
          existing.latest_content = row.content
          if (row.place_name) existing.place_name = row.place_name
        }
      } else {
        placeMap.set(row.place_id, {
          place_id: row.place_id,
          place_name: row.place_name,
          review_count: 1,
          avg_rating: row.rating,
          total_rating: row.rating,
          latest_review: row.created_at,
          latest_content: row.content,
        })
      }
    }

    // 배열로 변환 + 리뷰 수 내림차순 정렬
    let places = Array.from(placeMap.values())
      .sort((a, b) => b.review_count - a.review_count)

    // 검색 필터 (장소명, place_id, 리뷰 내용)
    if (search) {
      const q = search.toLowerCase()
      places = places.filter(p =>
        (p.place_name && p.place_name.toLowerCase().includes(q)) ||
        p.place_id.toLowerCase().includes(q) ||
        p.latest_content.toLowerCase().includes(q)
      )
    }

    const total = places.length
    const totalPages = Math.ceil(total / limit)
    const from = (page - 1) * limit
    const paged = places.slice(from, from + limit)

    return NextResponse.json({
      places: paged.map(p => ({
        place_id: p.place_id,
        place_name: p.place_name,
        review_count: p.review_count,
        avg_rating: Math.round(p.avg_rating * 10) / 10,
        latest_review: p.latest_review,
      })),
      total,
      page,
      limit,
      totalPages,
    })
  } catch (error) {
    console.error('[Admin Places API] Error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
