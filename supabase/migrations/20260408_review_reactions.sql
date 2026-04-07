-- 장소 리뷰 이모지 반응
CREATE TABLE IF NOT EXISTS review_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(review_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_review_reactions_review ON review_reactions(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reactions_user ON review_reactions(user_id);

ALTER TABLE review_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_reactions_select" ON review_reactions FOR SELECT USING (true);
CREATE POLICY "review_reactions_insert" ON review_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "review_reactions_delete" ON review_reactions FOR DELETE USING (auth.uid() = user_id);
