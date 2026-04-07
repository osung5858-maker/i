-- 모임 게시글 이모지 반응: gathering_post_likes에 emoji 컬럼 추가 + PK 변경
-- 기존 PK: (post_id, user_id) → 새 PK: (post_id, user_id, emoji)

-- 1) emoji 컬럼 추가
ALTER TABLE gathering_post_likes ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '❤️';

-- 2) 기존 composite PK 제거 후 새 PK 추가
-- (post_id, user_id) → id 컬럼 추가 + UNIQUE(post_id, user_id, emoji)
ALTER TABLE gathering_post_likes DROP CONSTRAINT IF EXISTS gathering_post_likes_pkey;

-- id 컬럼 추가 (기존 행에도 자동 생성)
ALTER TABLE gathering_post_likes ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
-- 기존 행에 id 값 채우기
UPDATE gathering_post_likes SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE gathering_post_likes ADD PRIMARY KEY (id);

-- UNIQUE 제약 (post_id, user_id, emoji)
DO $$ BEGIN
  ALTER TABLE gathering_post_likes ADD CONSTRAINT gathering_post_likes_post_user_emoji_key UNIQUE(post_id, user_id, emoji);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- 모임 댓글 이모지 반응 테이블
CREATE TABLE IF NOT EXISTS gathering_post_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES gathering_post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  emoji TEXT DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_gathering_post_comment_likes_comment ON gathering_post_comment_likes(comment_id);

ALTER TABLE gathering_post_comment_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gathering_post_comment_likes' AND policyname='Anyone can read gathering comment likes') THEN
    CREATE POLICY "Anyone can read gathering comment likes" ON gathering_post_comment_likes FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gathering_post_comment_likes' AND policyname='Auth users can like gathering comments') THEN
    CREATE POLICY "Auth users can like gathering comments" ON gathering_post_comment_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gathering_post_comment_likes' AND policyname='Users can unlike gathering comments') THEN
    CREATE POLICY "Users can unlike gathering comments" ON gathering_post_comment_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
