'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CareEvent } from '@/types'

interface Props {
  events: CareEvent[]
}

export default function EmergencyCard({ events }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  // 최근 체온 이벤트에서 37.5도 이상 감지
  const recentTemp = events.find((e) => {
    if (e.type !== 'temp') return false
    const celsius = e.tags?.celsius as number | undefined
    return celsius && celsius >= 37.5
  })

  if (!recentTemp) return null

  const celsius = recentTemp.tags?.celsius as number
  const isCritical = celsius >= 38.5

  return (
    <div className={`mx-4 mb-3 p-4 rounded-2xl border ${
      isCritical
        ? 'bg-red-50 border-red-200'
        : 'bg-orange-50 border-orange-200'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{isCritical ? '🚨' : '⚠️'}</span>
        <div className="flex-1">
          <p className={`text-[14px] font-bold ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>
            체온 {celsius}°C {isCritical ? '— 고열이에요!' : '— 미열이에요'}
          </p>
          <p className="text-[12px] text-[#6B6966] mt-1">
            {isCritical
              ? '가까운 소아과를 확인해보세요.'
              : '경과를 살펴보세요. 38.5°C 이상이면 소아과 방문을 권해요.'}
          </p>
          <Link
            href="/emergency"
            className={`inline-flex items-center gap-1 mt-2 text-[12px] font-semibold ${
              isCritical ? 'text-red-600' : 'text-orange-600'
            }`}
          >
            가까운 소아과 보기 →
          </Link>
          <p className="text-[10px] text-[#9E9A95] mt-2">
            ⚠️ 참고용 정보예요. 걱정되시면 소아과 상담을 추천드려요.
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-[#9E9A95] text-xs p-1">✕</button>
      </div>
    </div>
  )
}
