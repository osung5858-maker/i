-- ============================================================
-- 누락 스키마 보완 (2026-03-31)
-- ============================================================

-- ===== 1. user_profiles =====
-- 임신 모드 due_date + 회원 탈퇴 status 통합 관리
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn')),
  mode        TEXT CHECK (mode IN ('parenting', 'pregnant', 'preparing')),
  due_date    DATE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_due_date ON user_profiles(due_date)
  WHERE due_date IS NOT NULL;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE USING (user_id = auth.uid());

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();


-- ===== 2. market_items 컬럼 추가 =====
-- transaction_type, exchange_want, condition 누락

ALTER TABLE market_items
  ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'sell'
    CHECK (transaction_type IN ('sell', 'give', 'exchange')),
  ADD COLUMN IF NOT EXISTS exchange_want TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT
    CHECK (condition IN ('new', 'like_new', 'good', 'fair'));


-- ===== 3. push_tokens RLS 추가 (없을 경우) =====
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_select" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_insert" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete" ON push_tokens;

CREATE POLICY "push_tokens_select" ON push_tokens FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_tokens_insert" ON push_tokens FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_tokens_delete" ON push_tokens FOR DELETE USING (user_id = auth.uid());


-- ===== 4. notification_settings RLS 추가 =====
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_settings_select" ON notification_settings;
DROP POLICY IF EXISTS "notification_settings_insert" ON notification_settings;
DROP POLICY IF EXISTS "notification_settings_update" ON notification_settings;

CREATE POLICY "notification_settings_select" ON notification_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notification_settings_insert" ON notification_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notification_settings_update" ON notification_settings FOR UPDATE USING (user_id = auth.uid());


-- ===== 5. notification_log RLS 추가 =====
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_log_select" ON notification_log;
DROP POLICY IF EXISTS "notification_log_insert" ON notification_log;
DROP POLICY IF EXISTS "notification_log_update" ON notification_log;

CREATE POLICY "notification_log_select" ON notification_log FOR SELECT USING (user_id = auth.uid());
-- 서버사이드 크론에서 INSERT → service_role 사용하므로 RLS 우회됨
CREATE POLICY "notification_log_update" ON notification_log FOR UPDATE USING (user_id = auth.uid());
