-- ============================================================
-- 모드 1/2 기록 테이블 (2026-03-31)
-- 임신 준비(prep_events), 임신 중(pregnant_events)
-- ============================================================

-- ===== 1. pregnant_events (모드2: 임신 중 기록) =====
CREATE TABLE IF NOT EXISTS pregnant_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  start_ts    TIMESTAMPTZ NOT NULL DEFAULT now(),
  tags        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pregnant_events_user_date
  ON pregnant_events(user_id, start_ts DESC);

ALTER TABLE pregnant_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pregnant_events_select" ON pregnant_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pregnant_events_insert" ON pregnant_events
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pregnant_events_delete" ON pregnant_events
  FOR DELETE USING (user_id = auth.uid());


-- ===== 2. prep_events (모드1: 임신 준비 기록) =====
CREATE TABLE IF NOT EXISTS prep_events (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT  NOT NULL,
  recorded_date DATE  NOT NULL DEFAULT CURRENT_DATE,
  tags          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prep_events_user_date
  ON prep_events(user_id, recorded_date DESC);

ALTER TABLE prep_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prep_events_select" ON prep_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "prep_events_insert" ON prep_events
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "prep_events_delete" ON prep_events
  FOR DELETE USING (user_id = auth.uid());
