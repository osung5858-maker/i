-- ============================================================
-- 소모임 기능 활성화를 위한 필수 SQL 마이그레이션 (v2)
-- Supabase Studio > SQL Editor에 복사해서 실행하세요
-- 중복 실행 안전 버전 (기존 정책 삭제 후 재생성)
-- ============================================================

-- [1] 소모임 테이블 업데이트 (카테고리, 주기 추가)
-- ============================================================

-- 카테고리와 모임 빈도 컬럼 추가
ALTER TABLE town_gatherings
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('playgroup', 'study', 'hobby', 'support', 'outdoor', 'etc')),
ADD COLUMN IF NOT EXISTS meeting_frequency TEXT CHECK (meeting_frequency IN ('weekly', 'biweekly', 'monthly', 'irregular'));

-- scheduled_at을 nullable로 변경 (소모임은 정기 모임이므로 특정 날짜 필수 아님)
DO $$
BEGIN
  ALTER TABLE town_gatherings ALTER COLUMN scheduled_at DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL; -- 이미 nullable이면 무시
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_town_gatherings_category ON town_gatherings(category);
CREATE INDEX IF NOT EXISTS idx_town_gatherings_creator ON town_gatherings(creator_id, status);


-- [2] 소모임 게시판 테이블 생성
-- ============================================================

-- 게시판 테이블
CREATE TABLE IF NOT EXISTS gathering_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gathering_id UUID NOT NULL REFERENCES town_gatherings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_gathering_posts_gathering ON gathering_posts(gathering_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gathering_posts_user ON gathering_posts(user_id);

-- RLS 정책 활성화
ALTER TABLE gathering_posts ENABLE ROW LEVEL SECURITY;


-- [3] 기존 정책 삭제 (있으면) 후 재생성
-- ============================================================

-- 기존 정책 삭제 (에러 무시)
DROP POLICY IF EXISTS "Anyone can read gathering_posts" ON gathering_posts;
DROP POLICY IF EXISTS "Gathering members can create posts" ON gathering_posts;
DROP POLICY IF EXISTS "Users can delete own posts or creator can delete" ON gathering_posts;

-- 정책 재생성
-- 1) 모두 읽기 가능
CREATE POLICY "Anyone can read gathering_posts"
ON gathering_posts
FOR SELECT
USING (true);

-- 2) 소모임 멤버만 작성 가능
CREATE POLICY "Gathering members can create posts"
ON gathering_posts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gathering_participants
    WHERE gathering_participants.gathering_id = gathering_posts.gathering_id
      AND gathering_participants.user_id = auth.uid()
  )
);

-- 3) 본인 글 또는 소모임장이 삭제 가능
CREATE POLICY "Users can delete own posts or creator can delete"
ON gathering_posts
FOR DELETE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM town_gatherings
    WHERE town_gatherings.id = gathering_posts.gathering_id
      AND town_gatherings.creator_id = auth.uid()
  )
);


-- ============================================================
-- 실행 완료! 다음을 확인하세요:
-- ============================================================
-- 1. town_gatherings 테이블에 category, meeting_frequency 컬럼 생성 ✓
-- 2. gathering_posts 테이블 생성 ✓
-- 3. RLS 정책 3개 생성 ✓
-- 4. 앱에서 소모임 만들기 테스트
-- 5. 소모임 게시판 글쓰기 테스트
