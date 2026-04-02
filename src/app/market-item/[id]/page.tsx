'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function PublicMarketItemPage() {
  const params = useParams()
  const itemId = params.id as string
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('market_items').select('id, title, description, price, status, photos, region, created_at').eq('id', itemId).single()
      if (data) setItem(data)
      setLoading(false)
    }
    load()
  }, [itemId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-white">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-white px-6">
        <p className="text-subtitle text-secondary mb-4">게시글을 찾을 수 없어요</p>
        <Link href="/onboarding" className="text-body text-[var(--color-primary)] font-semibold">도담 시작하기 →</Link>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-[#E8E4DF]/60">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
              <span className="text-body-emphasis font-bold text-white">도</span>
            </div>
            <span className="text-subtitle text-primary">도담장터</span>
          </div>
          <Link href="/onboarding" className="text-body text-[var(--color-primary)] font-semibold px-3 py-1.5 bg-[#F0F9F4] rounded-lg">도담 시작하기</Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          {/* 사진 */}
          {item.photos && item.photos.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar">
              {item.photos.map((url: string, i: number) => (
                <div key={i} className="relative w-40 h-40 rounded-xl overflow-hidden shrink-0">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-subtitle font-bold text-primary">{item.title}</h2>
            <span className={`text-body px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-[#F0F9F4] text-[var(--color-primary)]' : 'bg-[var(--color-page-bg)] text-secondary'}`}>
              {item.status === 'active' ? '판매중' : item.status === 'reserved' ? '예약중' : '거래완료'}
            </span>
          </div>

          <p className="text-heading-2 text-[var(--color-primary)] mb-3">{item.price > 0 ? `${item.price.toLocaleString()}원` : '나눔'}</p>

          {item.description && <p className="text-body text-primary leading-relaxed whitespace-pre-line">{item.description}</p>}

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8E4DF]">
            <span className="text-body-emphasis text-secondary">{item.region}</span>
            <span className="text-body-emphasis text-tertiary">{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#F0F9F4] rounded-xl p-4 text-center">
          <p className="text-body font-semibold text-[var(--color-primary)] mb-1">도담장터에서 거래해보세요</p>
          <p className="text-body text-secondary mb-3">동네 엄마들과 육아용품 나눔 · 거래</p>
          <Link href="/onboarding" className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl">도담 시작하기</Link>
        </div>
      </div>
    </div>
  )
}
