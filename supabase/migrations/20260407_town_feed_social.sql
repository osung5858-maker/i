-- 동네 소식 좋아요/댓글 테이블

-- 소식 좋아요
CREATE TABLE IF NOT EXISTS town_feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES town_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_town_feed_likes_post ON town_feed_likes(post_id);

-- 소식 댓글
CREATE TABLE IF NOT EXISTS town_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES town_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_town_feed_comments_post ON town_feed_comments(post_id, created_at);

-- RLS
ALTER TABLE town_feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_feed_comments ENABLE ROW LEVEL SECURITY;

-- 읽기: 모두
CREATE POLICY "Anyone can read feed likes" ON town_feed_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can read feed comments" ON town_feed_comments FOR SELECT USING (true);

-- 쓰기: 인증 사용자
CREATE POLICY "Auth users can like feed" ON town_feed_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users can comment feed" ON town_feed_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 삭제: 본인만
CREATE POLICY "Users can unlike feed" ON town_feed_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feed comments" ON town_feed_comments FOR DELETE USING (auth.uid() = user_id);
