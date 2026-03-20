-- ===== Dodam (도담) Initial Schema =====
-- Supabase SQL Editor에서 실행

-- PostGIS 활성화
CREATE EXTENSION IF NOT EXISTS postgis;

-- ===== 1. children (아기 프로필) =====
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '도담이',
  birthdate DATE NOT NULL,
  sex TEXT CHECK (sex IN ('male', 'female', 'not_specified')),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== 2. caregivers (공동양육자) =====
CREATE TABLE caregivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'caregiver' CHECK (role IN ('primary', 'caregiver')),
  permissions JSONB NOT NULL DEFAULT '{"record":true,"view":true,"edit":true,"delete":false}',
  invite_token TEXT,
  invite_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  UNIQUE(child_id, user_id)
);

-- ===== 3. events (육아 기록) =====
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  recorder_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('feed', 'sleep', 'poop', 'pee', 'temp', 'memo')),
  start_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_ts TIMESTAMPTZ,
  amount_ml INTEGER,
  tags JSONB,
  source TEXT NOT NULL DEFAULT 'quick_button' CHECK (source IN ('quick_button', 'gesture', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== 4. predictions (AI 예측) =====
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  target TEXT NOT NULL CHECK (target IN ('feed_next', 'sleep_next')),
  predicted_ts TIMESTAMPTZ NOT NULL,
  ci_low TIMESTAMPTZ,
  ci_high TIMESTAMPTZ,
  actual_ts TIMESTAMPTZ,
  model_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== 5. anomalies (이상 감지) =====
CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('feed_amount', 'sleep_duration', 'temperature', 'record_gap')),
  delta FLOAT,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'major', 'critical')),
  suggestion TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== 6. growth_records (성장 기록) =====
CREATE TABLE growth_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,2),
  head_cm NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== 7. places (장소) =====
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('pediatric', 'kids_cafe', 'nursing_room', 'playground', 'pharmacy', 'culture_center')),
  address TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  phone TEXT,
  hours JSONB,
  tags TEXT[],
  avg_rating NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'api' CHECK (source IN ('api', 'user', 'admin')),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== 8. reviews (리뷰) =====
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 500),
  tags TEXT[],
  photos TEXT[],
  child_age_months INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE(place_id, user_id)
);

-- ===== 인덱스 =====
CREATE INDEX idx_children_user ON children(user_id);
CREATE INDEX idx_events_child_date ON events(child_id, start_ts DESC);
CREATE INDEX idx_events_type ON events(child_id, type, start_ts DESC);
CREATE INDEX idx_places_location ON places USING GIST(location);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_reviews_place ON reviews(place_id, created_at DESC);
CREATE INDEX idx_caregivers_child ON caregivers(child_id);
CREATE INDEX idx_caregivers_user ON caregivers(user_id);
CREATE INDEX idx_growth_child ON growth_records(child_id, measured_at DESC);
CREATE INDEX idx_predictions_child ON predictions(child_id, created_at DESC);

-- ===== RLS 활성화 =====
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ===== RLS 정책 =====

-- children: 본인 + 공동양육자
CREATE POLICY "children_select" ON children FOR SELECT USING (
  user_id = auth.uid()
  OR id IN (SELECT child_id FROM caregivers WHERE user_id = auth.uid() AND accepted_at IS NOT NULL)
);
CREATE POLICY "children_insert" ON children FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "children_update" ON children FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "children_delete" ON children FOR DELETE USING (user_id = auth.uid());

-- caregivers: 본인 관련
CREATE POLICY "caregivers_select" ON caregivers FOR SELECT USING (
  user_id = auth.uid()
  OR child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);
CREATE POLICY "caregivers_insert" ON caregivers FOR INSERT WITH CHECK (
  child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);
CREATE POLICY "caregivers_delete" ON caregivers FOR DELETE USING (
  child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);

-- events: 본인 + 공동양육자
CREATE POLICY "events_select" ON events FOR SELECT USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
    UNION
    SELECT child_id FROM caregivers WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
    UNION
    SELECT child_id FROM caregivers WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
  AND recorder_id = auth.uid()
);
CREATE POLICY "events_update" ON events FOR UPDATE USING (recorder_id = auth.uid());
CREATE POLICY "events_delete" ON events FOR DELETE USING (
  child_id IN (SELECT id FROM children WHERE user_id = auth.uid())
);

-- predictions, anomalies, growth_records: children과 동일 패턴
CREATE POLICY "predictions_select" ON predictions FOR SELECT USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
    UNION
    SELECT child_id FROM caregivers WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "anomalies_select" ON anomalies FOR SELECT USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
    UNION
    SELECT child_id FROM caregivers WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "growth_records_select" ON growth_records FOR SELECT USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
    UNION
    SELECT child_id FROM caregivers WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);
CREATE POLICY "growth_records_insert" ON growth_records FOR INSERT WITH CHECK (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
    UNION
    SELECT child_id FROM caregivers WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

-- places: 전체 공개 (읽기)
CREATE POLICY "places_read" ON places FOR SELECT USING (true);

-- reviews: 전체 공개 (읽기), 작성/수정은 본인
CREATE POLICY "reviews_read" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_update" ON reviews FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "reviews_delete" ON reviews FOR DELETE USING (user_id = auth.uid());

-- ===== Realtime 활성화 (공동양육자 동기화) =====
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE children;
