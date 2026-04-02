-- 동네 커뮤니티 강화 스키마

-- 리뷰 사진 테이블
CREATE TABLE IF NOT EXISTS review_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장소 팁 태그 테이블 (커뮤니티 검증)
CREATE TABLE IF NOT EXISTS place_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  tip TEXT NOT NULL, -- '유모차 출입 가능', '수유실 있음', '주차 편함' 등
  votes INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, tip)
);

-- 팁 투표 기록
CREATE TABLE IF NOT EXISTS tip_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES place_tips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tip_id, user_id)
);

-- 실시간 장소 붐빔 정보
CREATE TABLE IF NOT EXISTS place_crowdedness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('empty', 'moderate', 'crowded', 'very_crowded')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5분 이내 데이터만 유효하도록 인덱스
CREATE INDEX IF NOT EXISTS idx_place_crowdedness_recent ON place_crowdedness(place_id, created_at DESC);

-- 동네 실시간 피드
CREATE TABLE IF NOT EXISTS town_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT,
  content TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  range_meters INTEGER DEFAULT 1000, -- 게시 반경
  expires_at TIMESTAMPTZ, -- 자동 만료 (예: 24시간 후)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_town_feed_location ON town_feed(lat, lng);
CREATE INDEX IF NOT EXISTS idx_town_feed_recent ON town_feed(created_at DESC);

-- 동네 모임
CREATE TABLE IF NOT EXISTS town_gatherings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  place_name TEXT,
  place_id TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  scheduled_at TIMESTAMPTZ,
  max_participants INTEGER,
  min_child_age_months INTEGER,
  max_child_age_months INTEGER,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_town_gatherings_location ON town_gatherings(lat, lng);
CREATE INDEX IF NOT EXISTS idx_town_gatherings_status ON town_gatherings(status, scheduled_at);

-- 모임 참여자
CREATE TABLE IF NOT EXISTS gathering_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gathering_id UUID NOT NULL REFERENCES town_gatherings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  child_age_months INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gathering_id, user_id)
);

-- 중고거래/나눔
CREATE TABLE IF NOT EXISTS town_market (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'baby_gear', 'clothing', 'toys', 'books', 'etc'
  price INTEGER DEFAULT 0, -- 0 = 나눔
  photo_url TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_town_market_location ON town_market(lat, lng);
CREATE INDEX IF NOT EXISTS idx_town_market_status ON town_market(status, created_at DESC);

-- RLS 정책
ALTER TABLE review_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_crowdedness ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_gatherings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gathering_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_market ENABLE ROW LEVEL SECURITY;

-- 모두 읽기 가능
CREATE POLICY "Anyone can read review_photos" ON review_photos FOR SELECT USING (true);
CREATE POLICY "Anyone can read place_tips" ON place_tips FOR SELECT USING (true);
CREATE POLICY "Anyone can read place_crowdedness" ON place_crowdedness FOR SELECT USING (true);
CREATE POLICY "Anyone can read town_feed" ON town_feed FOR SELECT USING (true);
CREATE POLICY "Anyone can read town_gatherings" ON town_gatherings FOR SELECT USING (true);
CREATE POLICY "Anyone can read gathering_participants" ON gathering_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can read town_market" ON town_market FOR SELECT USING (true);

-- 인증된 사용자만 생성/수정
CREATE POLICY "Authenticated users can insert review_photos" ON review_photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert place_tips" ON place_tips FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can vote tips" ON tip_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can report crowdedness" ON place_crowdedness FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can post feed" ON town_feed FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create gatherings" ON town_gatherings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can join gatherings" ON gathering_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can post market items" ON town_market FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 본인 것만 수정/삭제
CREATE POLICY "Users can update own feed" ON town_feed FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feed" ON town_feed FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own gatherings" ON town_gatherings FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete own market items" ON town_market FOR DELETE USING (auth.uid() = user_id);
