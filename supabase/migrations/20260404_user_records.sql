-- ============================================================
-- 범용 유저 레코드 테이블
-- localStorage → Supabase DB 전면 마이그레이션 (Phase 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type        TEXT NOT NULL,
  value       JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_records_user_type ON user_records(user_id, type);
CREATE INDEX IF NOT EXISTS idx_user_records_user_date ON user_records(user_id, record_date);

ALTER TABLE user_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own records" ON user_records;
CREATE POLICY "Users manage own records"
ON user_records FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- user_profiles에 user_settings JSONB 추가
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS user_settings JSONB DEFAULT '{}';

-- ============================================================
-- preg_records type 제약 확장 (checkup_status, hospital_bag 추가)
-- ============================================================

ALTER TABLE preg_records DROP CONSTRAINT IF EXISTS preg_records_type_check;
ALTER TABLE preg_records ADD CONSTRAINT preg_records_type_check
  CHECK (type IN ('health','checkup','diary','mood','fetal_move','weight','supplement','checkup_status','hospital_bag'));

-- ============================================================
-- prep_records type 제약 확장 (checklist, baby_items, cycle_history 추가)
-- ============================================================

ALTER TABLE prep_records DROP CONSTRAINT IF EXISTS prep_records_type_check;
ALTER TABLE prep_records ADD CONSTRAINT prep_records_type_check
  CHECK (type IN ('period','bbt','ovulation_test','intimacy','preg_test','supplement','mood','journal','checklist','baby_items','cycle_history'));

DO $$ BEGIN
  RAISE NOTICE '✅ user_records 테이블 + user_profiles.user_settings + type 제약 확장 완료';
END $$;
