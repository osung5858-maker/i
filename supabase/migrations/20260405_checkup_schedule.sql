-- ============================================================
-- 검진 관리 시스템 Schema Migration
-- Date: 2026-04-05
-- Author: da:system
-- ============================================================

-- ============================================================
-- 1. preg_records type 제약 확장
-- ============================================================

ALTER TABLE preg_records DROP CONSTRAINT IF EXISTS preg_records_type_check;
ALTER TABLE preg_records ADD CONSTRAINT preg_records_type_check
  CHECK (type IN (
    'health',           -- 건강 기록
    'checkup',          -- 검진 (기존)
    'diary',            -- 일기
    'mood',             -- 기분
    'fetal_move',       -- 태동
    'weight',           -- 체중
    'supplement',       -- 영양제
    'checkup_status',   -- 검진 완료 상태 (기존)
    'hospital_bag',     -- 출산 가방 체크리스트 (기존)
    'checkup_schedule', -- ★ 신규: 검진 예약 일정
    'checkup_result'    -- ★ 신규: 검진 결과
  ));

-- ============================================================
-- 2. 검진 조회 성능 최적화를 위한 인덱스 추가
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_preg_records_checkup
ON preg_records(user_id, type, record_date DESC)
WHERE type IN ('checkup_schedule', 'checkup_result');

-- ============================================================
-- 3. Supabase Storage Bucket 생성 (수동 실행 필요)
-- ============================================================

-- CLI 명령어로 실행:
-- supabase storage create ultrasound --public false

-- 또는 Supabase Dashboard → Storage → New Bucket:
-- - Name: ultrasound
-- - Public: false (RLS 강제)
-- - File size limit: 30MB
-- - Allowed MIME types: image/jpeg, image/png, video/mp4, video/quicktime

-- ============================================================
-- 4. Storage RLS 정책: 본인 + 파트너만 접근
-- ============================================================

-- 주의: storage.objects 테이블에 정책 적용
-- user_profiles.partner_user_id 컬럼이 존재한다고 가정
-- (없으면 caregivers 테이블 사용 또는 향후 추가)

CREATE POLICY IF NOT EXISTS "Ultrasound media - own and partner access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ultrasound'
  AND (
    -- 본인 폴더 ({user_id}/)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- 파트너 폴더
    (storage.foldername(name))[1] IN (
      SELECT partner_user_id::text
      FROM user_profiles
      WHERE user_id = auth.uid()
        AND partner_user_id IS NOT NULL
    )
  )
);

-- 업로드 정책: 본인 폴더만
CREATE POLICY IF NOT EXISTS "Ultrasound media - own upload only"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ultrasound'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 삭제 정책: 본인 파일만
CREATE POLICY IF NOT EXISTS "Ultrasound media - own delete only"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ultrasound'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 5. user_profiles에 partner_user_id 추가 (없는 경우)
-- ============================================================

-- 이미 존재하는지 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
      AND column_name = 'partner_user_id'
  ) THEN
    ALTER TABLE user_profiles
      ADD COLUMN partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    COMMENT ON COLUMN user_profiles.partner_user_id IS '배우자 user_id (family 연결)';
  END IF;
END $$;

-- ============================================================
-- 6. notification_log 테이블 확장 (검진 알림 타입 추가)
-- ============================================================

-- type 컬럼에 제약이 있다면 확장 (없으면 스킵)
-- ALTER TABLE notification_log DROP CONSTRAINT IF EXISTS notification_log_type_check;

-- 새 알림 타입 추가는 애플리케이션 레벨에서 처리
-- (DB 제약 없음 — 자유 TEXT)

-- ============================================================
-- 7. 완료 로그
-- ============================================================

DO $$ BEGIN
  RAISE NOTICE '✅ Checkup management schema migration completed';
  RAISE NOTICE '⚠️  Remember to create "ultrasound" storage bucket manually if not exists';
  RAISE NOTICE '⚠️  Run: supabase storage create ultrasound --public false';
END $$;
