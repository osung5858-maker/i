import { createClient } from '@/lib/supabase/client'
import { sanitizeUserInput } from '@/lib/sanitize'

export interface MarketChat {
  id: string
  item_id: string
  buyer_id: string
  seller_id: string
  last_message: string | null
  last_message_at: string
  buyer_unread: number
  seller_unread: number
  created_at: string
  // joined
  market_items?: { title: string; price: number; photos: string[]; status: string }
}

export interface ChatMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

/**
 * 채팅 스레드 생성 또는 기존 반환 (구매자 전용)
 */
export async function getOrCreateChat(itemId: string, sellerId: string): Promise<MarketChat | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 자기 자신 아이템에 채팅 방지
  if (user.id === sellerId) return null

  // upsert로 race condition 방지 (UNIQUE(item_id, buyer_id))
  const { data, error } = await supabase
    .from('market_chats')
    .upsert(
      { item_id: itemId, buyer_id: user.id, seller_id: sellerId },
      { onConflict: 'item_id,buyer_id', ignoreDuplicates: true }
    )
    .select()
    .single()

  if (error) {
    // upsert ignoreDuplicates 시 데이터 미반환 → 조회로 폴백
    const { data: existing } = await supabase
      .from('market_chats')
      .select('*')
      .eq('item_id', itemId)
      .eq('buyer_id', user.id)
      .single()
    return (existing as MarketChat) || null
  }
  return data as MarketChat
}

/**
 * 메시지 전송
 */
export async function sendMessage(chatId: string, content: string): Promise<ChatMessage | null> {
  const sanitized = sanitizeUserInput(content, 500)
  if (!sanitized) return null

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('market_chat_messages')
    .insert({ chat_id: chatId, sender_id: user.id, content: sanitized })
    .select()
    .single()

  if (error) {
    console.error('[sendMessage]', error.message)
    return null
  }
  return data as ChatMessage
}

/**
 * 내 채팅 목록 (buyer 또는 seller)
 */
export async function getMyChats(): Promise<MarketChat[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('market_chats')
    .select('*, market_items(title, price, photos, status)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false })

  if (error) {
    console.error('[getMyChats]', error.message)
    return []
  }
  return (data || []) as MarketChat[]
}

/**
 * 채팅 메시지 조회 (커서 페이지네이션)
 */
export async function getChatMessages(
  chatId: string,
  limit = 30,
  beforeTs?: string
): Promise<ChatMessage[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('market_chat_messages')
    .select('id, chat_id, sender_id, content, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (beforeTs) {
    query = query.lt('created_at', beforeTs)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getChatMessages]', error.message)
    return []
  }
  return ((data || []) as ChatMessage[]).reverse()
}

/**
 * 새 메시지만 가져오기 (폴링용)
 */
export async function getNewMessages(chatId: string, afterTs: string): Promise<ChatMessage[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('market_chat_messages')
    .select('id, chat_id, sender_id, content, created_at')
    .eq('chat_id', chatId)
    .gt('created_at', afterTs)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getNewMessages]', error.message)
    return []
  }
  return (data || []) as ChatMessage[]
}

/**
 * 안읽음 카운터 리셋
 */
export async function markAsRead(chatId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // 내가 buyer인지 seller인지 확인 후 해당 unread만 리셋
  const { data: chat } = await supabase
    .from('market_chats')
    .select('buyer_id, seller_id')
    .eq('id', chatId)
    .single()

  if (!chat) return

  const updateField = chat.buyer_id === user.id
    ? { buyer_unread: 0 }
    : { seller_unread: 0 }

  await supabase.from('market_chats').update(updateField).eq('id', chatId)
}

/**
 * 전체 안읽은 메시지 수
 */
export async function getUnreadTotal(): Promise<number> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data, error } = await supabase
    .from('market_chats')
    .select('buyer_id, seller_id, buyer_unread, seller_unread')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

  if (error || !data) return 0

  return data.reduce((total: number, chat: { buyer_id: string; buyer_unread: number; seller_unread: number }) => {
    if (chat.buyer_id === user.id) return total + (chat.buyer_unread || 0)
    return total + (chat.seller_unread || 0)
  }, 0)
}

/**
 * 단일 채팅 조회 (RLS + 앱 레벨 참여자 확인)
 */
export async function getChatById(chatId: string): Promise<MarketChat | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // RLS가 참여자만 SELECT 허용하지만 앱 레벨에서도 방어
  const { data, error } = await supabase
    .from('market_chats')
    .select('*, market_items(title, price, photos, status)')
    .eq('id', chatId)
    .single()

  if (error || !data) return null
  const chat = data as MarketChat
  if (chat.buyer_id !== user.id && chat.seller_id !== user.id) return null
  return chat
}
