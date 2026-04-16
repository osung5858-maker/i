'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMyChats, type MarketChat } from '@/lib/supabase/marketChat'
import { ChatBubbleIcon } from '@/components/ui/Icons'
import PageHeader from '@/components/layout/PageHeader'
import Image from 'next/image'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return `${Math.floor(day / 7)}주 전`
}

export default function ChatListPage() {
  const router = useRouter()
  const [chats, setChats] = useState<MarketChat[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadChats = useCallback(async () => {
    const data = await getMyChats()
    setChats(data)
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      setUserId(user.id)
      await loadChats()
      setLoading(false)
    }
    init()
  }, [router, loadChats])

  // 10초 폴링
  useEffect(() => {
    if (loading) return
    const interval = setInterval(() => {
      if (document.hidden) return
      loadChats()
    }, 10000)
    return () => clearInterval(interval)
  }, [loading, loadChats])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <PageHeader title="거래 채팅" />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-4">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-tertiary">
            <ChatBubbleIcon className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-body-emphasis">거래 채팅이 없어요</p>
            <p className="text-body mt-1">도담장터에서 마음에 드는 물품에 거래 신청을 해보세요</p>
            <button
              onClick={() => router.push('/town?tab=market')}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-semibold active:opacity-80"
            >
              도담장터 가기
            </button>
          </div>
        ) : (() => {
          const enriched = chats.map((chat) => {
            const isBuyer = userId === chat.buyer_id
            const unread = isBuyer ? chat.buyer_unread : chat.seller_unread
            return { chat, unread }
          })
          const unreadChats = enriched.filter(c => c.unread > 0)
          const readChats = enriched.filter(c => c.unread === 0)

          const renderChat = ({ chat, unread }: { chat: MarketChat; unread: number }, idx: number, arr: typeof enriched) => {
            const isBuyer = userId === chat.buyer_id
            const itemTitle = chat.market_items?.title || '물품'
            const rawPhotos = chat.market_items?.photos
            const photos = Array.isArray(rawPhotos) ? rawPhotos : (typeof rawPhotos === 'string' ? (() => { try { return JSON.parse(rawPhotos) } catch { return [] } })() : [])
            const itemPhoto = photos[0] as string | undefined
            const itemStatus = chat.market_items?.status
            const isLast = idx === arr.length - 1

            return (
              <button
                key={chat.id}
                onClick={() => router.push(`/chat/${chat.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[var(--color-page-bg)] ${unread > 0 ? 'bg-[#FDFBF9]' : ''} ${!isLast ? 'border-b border-[#F0EDE8]' : ''}`}
              >
                {/* unread dot */}
                {unread > 0 && (
                  <span className="block w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />
                )}

                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-body leading-snug truncate ${unread > 0 ? 'font-semibold text-primary' : 'font-medium text-secondary'}`}>
                      {isBuyer ? '판매자' : '구매자'} · {itemTitle}
                    </span>
                    {itemStatus === 'reserved' && (
                      <span className="text-[10px] font-semibold text-[#D89575] bg-[#D89575]/10 px-1.5 py-0.5 rounded shrink-0">예약중</span>
                    )}
                    {itemStatus === 'done' && (
                      <span className="text-[10px] font-semibold text-tertiary bg-[#E8E4DF] px-1.5 py-0.5 rounded shrink-0">완료</span>
                    )}
                  </div>
                  <p className="text-caption text-tertiary mt-0.5 leading-snug truncate">
                    {chat.last_message || '새로운 대화를 시작해보세요'}
                  </p>
                  <p className="text-label text-muted mt-1">{timeAgo(chat.last_message_at)}</p>
                </div>

                {/* 상품 썸네일 */}
                <div className="w-10 h-10 rounded-lg bg-[var(--color-page-bg)] overflow-hidden relative shrink-0">
                  {itemPhoto ? (
                    <Image src={itemPhoto} alt="" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">📦</div>
                  )}
                </div>
              </button>
            )
          }

          return (
            <>
              {unreadChats.length > 0 && (
                <div>
                  <p className="text-caption font-bold text-tertiary mb-2 uppercase tracking-wide">읽지 않은 대화</p>
                  <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
                    {unreadChats.map((c, i, a) => renderChat(c, i, a))}
                  </div>
                </div>
              )}

              {readChats.length > 0 && (
                <div>
                  {unreadChats.length > 0 && (
                    <p className="text-caption font-bold text-tertiary mb-2 uppercase tracking-wide">이전 대화</p>
                  )}
                  <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
                    {readChats.map((c, i, a) => renderChat(c, i, a))}
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
