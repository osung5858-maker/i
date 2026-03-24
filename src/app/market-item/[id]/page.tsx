'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PublicMarketItemPage() {
  const params = useParams()
  const itemId = params.id as string
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('market_items').select('*').eq('id', itemId).single()
      if (data) setItem(data)
      setLoading(false)
    }
    load()
  }, [itemId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-white">
        <div className="w-8 h-8 border-3 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-white px-6">
        <p className="text-[15px] text-[#868B94] mb-4">게시글을 찾을 수 없어요</p>
        <Link href="/onboarding" className="text-[13px] text-[#3D8A5A] font-semibold">도담 시작하기 →</Link>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#3D8A5A] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">도</span>
            </div>
            <span className="text-[15px] font-bold text-[#1A1918]">도담장터</span>
          </div>
          <Link href="/onboarding" className="text-[11px] text-[#3D8A5A] font-semibold px-3 py-1.5 bg-[#F0F9F4] rounded-lg">도담 시작하기</Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-20 space-y-3">
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          {/* 사진 */}
          {item.photos && item.photos.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar">
              {item.photos.map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-40 h-40 rounded-xl object-cover shrink-0" />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[16px] font-bold text-[#1A1918]">{item.title}</h2>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-[#F0F9F4] text-[#3D8A5A]' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
              {item.status === 'active' ? '판매중' : item.status === 'reserved' ? '예약중' : '거래완료'}
            </span>
          </div>

          <p className="text-[20px] font-bold text-[#3D8A5A] mb-3">{item.price > 0 ? `${item.price.toLocaleString()}원` : '나눔 🤝'}</p>

          {item.description && <p className="text-[13px] text-[#1A1918] leading-relaxed whitespace-pre-line">{item.description}</p>}

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f0f0f0]">
            <span className="text-[10px] text-[#868B94]">{item.region}</span>
            <span className="text-[10px] text-[#AEB1B9]">{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#F0F9F4] rounded-xl p-4 text-center">
          <p className="text-[13px] font-semibold text-[#3D8A5A] mb-1">도담장터에서 거래해보세요</p>
          <p className="text-[11px] text-[#868B94] mb-3">동네 엄마들과 육아용품 나눔 · 거래</p>
          <Link href="/onboarding" className="inline-block px-6 py-2.5 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl">도담 시작하기</Link>
        </div>
      </div>
    </div>
  )
}
