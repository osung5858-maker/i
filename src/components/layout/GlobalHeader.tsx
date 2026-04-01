'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { BellIcon, MoonIcon, XIcon } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'
import { getSecure } from '@/lib/secureStorage'

interface NotificationLog {
  id: string
  type: string
  title: string
  body: string | null
  deeplink: string | null
  sent_at: string
  clicked_at: string | null
}

const NO_HEADER_PATHS = ['/onboarding', '/invite/', '/auth', '/post/', '/market-item/', '/privacy', '/terms', '/landing', '/records/', '/prep-records/', '/preg-records/', '/notifications', '/growth/', '/map/']

const PROFILE_AVATARS = [
  '/images/illustrations/profile-default1.webm',
  '/images/illustrations/profile-default2.webm',
  '/images/illustrations/profile-default3.webm',
  '/images/illustrations/profile-default4.webm',
]

function GlobalHeaderComponent() {
  const pathname = usePathname()
  const [mode, setMode] = useState('')
  const [data, setData] = useState<any>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [smartAlertCount, setSmartAlertCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const m = localStorage.getItem('dodam_mode') || 'parenting'
      setMode(m)

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

      const userAvatar = localStorage.getItem('dodam_user_avatar') || ''
      const userName = localStorage.getItem('dodam_user_name') || ''

      if (m === 'parenting') {
        const name = await getSecure('dodam_child_name') || '도담이'
        const birthdate = await getSecure('dodam_child_birthdate')
        const photoUrl = localStorage.getItem('dodam_child_photo') || ''
        let ageMonths = 0
        if (birthdate) {
          const b = new Date(birthdate)
          const now = new Date()
          ageMonths = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
        }
        setData({ name, ageMonths, birthdate, photoUrl, userAvatar, userName })
        setSelectedAvatar(photoUrl)
      } else if (m === 'pregnant') {
        const dueDate = await getSecure('dodam_due_date') || ''
        let week = 0, daysLeft = 0
        if (dueDate) {
          const diff = Math.floor((new Date(dueDate).getTime() - Date.now()) / 86400000)
          week = Math.max(1, Math.min(42, 40 - Math.floor(diff / 7)))
          daysLeft = Math.max(0, diff)
        }
        const trimester = week <= 13 ? '초기' : week <= 27 ? '중기' : '후기'
        setData({ week, daysLeft, trimester, userAvatar, userName })
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
        setData({ cycleDay, phase, userAvatar, userName })
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

  const handleAvatarSave = useCallback(async (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl)
    localStorage.setItem('dodam_child_photo', avatarUrl)
    setData((prev: any) => prev ? { ...prev, photoUrl: avatarUrl } : prev)
    setShowAvatarPicker(false)

    // DB에도 저장
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: children } = await supabase.from('children').select('id').eq('user_id', user.id).order('created_at').limit(1)
      if (children && children.length > 0) {
        await supabase.from('children').update({ photo_url: avatarUrl }).eq('id', children[0].id)
      }
    } catch { /* 오프라인 시 localStorage만 반영 */ }
  }, [])

  if (!pathname || !data || !mode) return null
  if (NO_HEADER_PATHS.some(p => pathname.startsWith(p))) return null

  const homeHref = mode === 'parenting' ? '/' : mode === 'pregnant' ? '/pregnant' : '/preparing'
  const isNight = new Date().getHours() >= 20 || new Date().getHours() < 6

  // 시간대별 인사
  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 6) return '새벽이에요, 힘내세요'
    if (h < 12) return '좋은 아침이에요'
    if (h < 18) return '오후도 도담하게'
    return '오늘도 수고했어요'
  }
  // 아이 일수 계산
  const getDaysOld = () => {
    if (!data?.birthdate) return null
    return Math.floor((Date.now() - new Date(data.birthdate).getTime()) / 86400000)
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto w-full" style={{ height: '72px', padding: '0 var(--spacing-5)' }}>
          {/* 좌측: 유저 프로필 + 텍스트 */}
          <div className="flex items-center min-w-0" style={{ gap: 'var(--spacing-3)' }}>
            {/* 유저 프로필 아바타 */}
            <Link
              href="/settings"
              className="w-11 h-11 rounded-full overflow-hidden relative shrink-0 active:opacity-80"
              style={{ backgroundColor: 'var(--surface-tertiary)' }}
              aria-label="설정으로 이동"
            >
              {data?.userAvatar ? (
                <Image src={data.userAvatar} alt="" fill className="object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #F2C4A0 0%, #D08068 100%)' }}>
                  <span className="text-white font-bold" style={{ fontSize: 'var(--text-lg)' }}>{data?.userName?.charAt(0) || '나'}</span>
                </div>
              )}
            </Link>

            {/* 텍스트 */}
            <Link href={homeHref} className="flex flex-col min-w-0 active:opacity-70" style={{ gap: '2px' }}>
              {mode === 'parenting' && (
                <>
                  <span className="text-caption" style={{ lineHeight: 'var(--leading-tight)' }}>{getGreeting()}</span>
                  <span className="text-subtitle" style={{ lineHeight: 'var(--leading-tight)' }}>{data.name} · {getDaysOld() ?? 0}일</span>
                </>
              )}
              {mode === 'pregnant' && (
                <>
                  <span className="text-caption" style={{ lineHeight: 'var(--leading-tight)' }}>{data.trimester} · D-{data.daysLeft}</span>
                  <span className="text-subtitle" style={{ lineHeight: 'var(--leading-tight)' }}>{data.week}주차</span>
                </>
              )}
              {mode === 'preparing' && (
                <>
                  <span className="text-[12px] text-[#9E9A95] leading-tight">{data.phase || '임신 준비'}</span>
                  <span className="text-[15px] font-bold text-[#1A1918] leading-tight">{data.cycleDay ? `주기 ${data.cycleDay}일째` : '임신 준비 중'}</span>
                </>
              )}
            </Link>
          </div>

          {/* 우측: 야간 + 알림 */}
          <div className="flex items-center gap-2 shrink-0">
            {mode === 'parenting' && isNight && (
              <Link href="/lullaby" className="w-8 h-8 rounded-full bg-[#1A1918] flex items-center justify-center active:opacity-80">
                <MoonIcon className="w-3.5 h-3.5 text-white" />
              </Link>
            )}
            <Link
              href="/notifications"
              className="relative w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center active:bg-[#ECECEC]"
            >
              <BellIcon className="w-4 h-4 text-[#212124]" />
              {(unreadCount + smartAlertCount) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FF4D4D] rounded-full border-2 border-white" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* 아바타 선택 바텀시트 */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setShowAvatarPicker(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>

            <div className="px-5 pb-2 flex items-center justify-between">
              <p className="text-[15px] font-bold text-[#1A1918]">프로필 사진 변경</p>
              <button onClick={() => setShowAvatarPicker(false)} className="w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <XIcon className="w-4 h-4 text-[#6B6966]" />
              </button>
            </div>

            {/* 선택된 아바타 크게 */}
            <div className="flex justify-center py-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[#F0EDE8] ring-[3px] ring-[var(--color-primary)]">
                <video src={selectedAvatar || PROFILE_AVATARS[0]} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              </div>
            </div>

            {/* 아바타 4종 */}
            <div className="flex justify-center gap-4 pb-4">
              {PROFILE_AVATARS.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAvatar(url)}
                  className={`w-16 h-16 rounded-2xl overflow-hidden transition-all ${
                    selectedAvatar === url
                      ? 'ring-[3px] ring-[var(--color-primary)] ring-offset-2 scale-105'
                      : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  <video src={url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* 저장 버튼 */}
            <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
              <button
                onClick={() => handleAvatarSave(selectedAvatar || PROFILE_AVATARS[0])}
                className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold active:opacity-80"
              >
                이 사진으로 변경하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default memo(GlobalHeaderComponent)
