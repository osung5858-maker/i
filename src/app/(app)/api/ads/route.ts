import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/ads — 활성화된 광고 슬롯 목록 (공개 API, 인증 불필요)
 * 프론트엔드에서 DynamicAd 컴포넌트가 호출
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data, error } = await supabase
      .from('ad_settings')
      .select('id, enabled, provider, unit_id, width, height, page_path')
      .eq('enabled', true)

    if (error) {
      console.error('[Ads API] Query error:', error)
      return NextResponse.json({ slots: [] })
    }

    return NextResponse.json(
      { slots: data ?? [] },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch {
    return NextResponse.json({ slots: [] })
  }
}
