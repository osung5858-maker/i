-- Fix: 가족초대링크 작동 안 함
-- 문제1: user_id NOT NULL + FK → placeholder UUID가 auth.users에 없어서 INSERT 실패
-- 문제2: UNIQUE(child_id, user_id) → 같은 아이에 대해 여러 초대 불가
-- 문제3: UPDATE RLS policy 없음 → 초대 수락 시 update 차단

-- 1. user_id를 nullable로 변경 (pending invite는 user_id = NULL)
ALTER TABLE caregivers ALTER COLUMN user_id DROP NOT NULL;

-- 2. 기존 UNIQUE 제약 제거 후 조건부 UNIQUE 추가
-- accepted된 caregiver만 (child_id, user_id) 유니크 보장
ALTER TABLE caregivers DROP CONSTRAINT IF EXISTS caregivers_child_id_user_id_key;
CREATE UNIQUE INDEX caregivers_child_user_unique
  ON caregivers (child_id, user_id)
  WHERE user_id IS NOT NULL;

-- 3. invite_token에 유니크 인덱스 추가 (토큰 조회 성능 + 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS caregivers_invite_token_unique
  ON caregivers (invite_token)
  WHERE invite_token IS NOT NULL;

-- 4. UPDATE RLS policy 추가
-- 초대 수락: user_id가 NULL인 행을 본인으로 업데이트 가능
-- 아이 소유자: 자기 아이의 caregiver 수정 가능
CREATE POLICY "caregivers_update" ON caregivers FOR UPDATE USING (
  user_id IS NULL  -- pending invite (수락 시)
  OR user_id = auth.uid()  -- 본인 레코드
  OR child_id IN (SELECT id FROM children WHERE user_id = auth.uid())  -- 아이 소유자
);
