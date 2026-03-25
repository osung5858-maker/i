'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { CareEvent } from '@/types'
import { createBrowserClient } from '@supabase/ssr'

interface Props {
  events: CareEvent[]
}

export default function EmergencyCard({ events }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [notified, setNotified] = useState(false)
  const [notifying, setNotifying] = useState(false)

  // 공동양육자에게 알림 전송
  const notifyCaregivers = useCallback(async (temp: number) => {
    setNotifying(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 내가 속한 가족의 공동양육자 조회
      const { data: relations } = await supabase
        .from('caregivers')
        .select('user_id, caregiver_id')
        .or(`user_id.eq.${user.id},caregiver_id.eq.${user.id}`)
        .eq('status', 'accepted')

      if (!relations || relations.length === 0) return

      // 알림 생성
      const targets = relations.map((r) => r.user_id === user.id ? r.caregiver_id : r.user_id)
      const notifications = targets.map((targetId) => ({
        user_id: targetId,
        type: 'health_alert',
        title: `체온 ${temp}°C 기록됨`,
        body: `체온이 ${temp >= 38.5 ? '고열' : '미열'} 수준이에요. 확인해보세요.`,
        read: false,
      }))

      await supabase.from('notifications').insert(notifications)
      setNotified(true)
    } catch {
      // 알림 테이블 미존재 시 무시
    } finally {
      setNotifying(false)
    }
  }, [])

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
          <p className="text-[14px] text-[#6B6966] mt-1">
            {isCritical
              ? '가까운 소아과를 확인해보세요.'
              : '경과를 살펴보세요. 38.5°C 이상이면 소아과 방문을 권해요.'}
          </p>
          <div className="flex gap-2 mt-2">
            <Link
              href="/emergency"
              className={`inline-flex items-center gap-1 text-[14px] font-semibold ${
                isCritical ? 'text-red-600' : 'text-orange-600'
              }`}
            >
              가까운 소아과 보기 →
            </Link>
            {!notified ? (
              <button
                onClick={() => notifyCaregivers(celsius)}
                disabled={notifying}
                className="text-[13px] font-semibold text-[#5B4A8A] bg-[#F0EDF6] px-2.5 py-0.5 rounded-full"
              >
                {notifying ? '전송 중...' : '공동양육자 알리기'}
              </button>
            ) : (
              <span className="text-[12px] text-[#2D7A4A] font-medium">전송 완료</span>
            )}
          </div>
          <p className="text-[14px] text-[#9E9A95] mt-2">
            ⚠️ 참고용 정보예요. 걱정되시면 소아과 상담을 추천드려요.
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-[#9E9A95] text-xs p-1">✕</button>
      </div>
    </div>
  )
}
