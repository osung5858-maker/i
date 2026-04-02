-- ============================================================
-- 소모임 추가 기능 테이블 (북마크, 좋아요, 신고)
-- 작성일: 2026-04-02
-- ============================================================

-- [1] 소모임 북마크 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS user_gathering_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gathering_id UUID NOT NULL REFERENCES town_gatherings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, gathering_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON user_gathering_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_gathering ON user_gathering_bookmarks(gathering_id);

-- RLS 활성화
ALTER TABLE user_gathering_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS 정책
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON user_gathering_bookmarks;
CREATE POLICY "Users can manage own bookmarks"
ON user_gathering_bookmarks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- [2] 게시글 좋아요 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS gathering_post_likes (
  post_id UUID NOT NULL REFERENCES gathering_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON gathering_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON gathering_post_likes(user_id);

-- RLS 활성화
ALTER TABLE gathering_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS 정책
DROP POLICY IF EXISTS "Anyone can read likes" ON gathering_post_likes;
CREATE POLICY "Anyone can read likes"
ON gathering_post_likes
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can manage own likes" ON gathering_post_likes;
CREATE POLICY "Users can manage own likes"
ON gathering_post_likes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- [3] 게시글 신고 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS gathering_post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES gathering_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, reporter_id) -- 중복 신고 방지
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_post_reports_post ON gathering_post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter ON gathering_post_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON gathering_post_reports(status);

-- RLS 활성화
ALTER TABLE gathering_post_reports ENABLE ROW LEVEL SECURITY;

-- RLS 정책
DROP POLICY IF EXISTS "Users can create reports" ON gathering_post_reports;
CREATE POLICY "Users can create reports"
ON gathering_post_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own reports" ON gathering_post_reports;
CREATE POLICY "Users can view own reports"
ON gathering_post_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- 관리자 정책은 추후 추가 (service_role로 접근)


-- [4] 좋아요 수 집계 함수 (성능 최적화용)
-- ============================================================
CREATE OR REPLACE FUNCTION get_post_like_count(post_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM gathering_post_likes
  WHERE post_id = post_uuid;
$$;

-- 사용자가 특정 게시글에 좋아요 했는지 확인
CREATE OR REPLACE FUNCTION user_liked_post(post_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM gathering_post_likes
    WHERE post_id = post_uuid AND user_id = user_uuid
  );
$$;


-- [5] 게시글 신고 수 집계 함수
-- ============================================================
CREATE OR REPLACE FUNCTION get_post_report_count(post_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM gathering_post_reports
  WHERE post_id = post_uuid AND status = 'pending';
$$;


-- [6] 완료 메시지
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 소모임 추가 기능 테이블 생성 완료';
  RAISE NOTICE '- user_gathering_bookmarks: 북마크 관리';
  RAISE NOTICE '- gathering_post_likes: 게시글 좋아요';
  RAISE NOTICE '- gathering_post_reports: 게시글 신고';
  RAISE NOTICE '- 집계 함수 3개 생성 완료';
END $$;
