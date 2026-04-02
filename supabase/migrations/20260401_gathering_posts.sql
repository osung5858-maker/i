-- 소모임 게시판
CREATE TABLE IF NOT EXISTS gathering_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gathering_id UUID NOT NULL REFERENCES town_gatherings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gathering_posts_gathering ON gathering_posts(gathering_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gathering_posts_user ON gathering_posts(user_id);

-- RLS 정책
ALTER TABLE gathering_posts ENABLE ROW LEVEL SECURITY;

-- 모두 읽기 가능
CREATE POLICY "Anyone can read gathering_posts" ON gathering_posts FOR SELECT USING (true);

-- 소모임 멤버만 작성 가능
CREATE POLICY "Gathering members can create posts" ON gathering_posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gathering_participants
      WHERE gathering_participants.gathering_id = gathering_posts.gathering_id
        AND gathering_participants.user_id = auth.uid()
    )
  );

-- 본인 글 또는 소모임장이 삭제 가능
CREATE POLICY "Users can delete own posts or creator can delete" ON gathering_posts
  FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM town_gatherings
      WHERE town_gatherings.id = gathering_posts.gathering_id
        AND town_gatherings.creator_id = auth.uid()
    )
  );
