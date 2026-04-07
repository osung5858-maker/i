-- 소식 신고 테이블
CREATE TABLE IF NOT EXISTS town_feed_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES town_feed(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_town_feed_reports_post ON town_feed_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_town_feed_reports_status ON town_feed_reports(status);

ALTER TABLE town_feed_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='town_feed_reports' AND policyname='Anyone can read feed reports') THEN
    CREATE POLICY "Anyone can read feed reports" ON town_feed_reports FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='town_feed_reports' AND policyname='Auth users can report feed') THEN
    CREATE POLICY "Auth users can report feed" ON town_feed_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
