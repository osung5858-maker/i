-- ============================================================
-- 어드민 대시보드 스키마 변경
-- 작성일: 2026-04-06
-- Phase 1: 인증/레이아웃 + 대시보드 기반 테이블
-- ============================================================

-- [1] 어드민 감사 로그
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin
  ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target
  ON admin_audit_log(target_type, target_id);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 어드민만 읽기/쓰기
CREATE POLICY "admin_audit_log_admin_all" ON admin_audit_log
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );


-- [2] 광고 슬롯 설정
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_settings (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  provider TEXT CHECK (provider IN ('kakao', 'google')),
  unit_id TEXT,
  width INTEGER DEFAULT 320,
  height INTEGER DEFAULT 100,
  page_path TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE ad_settings ENABLE ROW LEVEL SECURITY;

-- 어드민만 쓰기, 모두 읽기 (클라이언트에서 활성 슬롯 조회 필요)
CREATE POLICY "ad_settings_select" ON ad_settings
  FOR SELECT USING (true);

CREATE POLICY "ad_settings_admin_write" ON ad_settings
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 초기 광고 슬롯 시드 데이터
INSERT INTO ad_settings (id, enabled, provider, page_path) VALUES
  ('home_banner', false, 'kakao', '/'),
  ('notification_top', false, 'kakao', '/notifications'),
  ('community_feed', false, 'google', '/community'),
  ('post_detail_bottom', false, 'google', '/post/[id]')
ON CONFLICT (id) DO NOTHING;


-- [3] 페이지뷰 로그
-- ============================================================
CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_path
  ON page_views(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_date
  ON page_views(created_at DESC);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- 어드민만 읽기, 서비스에서 쓰기 (service_role)
CREATE POLICY "page_views_admin_read" ON page_views
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 인증된 유저는 자신의 페이지뷰 삽입 가능
CREATE POLICY "page_views_insert" ON page_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- [4] posts 테이블: soft delete 컬럼 추가
-- ============================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES auth.users(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_posts_hidden ON posts(hidden) WHERE hidden = true;


-- [5] gathering_post_reports 테이블: 처리자 기록 컬럼 추가
-- ============================================================
ALTER TABLE gathering_post_reports
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE gathering_post_reports
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE gathering_post_reports
  ADD COLUMN IF NOT EXISTS admin_note TEXT;


-- [6] RLS 정책 변경: posts
-- ============================================================

-- 어드민 전체 접근 정책 (hidden 포함)
DROP POLICY IF EXISTS "admin_full_access" ON posts;
CREATE POLICY "admin_full_access" ON posts
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 일반 유저: hidden=false 또는 본인 글만 조회
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (
    hidden IS NOT TRUE OR auth.uid() = user_id
  );


-- [7] RLS 정책 변경: gathering_post_reports
-- ============================================================

-- 어드민은 모든 신고 조회/수정 가능
DROP POLICY IF EXISTS "admin_reports_all" ON gathering_post_reports;
CREATE POLICY "admin_reports_all" ON gathering_post_reports
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );


-- 완료 확인
DO $$
BEGIN
  RAISE NOTICE '=== Admin Phase 1 Migration Complete ===';
  RAISE NOTICE '- admin_audit_log 테이블 생성';
  RAISE NOTICE '- ad_settings 테이블 생성 + 시드 데이터';
  RAISE NOTICE '- page_views 테이블 생성';
  RAISE NOTICE '- posts: hidden/hidden_by/hidden_at 컬럼 추가';
  RAISE NOTICE '- gathering_post_reports: reviewed_by/reviewed_at/admin_note 컬럼 추가';
  RAISE NOTICE '- RLS 정책 업데이트 완료';
END $$;
