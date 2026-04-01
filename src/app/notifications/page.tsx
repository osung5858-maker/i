'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BellIcon } from '@/components/ui/Icons'
import { getSecure } from '@/lib/secureStorage'
import { createClient } from '@/lib/supabase/client'

interface NotificationLog {
  id: string
  type: string
  title: string
  body: string | null
  deeplink: string | null
  sent_at: string
  clicked_at: string | null
}

interface SmartAlert {
  text: string
  href: string
  key: string
}

function computeSmartAlerts(mode: string, today: string): SmartAlert[] {
  const alerts: SmartAlert[] = []
  if (typeof window === 'undefined') return alerts

  if (mode === 'preparing') {
    const supplKeys = ['prep_folic', 'prep_vitd', 'prep_iron', 'prep_omega3']
    const prepDone: string[] = JSON.parse(localStorage.getItem(`dodam_prep_done_${today}`) || '[]')
    if (!prepDone.some(k => supplKeys.includes(k))) {
      alerts.push({ key: 'suppl', text: '오늘 엽산 아직 안 챙겼어요!', href: '/preparing' })
    }
  } else if (mode === 'pregnant') {
    const events: { type: string }[] = JSON.parse(localStorage.getItem(`dodam_preg_events_${today}`) || '[]')
    if (!events.some(e => e.type === 'preg_suppl' || e.type === 'preg_folic' || e.type === 'preg_iron')) {
      alerts.push({ key: 'suppl', text: '오늘 영양제를 아직 챙기지 않으셨어요', href: '/pregnant' })
    }
  }
  return alerts
}

async function computeCycleAlerts(today: string): Promise<SmartAlert[]> {
  const alerts: SmartAlert[] = []
  const lastPeriod = await getSecure('dodam_last_period')
  const cycleLength = Number(await getSecure('dodam_cycle_length')) || 28
  if (!lastPeriod) return alerts

  const start = new Date(lastPeriod)
  const ovDay = new Date(start.getTime() + (cycleLength - 14) * 86400000)
  const fertileStart = new Date(ovDay.getTime() - 5 * 86400000)
  const fertileEnd = new Date(ovDay.getTime() + 1 * 86400000)
  const now = new Date(today)
  const dpo = Math.floor((Date.now() - ovDay.getTime()) / 86400000)

  if (now >= fertileStart && now <= fertileEnd) {
    alerts.push({ key: 'fertile', text: '지금 가임기예요! 타이밍 잡아보세요', href: '/waiting' })
  } else if (dpo > 0 && dpo <= 14) {
    alerts.push({ key: 'tww', text: '착상 기다리는 중이에요. 무리하지 마세요', href: '/waiting' })
  }
  return alerts
}

export default function NotificationsPage() {
  const router = useRouter()
  const [mode, setMode] = useState('')
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([])
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tdn = new Date()
    const today = `${tdn.getFullYear()}-${String(tdn.getMonth()+1).padStart(2,'0')}-${String(tdn.getDate()).padStart(2,'0')}`
    const m = localStorage.getItem('dodam_mode') || 'parenting'
    setMode(m)

    const loadAll = async () => {
      // Smart alerts (sync part)
      const sync = computeSmartAlerts(m, today)

      // Cycle alerts (async, only for preparing)
      let cycle: SmartAlert[] = []
      if (m === 'preparing') {
        cycle = await computeCycleAlerts(today)
      }
      setSmartAlerts([...sync, ...cycle])

      // Push notifications
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('notification_log')
            .select('id,type,title,body,deeplink,sent_at,clicked_at')
            .eq('user_id', user.id)
            .order('sent_at', { ascending: false })
            .limit(30)
          if (data) {
            const unread = data.filter((n: NotificationLog) => !n.clicked_at)
            setNotifications(data as NotificationLog[])
            setUnreadIds(new Set(unread.map((n: NotificationLog) => n.id)))
            // 렌더 후 읽음 처리
            if (unread.length > 0) {
              setTimeout(async () => {
                await supabase
                  .from('notification_log')
                  .update({ clicked_at: new Date().toISOString() })
                  .eq('user_id', user.id)
                  .is('clicked_at', null)
              }, 1000)
            }
          }
        }
      } catch { /* 오프라인 무시 */ }

      setLoading(false)
    }
    loadAll()
  }, [])

  const hasAnything = smartAlerts.length > 0 || notifications.length > 0

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      {/* 헤더 */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-[#E8E4DF]/60">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full flex items-center justify-center text-[#1A1918] active:bg-[#F0EDE8]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-[16px] font-bold text-[#1A1918] flex-1">알림</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-12 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
          </div>
        ) : !hasAnything ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#9E9A95]">
            <BellIcon className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-[14px] font-semibold">알림이 없어요</p>
            <p className="text-[13px] mt-1">새로운 알림이 오면 여기서 확인할 수 있어요</p>
          </div>
        ) : (
          <>
            {/* 스마트 알림 */}
            {smartAlerts.length > 0 && (
              <div>
                <p className="text-[12px] font-bold text-[#9E9A95] mb-2 uppercase tracking-wide">오늘의 리마인더</p>
                <div className="space-y-2">
                  {smartAlerts.map(a => (
                    <Link key={a.key} href={a.href}
                      className="flex items-center gap-3 bg-white rounded-xl border border-[#FFDDC8] p-3.5 active:bg-[var(--color-page-bg)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />
                      <p className="text-[13px] text-[#1A1918] flex-1 font-medium">{a.text}</p>
                      <span className="text-[#9E9A95] text-[12px]">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 푸시 알림 내역 */}
            {notifications.length > 0 && (
              <div>
                <p className="text-[12px] font-bold text-[#9E9A95] mb-2 uppercase tracking-wide">알림 내역</p>
                <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
                  {notifications.map((n, i) => {
                    const isUnread = unreadIds.has(n.id)
                    return (
                      <div key={n.id} className={`px-4 py-3.5 ${isUnread ? 'bg-[#FDFBF9]' : ''} ${i < notifications.length - 1 ? 'border-b border-[#F0EDE8]' : ''}`}>
                        <div className="flex items-start gap-2.5">
                          <div className="mt-1.5 shrink-0">
                            {isUnread
                              ? <span className="block w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                              : <span className="block w-2 h-2 rounded-full bg-transparent" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] leading-snug ${isUnread ? 'font-semibold text-[#1A1918]' : 'font-medium text-[#6B6966]'}`}>{n.title}</p>
                            {n.body && <p className="text-[12px] text-[#9E9A95] mt-0.5 leading-snug">{n.body}</p>}
                            <p className="text-[11px] text-[#C4BFB9] mt-1">
                              {new Date(n.sent_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
