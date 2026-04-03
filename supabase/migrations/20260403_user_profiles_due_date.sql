-- user_profiles에 due_date 컬럼 추가 (임신 중 모드 출산 예정일)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS due_date DATE;

DO $$ BEGIN
  RAISE NOTICE '✅ user_profiles.due_date 컬럼 추가 완료';
END $$;
