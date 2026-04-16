'use client'

import { useEffect, useState } from 'react'
import KakaoAdFit from './KakaoAdFit'
import GoogleAdBanner from './GoogleAdBanner'
import AdMobBanner from './AdMobBanner'

interface AdSlotData {
  id: string
  enabled: boolean
  provider: 'kakao' | 'google' | 'admob'
  unit_id: string | null
  width: number
  height: number
  page_path: string
}

// 메모리 캐시 — 동일 세션 내 중복 fetch 방지
let cachedSlots: AdSlotData[] | null = null
let cacheTime = 0
const CACHE_TTL = 60_000 // 1분

async function fetchSlots(): Promise<AdSlotData[]> {
  const now = Date.now()
  if (cachedSlots && now - cacheTime < CACHE_TTL) return cachedSlots
  try {
    const res = await fetch('/api/ads')
    if (!res.ok) return cachedSlots ?? []
    const data = await res.json()
    cachedSlots = data.slots ?? []
    cacheTime = now
    return cachedSlots!
  } catch {
    return cachedSlots ?? []
  }
}

interface DynamicAdProps {
  /** ad_settings 테이블의 id (예: 'home_banner', 'notification_top') */
  slotId: string
  className?: string
}

/**
 * DB의 ad_settings에서 설정을 읽어 자동으로 광고를 렌더링.
 * 어드민에서 enabled=false면 아무것도 렌더링하지 않음.
 */
export default function DynamicAd({ slotId, className = '' }: DynamicAdProps) {
  const [slot, setSlot] = useState<AdSlotData | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetchSlots().then(slots => {
      const found = slots.find(s => s.id === slotId)
      setSlot(found ?? null)
      setChecked(true)
    })
  }, [slotId])

  // 로딩 중이거나 비활성 슬롯이면 아무것도 안 보여줌
  if (!checked || !slot || !slot.unit_id) return null

  if (slot.provider === 'kakao') {
    return (
      <KakaoAdFit
        unit={slot.unit_id}
        width={slot.width}
        height={slot.height}
        className={className}
      />
    )
  }

  if (slot.provider === 'google') {
    return (
      <GoogleAdBanner
        adSlot={slot.unit_id}
        className={className}
      />
    )
  }

  if (slot.provider === 'admob') {
    return <AdMobBanner adUnitId={slot.unit_id} className={className} />
  }

  return null
}
