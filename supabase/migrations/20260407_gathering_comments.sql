-- 소모임 게시글 댓글
CREATE TABLE IF NOT EXISTS gathering_post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES gathering_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gathering_post_comments_post ON gathering_post_comments(post_id, created_at);

-- RLS
ALTER TABLE gathering_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gathering_comments_select" ON gathering_post_comments FOR SELECT USING (true);
CREATE POLICY "gathering_comments_insert" ON gathering_post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gathering_comments_delete" ON gathering_post_comments FOR DELETE USING (auth.uid() = user_id);
