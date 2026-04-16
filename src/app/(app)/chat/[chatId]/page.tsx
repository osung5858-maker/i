'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getChatById, getChatMessages, getNewMessages, sendMessage, markAsRead, type MarketChat, type ChatMessage } from '@/lib/supabase/marketChat'
import PageHeader from '@/components/layout/PageHeader'
import Image from 'next/image'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`
}

function parsePhotos(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  return []
}

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.chatId as string

  const [chat, setChat] = useState<MarketChat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastTsRef = useRef<string>('')

  // 초기 로드 (chatId 변경 시 상태 리셋)
  useEffect(() => {
    setLoading(true)
    setMessages([])
    setChat(null)
    lastTsRef.current = ''

    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      setUserId(user.id)

      const chatData = await getChatById(chatId)
      if (!chatData) { router.push('/chat'); return }
      setChat(chatData)

      const msgs = await getChatMessages(chatId, 50)
      setMessages(msgs)
      if (msgs.length > 0) {
        lastTsRef.current = msgs[msgs.length - 1].created_at
      }

      await markAsRead(chatId)
      setLoading(false)
    }
    init()
  }, [chatId, router])

  // 스크롤 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 5초 폴링
  useEffect(() => {
    if (!chatId || loading) return
    const interval = setInterval(async () => {
      if (document.hidden) return
      const ts = lastTsRef.current
      if (!ts) return
      const newMsgs = await getNewMessages(chatId, ts)
      if (newMsgs.length > 0) {
        setMessages(prev => [...prev, ...newMsgs])
        lastTsRef.current = newMsgs[newMsgs.length - 1].created_at
        await markAsRead(chatId)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [chatId, loading])

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const msg = await sendMessage(chatId, text.trim())
    if (msg) {
      setMessages(prev => [...prev, msg])
      lastTsRef.current = msg.created_at
      setText('')

      // 푸시 알림 (상대방에게)
      if (chat) {
        const partnerId = userId === chat.buyer_id ? chat.seller_id : chat.buyer_id
        const itemTitle = chat.market_items?.title || '장터 아이템'
        fetch('/api/push/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: partnerId,
            title: '도담장터 새 메시지',
            body: text.trim().slice(0, 80),
            url: `/chat/${chatId}`,
            tag: 'market_chat',
          }),
        }).catch(() => {})
      }
    }
    setSending(false)
    inputRef.current?.focus()
  }, [text, sending, chatId, chat, userId])

  // 판매자: 상태 변경 (판매자만 가능)
  const updateItemStatus = useCallback(async (newStatus: string) => {
    if (!chat || userId !== chat.seller_id || statusUpdating) return
    setStatusUpdating(true)
    const supabase = createClient()
    const { error } = await supabase.from('market_items').update({ status: newStatus }).eq('id', chat.item_id)
    if (error) {
      console.error('[chat] updateItemStatus failed:', error)
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '상태 변경에 실패했어요' } }))
      setStatusUpdating(false)
      return
    }
    setChat(prev => prev ? {
      ...prev,
      market_items: prev.market_items ? { ...prev.market_items, status: newStatus } : undefined,
    } : null)

    // 시스템 메시지처럼 알림
    const statusLabel = newStatus === 'reserved' ? '예약중' : '거래완료'
    const msg = await sendMessage(chatId, `[상태 변경] ${statusLabel}으로 변경했어요`)
    if (msg) {
      setMessages(prev => [...prev, msg])
      lastTsRef.current = msg.created_at
    }

    setStatusUpdating(false)
  }, [chat, chatId, statusUpdating, userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  if (!chat) return null

  const partnerId = userId === chat.buyer_id ? chat.seller_id : chat.buyer_id
  const isSeller = userId === chat.seller_id
  const itemStatus = chat.market_items?.status || 'active'

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <div className="max-w-lg mx-auto w-full pb-44">
        <PageHeader title={isSeller ? '구매자' : '판매자'} />

        {/* 상품 미니 카드 */}
        {chat.market_items && (
          <div className="flex items-center gap-3 px-4 py-2 bg-[#F8F6F3] border-b border-[#E8E4DF]/60">
            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden relative shrink-0">
              {parsePhotos(chat.market_items.photos)[0] ? (
                <Image src={parsePhotos(chat.market_items.photos)[0]} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">📦</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body text-primary truncate">{chat.market_items.title}</p>
              <p className="text-body text-secondary">
                {chat.market_items.price === 0 ? '무료 나눔' : `${chat.market_items.price.toLocaleString()}원`}
                {itemStatus === 'reserved' && <span className="ml-1 text-[#D89575] font-semibold">· 예약중</span>}
                {itemStatus === 'done' && <span className="ml-1 text-tertiary font-semibold">· 거래완료</span>}
              </p>
            </div>
            {/* 판매자 상태 변경 */}
            {isSeller && itemStatus === 'active' && (
              <button
                disabled={statusUpdating}
                onClick={() => updateItemStatus('reserved')}
                className="text-body font-semibold text-[#D89575] px-2 py-1 rounded-lg bg-[#D89575]/10 shrink-0 disabled:opacity-50"
              >
                {statusUpdating ? '변경중...' : '예약중'}
              </button>
            )}
            {isSeller && itemStatus === 'reserved' && (
              <button
                disabled={statusUpdating}
                onClick={() => updateItemStatus('done')}
                className="text-body font-semibold text-[var(--color-primary)] px-2 py-1 rounded-lg bg-[var(--color-primary)]/10 shrink-0 disabled:opacity-50"
              >
                {statusUpdating ? '변경중...' : '완료'}
              </button>
            )}
          </div>
        )}

        {/* 메시지 영역 */}
        <div className="px-4 py-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-body text-tertiary">첫 메시지를 보내보세요!</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMine = msg.sender_id === userId
            const showTime = i === messages.length - 1 ||
              messages[i + 1]?.sender_id !== msg.sender_id ||
              new Date(messages[i + 1]?.created_at).getTime() - new Date(msg.created_at).getTime() > 60000

            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-3 py-2 rounded-2xl text-body-emphasis leading-relaxed whitespace-pre-line ${
                      isMine
                        ? 'bg-[var(--color-primary)] text-white rounded-br-md'
                        : 'bg-white border border-[#E8E4DF] text-primary rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {showTime && (
                    <p className={`text-[11px] text-tertiary mt-0.5 ${isMine ? 'text-right' : 'text-left'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

      </div>

      {/* 입력 영역 — GNB 위에 fixed */}
      <div className="fixed bottom-[80px] left-0 right-0 z-30 bg-white border-t border-[#E8E4DF]">
        <div className="flex items-center gap-2 px-4 py-3 max-w-lg mx-auto">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="메시지를 입력하세요..."
            maxLength={500}
            className="flex-1 h-10 px-4 rounded-full bg-[var(--color-page-bg)] text-body-emphasis focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              text.trim() ? 'bg-[var(--color-primary)] text-white active:opacity-80' : 'bg-[#E8E4DF] text-tertiary'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
