-- 끌어올리기 + 할인 기능
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS bumped_at TIMESTAMPTZ;
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS original_price INTEGER;
ALTER TABLE market_items ADD COLUMN IF NOT EXISTS discounted_at TIMESTAMPTZ;

-- bumped_at 인덱스 (목록 정렬용: COALESCE(bumped_at, created_at) DESC)
CREATE INDEX IF NOT EXISTS idx_market_items_bump ON market_items(COALESCE(bumped_at, created_at) DESC);

