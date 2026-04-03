'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { CareEvent } from '@/types'
import { predictNextEvent } from '@/lib/ai/prediction-engine'
import { BellIcon, BottleIcon, MoonIcon } from '@/components/ui/Icons'

interface Props {
  events: CareEvent[]
  childName?: string
}

type AlertOffset = 15 | 30 | 60

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

function getProgressPct(lastTs: string, predictedTs: string): number {
  const last = new Date(lastTs).getTime()
  const predicted = new Date(predictedTs).getTime()
  const now = Date.now()
  if (predicted <= last) return 100
  const total = predicted - last
  const elapsed = now - last
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

const OFFSET_OPTIONS: { value: AlertOffset; label: string }[] = [
  { value: 15, label: '15분 전' },
  { value: 30, label: '30분 전' },
  { value: 60, label: '1시간 전' },
]

export default function SmartReminder({ events, childName }: Props) {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [alertOffset, setAlertOffset] = useState<AlertOffset>(30)
  const [showSettings, setShowSettings] = useState(false)
  const scheduledRef = useRef<Set<string>>(new Set())
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // DB에서 알림 오프셋 로드
  useEffect(() => {
    import('@/lib/supabase/userProfile').then(({ getProfile }) => {
      getProfile().then(p => {
        const offset = p?.user_settings?.reminder_offset
        if (offset && [15, 30, 60].includes(offset)) setAlertOffset(offset as AlertOffset)
      })
    })
  }, [])

  const feedPred = useMemo(() => predictNextEvent(events, 'feed'), [events])
  const sleepPred = useMemo(() => predictNextEvent(events, 'sleep'), [events])

  // 마지막 이벤트 시간
  const lastFeed = useMemo(() => {
    const feeds = events.filter(e => e.type === 'feed').sort((a, b) => new Date(b.start_ts).getTime() - new Date(a.start_ts).getTime())
    return feeds[0]?.start_ts
  }, [events])
  const lastSleep = useMemo(() => {
    const sleeps = events.filter(e => e.type === 'sleep').sort((a, b) => new Date(b.start_ts).getTime() - new Date(a.start_ts).getTime())
    return sleeps[0]?.start_ts
  }, [events])

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

  const changeOffset = (offset: AlertOffset) => {
    setAlertOffset(offset)
    import('@/lib/supabase/userProfile').then(({ upsertProfile }) => {
      upsertProfile({ user_settings: { reminder_offset: offset } })
    })
    // 기존 알림 리셋
    scheduledRef.current.clear()
  }

  // Schedule browser notifications
  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    if (notifPermission !== 'granted') return

    const name = childName || '아이'
    const predictions = [
      feedPred ? { ...feedPred, label: '수유', msg: `${name} ${alertOffset}분 후 수유 시간이에요` } : null,
      sleepPred ? { ...sleepPred, label: '낮잠', msg: `${name} ${alertOffset}분 후 낮잠 시간이에요` } : null,
    ].filter(Boolean) as { predicted_ts: string; label: string; msg: string; target: string }[]

    predictions.forEach((pred) => {
      const key = `${pred.target}_${pred.predicted_ts}_${alertOffset}`
      if (scheduledRef.current.has(key)) return

      const alertTime = new Date(pred.predicted_ts).getTime() - alertOffset * 60 * 1000
      const delay = alertTime - Date.now()

      if (delay > 0 && delay < 4 * 60 * 60 * 1000) {
        scheduledRef.current.add(key)
        const timeout = setTimeout(() => {
          try {
            new Notification(`도담 ${pred.label} 알림`, {
              body: `${pred.msg} (예상 ${formatTime(pred.predicted_ts)})`,
              icon: '/icon-192x192.png',
              tag: key,
              requireInteraction: true,
            })
            // 진동
            if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          } catch { /* ignore */ }
        }, delay)
        timeoutsRef.current.push(timeout)

        // 정시 알림도 추가
        const exactDelay = new Date(pred.predicted_ts).getTime() - Date.now()
        if (exactDelay > 0 && exactDelay < 4 * 60 * 60 * 1000) {
          const exactTimeout = setTimeout(() => {
            try {
              new Notification(`도담 ${pred.label} 시간!`, {
                body: `지금이 ${pred.label} 예상 시간이에요.`,
                icon: '/icon-192x192.png',
                tag: `exact_${key}`,
              })
            } catch { /* ignore */ }
          }, exactDelay)
          timeoutsRef.current.push(exactTimeout)
        }
      }
    })

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
  }, [feedPred, sleepPred, notifPermission, alertOffset, childName])

  const hasPredictions = feedPred || sleepPred
  if (!hasPredictions) return null

  return (
    <div className="mx-4 mb-3">
      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(26,25,24,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <BellIcon className="w-4 h-4" />
            <span className="text-body font-bold text-primary">스마트 리마인더</span>
          </div>
          <div className="flex items-center gap-2">
            {notifPermission === 'default' && (
              <button onClick={requestPermission} className="text-caption font-semibold text-[#5B6DFF] active:opacity-70">
                알림 허용
              </button>
            )}
            {notifPermission === 'granted' && (
              <button onClick={() => setShowSettings(v => !v)} className="text-caption text-[var(--color-primary)] font-semibold">
                {showSettings ? '닫기' : `${alertOffset}분 전 알림`}
              </button>
            )}
          </div>
        </div>

        {/* 알림 오프셋 설정 */}
        {showSettings && notifPermission === 'granted' && (
          <div className="flex gap-1.5 mb-3 p-2 rounded-xl bg-[var(--color-page-bg)]">
            {OFFSET_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => changeOffset(opt.value)}
                className={`flex-1 py-1.5 text-caption font-semibold rounded-lg transition-colors ${
                  alertOffset === opt.value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          {feedPred && (
            <div className="p-3 rounded-xl bg-[#F0FFF4]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-accent-bg)] flex items-center justify-center shrink-0">
                  <BottleIcon className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-primary">다음 수유</p>
                  <p className="text-body text-secondary">
                    {formatTime(feedPred.predicted_ts)} · {formatTimeRemaining(feedPred.predicted_ts)}
                  </p>
                </div>
                <span className="text-caption text-tertiary shrink-0">±{feedPred.ci_minutes}분</span>
              </div>
              {/* 프로그레스 바 */}
              {lastFeed && (
                <div className="mt-2.5 w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-1000"
                    style={{ width: `${getProgressPct(lastFeed, feedPred.predicted_ts)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {sleepPred && (
            <div className="p-3 rounded-xl bg-[#F0F2FF]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E8E0F8] flex items-center justify-center shrink-0">
                  <MoonIcon className="w-5 h-5 text-[#5B6DFF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-primary">다음 낮잠</p>
                  <p className="text-body text-secondary">
                    {formatTime(sleepPred.predicted_ts)} · {formatTimeRemaining(sleepPred.predicted_ts)}
                  </p>
                </div>
                <span className="text-caption text-tertiary shrink-0">±{sleepPred.ci_minutes}분</span>
              </div>
              {lastSleep && (
                <div className="mt-2.5 w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5B6DFF] rounded-full transition-all duration-1000"
                    style={{ width: `${getProgressPct(lastSleep, sleepPred.predicted_ts)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {notifPermission === 'granted' && (
          <p className="text-label text-tertiary mt-2.5 text-center">예상 시간 {alertOffset}분 전 + 정시에 알림을 보내드려요</p>
        )}
        {notifPermission === 'unsupported' && (
          <p className="text-label text-tertiary mt-2.5 text-center">이 브라우저는 알림을 지원하지 않아요</p>
        )}
      </div>
    </div>
  )
}
