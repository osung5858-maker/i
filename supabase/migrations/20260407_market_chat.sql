-- 거래 채팅 스레드
CREATE TABLE IF NOT EXISTS market_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES market_items(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  buyer_unread INTEGER DEFAULT 0,
  seller_unread INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_market_chats_buyer ON market_chats(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_chats_seller ON market_chats(seller_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_chats_item ON market_chats(item_id);

-- 채팅 메시지
CREATE TABLE IF NOT EXISTS market_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES market_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_chat_messages_chat ON market_chat_messages(chat_id, created_at DESC);

-- RLS
ALTER TABLE market_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_chat_messages ENABLE ROW LEVEL SECURITY;

-- market_chats: 참여자만 조회/수정, 구매자만 생성
CREATE POLICY "market_chats_select" ON market_chats FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "market_chats_insert" ON market_chats FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "market_chats_update" ON market_chats FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- market_chat_messages: 참여자만 조회, 참여자만 작성
CREATE POLICY "market_chat_messages_select" ON market_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM market_chats c
    WHERE c.id = chat_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  ));

CREATE POLICY "market_chat_messages_insert" ON market_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM market_chats c
      WHERE c.id = chat_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- 트리거: 새 메시지 → market_chats 갱신
CREATE OR REPLACE FUNCTION update_market_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE market_chats SET
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    buyer_unread = CASE WHEN NEW.sender_id = seller_id THEN buyer_unread + 1 ELSE buyer_unread END,
    seller_unread = CASE WHEN NEW.sender_id = buyer_id THEN seller_unread + 1 ELSE seller_unread END
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_market_chat_message_insert
  AFTER INSERT ON market_chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_market_chat_on_message();
