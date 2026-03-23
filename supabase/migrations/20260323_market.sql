-- 나눔/거래 아이템
CREATE TABLE IF NOT EXISTS market_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  description TEXT CHECK (char_length(description) <= 1000),
  price INTEGER DEFAULT 0, -- 0 = 무료 나눔
  category TEXT NOT NULL CHECK (category IN ('clothes', 'feeding', 'toys', 'furniture', 'stroller', 'etc')),
  baby_age_months TEXT, -- '0~6', '6~12', '12~24' 등
  region TEXT, -- '강남구', '분당'
  photos JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'done')),
  chat_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_status ON market_items(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_category ON market_items(category);

ALTER TABLE market_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_select" ON market_items FOR SELECT USING (true);
CREATE POLICY "market_insert" ON market_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "market_update" ON market_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "market_delete" ON market_items FOR DELETE USING (auth.uid() = user_id);
