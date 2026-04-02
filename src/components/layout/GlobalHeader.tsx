'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { BellIcon, MoonIcon } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'
import { getSecure } from '@/lib/secureStorage'

const NO_HEADER_PATHS = ['/onboarding', '/invite/', '/auth', '/landing', '/settings']

function GlobalHeaderComponent() {
  const pathname = usePathname()
  const [mode, setMode] = useState('')
  const [data, setData] = useState<any>(null)
  const [userPhotoUrl, setUserPhotoUrl] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [smartAlertCount, setSmartAlertCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const m = localStorage.getItem('dodam_mode') || 'parenting'
      setMode(m)

      // OAuth 프로필 사진
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const photo = user.user_metadata?.avatar_url || user.user_metadata?.picture || ''
          setUserPhotoUrl(photo)
        }
      } catch { /* 오프라인 무시 */ }

      // 스마트 알림 카운트
      const tdn = new Date()
      const todayStr = `${tdn.getFullYear()}-${String(tdn.getMonth()+1).padStart(2,'0')}-${String(tdn.getDate()).padStart(2,'0')}`
      let sa = 0
      if (m === 'preparing') {
        const supplKeys = ['prep_folic', 'prep_vitd', 'prep_iron', 'prep_omega3']
        const prepDone: string[] = JSON.parse(localStorage.getItem(`dodam_prep_done_${todayStr}`) || '[]')
        if (!prepDone.some(k => supplKeys.includes(k))) sa++
        const lastPeriod = await getSecure('dodam_last_period')
        const cycleLength = Number(await getSecure('dodam_cycle_length')) || 28
        if (lastPeriod) {
          const start = new Date(lastPeriod)
          const ovDay = new Date(start.getTime() + (cycleLength - 14) * 86400000)
          const fertileStart = new Date(ovDay.getTime() - 5 * 86400000)
          const fertileEnd = new Date(ovDay.getTime() + 86400000)
          const dpo = Math.floor((Date.now() - ovDay.getTime()) / 86400000)
          const now = new Date()
          if (now >= fertileStart && now <= fertileEnd) sa++
          else if (dpo > 0 && dpo <= 14) sa++
        }
      } else if (m === 'pregnant') {
        const events: { type: string }[] = JSON.parse(localStorage.getItem(`dodam_preg_events_${todayStr}`) || '[]')
        if (!events.some(e => e.type === 'preg_suppl' || e.type === 'preg_folic' || e.type === 'preg_iron')) sa++
      }
      setSmartAlertCount(sa)

      const userName = localStorage.getItem('dodam_user_name') || ''

      if (m === 'parenting') {
        const name = await getSecure('dodam_child_name') || '도담이'
        const birthdate = await getSecure('dodam_child_birthdate')
        let ageMonths = 0
        if (birthdate) {
          const b = new Date(birthdate)
          const now = new Date()
          ageMonths = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
        }
        setData({ name, ageMonths, birthdate, userName })
      } else if (m === 'pregnant') {
        const dueDate = await getSecure('dodam_due_date') || ''
        let week = 0, daysLeft = 0
        if (dueDate) {
          const diff = Math.floor((new Date(dueDate).getTime() - Date.now()) / 86400000)
          week = Math.max(1, Math.min(42, 40 - Math.floor(diff / 7)))
          daysLeft = Math.max(0, diff)
        }
        const trimester = week <= 13 ? '초기' : week <= 27 ? '중기' : '후기'
        setData({ week, daysLeft, trimester, userName })
      } else {
        const lastPeriod = await getSecure('dodam_last_period')
        const cycleLength = Number(await getSecure('dodam_cycle_length')) || 28
        let cycleDay = 0
        let phase = ''
        if (lastPeriod) {
          const daysSince = Math.floor((Date.now() - new Date(lastPeriod).getTime()) / 86400000)
          cycleDay = (daysSince % cycleLength) + 1
          const ovDay = cycleLength - 14
          if (cycleDay <= 5) phase = '생리기'
          else if (cycleDay <= ovDay - 5) phase = '난포기'
          else if (cycleDay <= ovDay + 1) phase = '가임기'
          else if (cycleDay <= ovDay + 3) phase = '배란기'
          else phase = '황체기'
        }
        setData({ cycleDay, phase, userName })
      }
    }
    load()
    loadNotifications()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadNotifications = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notification_log')
        .select('id,clicked_at')
        .eq('user_id', user.id)
        .is('clicked_at', null)
        .limit(20)
      if (data) setUnreadCount(data.length)
    } catch { /* 오프라인 무시 */ }
  }, [])

  if (!pathname || !data || !mode) return null
  if (NO_HEADER_PATHS.some(p => pathname.startsWith(p))) return null

  const homeHref = mode === 'parenting' ? '/' : mode === 'pregnant' ? '/pregnant' : '/preparing'
  const isNight = new Date().getHours() >= 20 || new Date().getHours() < 6

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 6) return '새벽이에요, 힘내세요'
    if (h < 12) return '좋은 아침이에요'
    if (h < 18) return '오후도 도담하게'
    return '오늘도 수고했어요'
  }

  const getDaysOld = () => {
    if (!data?.birthdate) return null
    return Math.floor((Date.now() - new Date(data.birthdate).getTime()) / 86400000)
  }

  return (
    <header className="sticky top-0 z-40 pointer-events-none" style={{ paddingTop: '12px' }}>
      <div className="max-w-lg mx-auto w-full px-4 pointer-events-auto">
        <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)]" style={{
          height: '72px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* 좌측: 프로필 이미지 + 텍스트 */}
          <div className="flex items-center min-w-0" style={{ gap: '12px' }}>
            {/* OAuth 프로필 사진 */}
            <Link href="/settings" className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-[#F0EDE8] active:opacity-80">
              {userPhotoUrl ? (
                <Image
                  src={userPhotoUrl}
                  alt="프로필"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[18px]">🌸</div>
              )}
            </Link>

            {/* 텍스트 */}
            <Link href={homeHref} className="flex flex-col min-w-0 active:opacity-70" style={{ gap: '2px' }}>
              {mode === 'parenting' && (
                <>
                  <span className="text-[12px] font-medium text-[#6D6C6A] leading-tight">{getGreeting()}</span>
                  <span className="text-[15px] font-semibold text-[#1A1918] leading-tight">{data.name} · {getDaysOld() ?? 0}일</span>
                </>
              )}
              {mode === 'pregnant' && (
                <>
                  <span className="text-[12px] font-medium text-[#6D6C6A] leading-tight">{data.trimester} · D-{data.daysLeft}</span>
                  <span className="text-[15px] font-semibold text-[#1A1918] leading-tight">{data.week}주차</span>
                </>
              )}
              {mode === 'preparing' && (
                <>
                  <span className="text-[12px] font-medium text-[#6D6C6A] leading-tight">{data.phase || '임신 준비'}</span>
                  <span className="text-[15px] font-semibold text-[#1A1918] leading-tight">{data.cycleDay ? `주기 ${data.cycleDay}일째` : '임신 준비 중'}</span>
                </>
              )}
            </Link>
          </div>

          {/* 우측: 야간 + 알림 */}
          <div className="flex items-center gap-2 shrink-0">
            {mode === 'parenting' && isNight && (
              <Link href="/lullaby" className="w-9 h-9 rounded-full bg-[#1A1918] flex items-center justify-center active:opacity-80 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                <MoonIcon className="w-4 h-4 text-white" />
              </Link>
            )}
            <Link
              href="/notifications"
              className="relative w-9 h-9 rounded-full bg-[#F5F4F1] flex items-center justify-center active:bg-[#ECECEC]"
            >
              <BellIcon className="w-[18px] h-[18px] text-primary" />
              {(unreadCount + smartAlertCount) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-[9px] h-[9px] bg-[#D08068] rounded-full border-2 border-white" />
              )}
            </Link>
          </div>
        </div>
      </div>
      <div style={{ height: '12px' }} />
    </header>
  )
}

export default memo(GlobalHeaderComponent)
