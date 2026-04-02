-- ============================================================
-- 유저 프로필 테이블
-- localStorage → Supabase 마이그레이션
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT CHECK (mode IN ('preparing', 'pregnant', 'parenting')),
  intro_shown          BOOLEAN DEFAULT FALSE,
  tutorial_preparing   BOOLEAN DEFAULT FALSE,
  tutorial_pregnant    BOOLEAN DEFAULT FALSE,
  tutorial_parenting   BOOLEAN DEFAULT FALSE,
  my_role        TEXT CHECK (my_role IN ('mom', 'dad')),
  mother_birth   DATE,
  father_birth   DATE,
  mother_height  SMALLINT,
  father_height  SMALLINT,
  chosen_nickname TEXT,
  last_period    DATE,
  cycle_length   SMALLINT DEFAULT 28,
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
CREATE POLICY "Users can manage own profile"
ON user_profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 임신 준비 기록 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS prep_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN (
    'period', 'bbt', 'ovulation_test', 'intimacy', 'preg_test', 'supplement', 'mood', 'journal'
  )),
  value       JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prep_records_user_date ON prep_records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_prep_records_type ON prep_records(user_id, type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prep_records_unique
  ON prep_records(user_id, record_date, type)
  WHERE type IN ('period', 'bbt', 'mood');

ALTER TABLE prep_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own prep records" ON prep_records;
CREATE POLICY "Users can manage own prep records"
ON prep_records FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 임신 중 기록 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS preg_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN (
    'health', 'checkup', 'diary', 'mood', 'fetal_move', 'weight', 'supplement'
  )),
  value       JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preg_records_user_date ON preg_records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_preg_records_type ON preg_records(user_id, type);

ALTER TABLE preg_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preg records" ON preg_records;
CREATE POLICY "Users can manage own preg records"
ON preg_records FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  RAISE NOTICE '✅ user_profiles, prep_records, preg_records 생성 완료';
END $$;
