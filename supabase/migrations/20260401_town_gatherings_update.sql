-- 소모임 테이블에 카테고리와 모임 빈도 추가
ALTER TABLE town_gatherings
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('playgroup', 'study', 'hobby', 'support', 'outdoor', 'etc')),
ADD COLUMN IF NOT EXISTS meeting_frequency TEXT CHECK (meeting_frequency IN ('weekly', 'biweekly', 'monthly', 'irregular'));

-- scheduled_at을 nullable로 변경 (소모임은 정기 모임이므로 특정 날짜 필수 아님)
ALTER TABLE town_gatherings
ALTER COLUMN scheduled_at DROP NOT NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_town_gatherings_category ON town_gatherings(category);
CREATE INDEX IF NOT EXISTS idx_town_gatherings_creator ON town_gatherings(creator_id, status);
