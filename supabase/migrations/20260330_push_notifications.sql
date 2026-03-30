-- 푸시 토큰 테이블
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('web', 'ios', 'android')) DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- 알림 설정 테이블
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  predict_feed BOOLEAN DEFAULT true,
  predict_sleep BOOLEAN DEFAULT true,
  vaccination BOOLEAN DEFAULT true,
  daily_encourage BOOLEAN DEFAULT true,
  ai_insight BOOLEAN DEFAULT true,
  dnd_start TEXT DEFAULT '22:00',
  dnd_end TEXT DEFAULT '07:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 알림 발송 이력 (재전송 방지)
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clicked_at TIMESTAMPTZ,
  deeplink TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id, sent_at DESC);
