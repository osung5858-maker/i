'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { CareEvent } from '@/types'
import { predictNextEvent } from '@/lib/ai/prediction-engine'

interface Props {
  events: CareEvent[]
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatTimeRemaining(ts: string): string {
  const diff = new Date(ts).getTime() - Date.now()
  if (diff < 0) return '지금'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins}분 후`
  const hrs = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${hrs}시간 ${m}분 후` : `${hrs}시간 후`
}

export default function SmartReminder({ events }: Props) {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const scheduledRef = useRef<Set<string>>(new Set())
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const feedPred = useMemo(() => predictNextEvent(events, 'feed'), [events])
  const sleepPred = useMemo(() => predictNextEvent(events, 'sleep'), [events])

  // Check notification support
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported')
      return
    }
    setNotifPermission(Notification.permission)
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }, [])

  // Schedule browser notifications 30 min before
  useEffect(() => {
    // Cleanup previous timeouts
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    if (notifPermission !== 'granted') return

    const predictions = [
      feedPred ? { ...feedPred, label: '수유', emoji: '🍼' } : null,
      sleepPred ? { ...sleepPred, label: '낮잠', emoji: '💤' } : null,
    ].filter(Boolean) as { predicted_ts: string; label: string; emoji: string; target: string }[]

    predictions.forEach((pred) => {
      const key = `${pred.target}_${pred.predicted_ts}`
      if (scheduledRef.current.has(key)) return

      const alertTime = new Date(pred.predicted_ts).getTime() - 30 * 60 * 1000
      const delay = alertTime - Date.now()

      if (delay > 0 && delay < 4 * 60 * 60 * 1000) {
        scheduledRef.current.add(key)
        const timeout = setTimeout(() => {
          try {
            new Notification(`도담 ${pred.emoji} ${pred.label} 알림`, {
              body: `약 30분 후 ${pred.label} 시간이에요. (예상 ${formatTime(pred.predicted_ts)})`,
              icon: '/icon-192x192.png',
              tag: key,
            })
          } catch { /* ignore */ }
        }, delay)
        timeoutsRef.current.push(timeout)
      }
    })

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
  }, [feedPred, sleepPred, notifPermission])

  const hasPredictions = feedPred || sleepPred
  if (!hasPredictions) return null

  return (
    <div className="mx-4 mb-3">
      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(26,25,24,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px]">🔔</span>
            <span className="text-[13px] font-bold text-[#212124]">스마트 리마인더</span>
          </div>
          {notifPermission === 'default' && (
            <button
              onClick={requestPermission}
              className="text-[13px] font-semibold text-[#5B6DFF] active:opacity-70"
            >
              알림 허용
            </button>
          )}
          {notifPermission === 'granted' && (
            <span className="text-[13px] text-[var(--color-primary)] font-semibold">알림 ON</span>
          )}
        </div>

        <div className="space-y-2.5">
          {feedPred && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F0FFF4]">
              <div className="w-9 h-9 rounded-full bg-[var(--color-accent-bg)] flex items-center justify-center shrink-0">
                <span className="text-[16px]">🍼</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#212124]">다음 수유</p>
                <p className="text-[14px] text-[#6B6966]">
                  {formatTime(feedPred.predicted_ts)} · {formatTimeRemaining(feedPred.predicted_ts)}
                </p>
              </div>
              <span className="text-[13px] text-[#9E9A95] shrink-0">±{feedPred.ci_minutes}분</span>
            </div>
          )}

          {sleepPred && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F0F2FF]">
              <div className="w-9 h-9 rounded-full bg-[#E8E0F8] flex items-center justify-center shrink-0">
                <span className="text-[16px]">💤</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#212124]">다음 낮잠</p>
                <p className="text-[14px] text-[#6B6966]">
                  {formatTime(sleepPred.predicted_ts)} · {formatTimeRemaining(sleepPred.predicted_ts)}
                </p>
              </div>
              <span className="text-[13px] text-[#9E9A95] shrink-0">±{sleepPred.ci_minutes}분</span>
            </div>
          )}
        </div>

        {notifPermission === 'granted' && (
          <p className="text-[14px] text-[#9E9A95] mt-3 text-center">예상 시간 30분 전에 알림을 보내드려요</p>
        )}
      </div>
    </div>
  )
}
