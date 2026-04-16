-- ad_settings 테이블에 'admob' provider 추가
-- 기존 kakao, google에 admob을 허용

ALTER TABLE ad_settings DROP CONSTRAINT IF EXISTS ad_settings_provider_check;
ALTER TABLE ad_settings ADD CONSTRAINT ad_settings_provider_check
  CHECK (provider IN ('kakao', 'google', 'admob'));

-- 네이티브 AdMob 기본 슬롯 추가 (모두 비활성)
INSERT INTO ad_settings (id, enabled, provider, unit_id, width, height, page_path)
VALUES
  ('native_home_bottom', false, 'admob', null, 320, 50, '/'),
  ('native_community_bottom', false, 'admob', null, 320, 50, '/community')
ON CONFLICT (id) DO NOTHING;
