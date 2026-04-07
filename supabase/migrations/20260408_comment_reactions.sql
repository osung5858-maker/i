-- 댓글 이모지 반응 테이블
CREATE TABLE IF NOT EXISTS town_feed_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES town_feed_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  emoji TEXT DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_town_feed_comment_likes_comment ON town_feed_comment_likes(comment_id);

ALTER TABLE town_feed_comment_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='town_feed_comment_likes' AND policyname='Anyone can read comment likes') THEN
    CREATE POLICY "Anyone can read comment likes" ON town_feed_comment_likes FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='town_feed_comment_likes' AND policyname='Auth users can like comments') THEN
    CREATE POLICY "Auth users can like comments" ON town_feed_comment_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='town_feed_comment_likes' AND policyname='Users can unlike comments') THEN
    CREATE POLICY "Users can unlike comments" ON town_feed_comment_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 기존 town_feed_likes에 emoji 컬럼 추가 (게시글 리액션용)
ALTER TABLE town_feed_likes ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '❤️';
ALTER TABLE town_feed_likes DROP CONSTRAINT IF EXISTS town_feed_likes_post_id_user_id_key;
-- UNIQUE constraint 추가 (이미 존재하면 무시)
DO $$ BEGIN
  ALTER TABLE town_feed_likes ADD CONSTRAINT town_feed_likes_post_user_emoji_key UNIQUE(post_id, user_id, emoji);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
