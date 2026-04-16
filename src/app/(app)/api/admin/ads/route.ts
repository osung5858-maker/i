import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/security/auth'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const DEFAULT_SLOTS = [
  { id: 'home_banner', enabled: false, provider: 'kakao', unit_id: null, width: 320, height: 50, page_path: '/' },
  { id: 'notification_top', enabled: false, provider: 'kakao', unit_id: null, width: 320, height: 100, page_path: '/notifications' },
  { id: 'community_feed', enabled: false, provider: 'google', unit_id: null, width: 300, height: 250, page_path: '/community' },
  { id: 'post_detail_bottom', enabled: false, provider: 'google', unit_id: null, width: 300, height: 250, page_path: '/town' },
  // 네이티브 AdMob 슬롯 (Capacitor 앱 전용, 기본 비활성)
  { id: 'native_home_bottom', enabled: false, provider: 'admob', unit_id: null, width: 320, height: 50, page_path: '/' },
  { id: 'native_community_bottom', enabled: false, provider: 'admob', unit_id: null, width: 320, height: 50, page_path: '/community' },
]

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ad_settings (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  provider TEXT CHECK (provider IN ('kakao', 'google', 'admob')),
  unit_id TEXT,
  width INTEGER DEFAULT 320,
  height INTEGER DEFAULT 100,
  page_path TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE ad_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ad_settings' AND policyname='ad_settings_select') THEN
    CREATE POLICY "ad_settings_select" ON ad_settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ad_settings' AND policyname='ad_settings_admin_write') THEN
    CREATE POLICY "ad_settings_admin_write" ON ad_settings FOR ALL
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
      WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
  END IF;
END $$;
`

/**
 * GET /api/admin/ads — 광고 슬롯 목록
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
    let { data, error } = await supabase
      .from('ad_settings')
      .select('*')
      .order('id')

    // 테이블이 없으면 자동 생성 시도
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      console.log('[Admin Ads API] Table not found, auto-creating...')

      // Service role로 SQL 직접 실행
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            },
            body: JSON.stringify({ query: CREATE_TABLE_SQL }),
          },
        )
      } catch {
        // exec_sql rpc가 없을 수 있음
      }

      // 테이블 재조회 시도
      const retry = await supabase.from('ad_settings').select('*').order('id')
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error('[Admin Ads API] Query error:', error)
      // 테이블이 여전히 없는 경우 친절한 메시지
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          slots: [],
          needsMigration: true,
          message: 'ad_settings 테이블이 없습니다. Supabase SQL Editor에서 마이그레이션을 실행해주세요.',
        })
      }
      return NextResponse.json({ slots: [] })
    }

    // 테이블이 비어있으면 기본 슬롯 자동 생성
    if (!data || data.length === 0) {
      const { error: seedError } = await supabase
        .from('ad_settings')
        .upsert(DEFAULT_SLOTS, { onConflict: 'id' })

      if (seedError) {
        console.error('[Admin Ads API] Seed error:', seedError)
      } else {
        const refetch = await supabase
          .from('ad_settings')
          .select('*')
          .order('id')
        data = refetch.data
      }
    }

    return NextResponse.json({ slots: data ?? [] })
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: '슬롯 ID가 필요합니다' }, { status: 400 })
    }

    const allowedFields: Record<string, unknown> = {}
    if (typeof updates.enabled === 'boolean') allowedFields.enabled = updates.enabled
    if (typeof updates.unit_id === 'string') allowedFields.unit_id = updates.unit_id
    if (typeof updates.provider === 'string') allowedFields.provider = updates.provider

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: '업데이트할 필드가 없습니다' }, { status: 400 })
    }

    allowedFields.updated_at = new Date().toISOString()
    allowedFields.updated_by = user.id

    const supabase = createAdminSupabase()
    const { data, error } = await supabase
      .from('ad_settings')
      .update(allowedFields)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Admin Ads API] Update error:', error)
      return NextResponse.json({ error: '광고 설정 업데이트에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ slot: data })
  } catch (error) {
    console.error('[Admin Ads API] PATCH Error:', error)
    return NextResponse.json(
      { error: '광고 설정 업데이트 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
