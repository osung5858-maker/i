'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BellIcon, MoonIcon, XIcon } from '@/components/ui/Icons'
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

const NO_HEADER_PATHS = ['/onboarding', '/invite/', '/auth', '/settings', '/post/', '/market-item/', '/privacy', '/terms', '/landing']

const PROFILE_AVATARS = [
  '/images/illustrations/profile-default1.webm',
  '/images/illustrations/profile-default2.webm',
  '/images/illustrations/profile-default3.webm',
  '/images/illustrations/profile-default4.webm',
]

export default function GlobalHeader() {
  const pathname = usePathname()
  const [mode, setMode] = useState('')
  const [data, setData] = useState<any>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const m = localStorage.getItem('dodam_mode') || 'parenting'
    setMode(m)

    const userAvatar = localStorage.getItem('dodam_user_avatar') || ''
    const userName = localStorage.getItem('dodam_user_name') || ''

    if (m === 'parenting') {
      const name = localStorage.getItem('dodam_child_name') || '도담이'
      const birthdate = localStorage.getItem('dodam_child_birthdate')
      const photoUrl = localStorage.getItem('dodam_child_photo') || ''
      let ageMonths = 0
      if (birthdate) {
        const b = new Date(birthdate)
        const now = new Date()
        ageMonths = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
      }
      setData({ name, ageMonths, photoUrl, userAvatar, userName })
      setSelectedAvatar(photoUrl)
    } else if (m === 'pregnant') {
      const dueDate = localStorage.getItem('dodam_due_date') || ''
      let week = 0, daysLeft = 0
      if (dueDate) {
        const diff = Math.floor((new Date(dueDate).getTime() - Date.now()) / 86400000)
        week = Math.max(1, Math.min(42, 40 - Math.floor(diff / 7)))
        daysLeft = Math.max(0, diff)
      }
      const trimester = week <= 13 ? '초기' : week <= 27 ? '중기' : '후기'
      setData({ week, daysLeft, trimester, userAvatar, userName })
    } else {
      const lastPeriod = localStorage.getItem('dodam_last_period')
      const cycleLength = Number(localStorage.getItem('dodam_cycle_length')) || 28
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
  }, [pathname])

  const loadNotifications = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notification_log')
        .select('id,type,title,body,deeplink,sent_at,clicked_at')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(20)
      if (data) {
        setNotifications(data as NotificationLog[])
        setUnreadCount(data.filter(n => !n.clicked_at).length)
      }
    } catch { /* 오프라인 무시 */ }
  }, [])

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('notification_log')
        .update({ clicked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('clicked_at', null)
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, clicked_at: n.clicked_at || new Date().toISOString() })))
    } catch { /* 무시 */ }
  }, [unreadCount])

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
    const birthdate = localStorage.getItem('dodam_child_birthdate')
    if (!birthdate) return null
    return Math.floor((Date.now() - new Date(birthdate).getTime()) / 86400000)
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-[#E8E4DF]/60">
        <div className="flex items-center justify-between h-12 px-5 max-w-lg mx-auto w-full">
          {/* 좌측: 이름/정보 */}
          <div className="flex items-center gap-2.5">
            <Link href={homeHref} className="active:opacity-70">
              {mode === 'parenting' && (
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#9E9A95] leading-tight">{getGreeting()}</span>
                  <span className="text-[15px] font-bold text-[#212124] leading-tight">{data.name} 오늘 {getDaysOld() ?? 0}일째</span>
                </div>
              )}
              {mode === 'pregnant' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-bold text-[#1A1918]">D-{data.daysLeft}</span>
                  <span className="text-[13px] text-[#9E9A95]">{data.week}주 · {data.trimester}</span>
                </div>
              )}
              {mode === 'preparing' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-bold text-[#1A1918]">{data.cycleDay ? `주기 ${data.cycleDay}일` : '임신 준비'}</span>
                  {data.phase && <span className="text-[13px] text-[#9E9A95]">{data.phase}</span>}
                </div>
              )}
            </Link>
          </div>

          {/* 우측: 알림 + 카카오 사용자 사진 */}
          <div className="flex items-center gap-2">
            {mode === 'parenting' && isNight && (
              <Link href="/lullaby" className="w-8 h-8 rounded-full bg-[#1A1918] flex items-center justify-center active:opacity-80">
                <MoonIcon className="w-3.5 h-3.5 text-white" />
              </Link>
            )}
            <button
              onClick={() => { loadNotifications(); setShowNotifications(true); markAllRead() }}
              className="relative w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center active:bg-[#ECECEC]"
            >
              <BellIcon className="w-4 h-4 text-[#212124]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-[#FF4D4D] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <Link href="/settings" className="w-8 h-8 rounded-full overflow-hidden active:opacity-80 shrink-0 bg-[#F0EDE8]">
              {data?.userAvatar ? (
                <img src={data.userAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[#6B6966] text-[13px] font-bold">{data?.userName?.charAt(0) || '나'}</span>
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* 알림 내역 바텀시트 */}
      {showNotifications && (
        <div className="fixed inset-0 z-[75] bg-black/40" onClick={() => setShowNotifications(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl animate-slideUp max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 shrink-0"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
            <div className="px-5 pb-3 flex items-center justify-between shrink-0">
              <p className="text-[15px] font-bold text-[#1A1918]">알림</p>
              <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <XIcon className="w-4 h-4 text-[#6B6966]" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pb-[max(16px,env(safe-area-inset-bottom))]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#9E9A95]">
                  <BellIcon className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-[13px]">최근 알림이 없어요</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`px-5 py-3 border-b border-[#F0EDE8] last:border-0 ${!n.clicked_at ? 'bg-[#FFF8F5]' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1A1918] leading-snug">{n.title}</p>
                        {n.body && <p className="text-[12px] text-[#6B6966] mt-0.5 leading-snug">{n.body}</p>}
                      </div>
                      {!n.clicked_at && <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D] shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-[11px] text-[#C4BFB9] mt-1">
                      {new Date(n.sent_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
