'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SunIcon, HeartIcon, ShieldIcon, UsersIcon,
  PlusIcon, XIcon,
  BottleIcon, MoonIcon, DropletIcon, ThermometerIcon, PillIcon,
} from '@/components/ui/Icons'

interface Tab {
  href: string
  label: string
  icon: React.FC<{ className?: string }>
}

const TABS_BY_MODE: Record<string, Tab[]> = {
  parenting: [
    { href: '/', icon: SunIcon, label: '오늘' },
    { href: '/memory', icon: HeartIcon, label: '추억' },
    { href: '/town', icon: ShieldIcon, label: '동네' },
    { href: '/us', icon: UsersIcon, label: '우리' },
  ],
  pregnant: [
    { href: '/pregnant', icon: SunIcon, label: '오늘' },
    { href: '/waiting', icon: HeartIcon, label: '기다림' },
    { href: '/town', icon: ShieldIcon, label: '동네' },
    { href: '/us', icon: UsersIcon, label: '우리' },
  ],
  preparing: [
    { href: '/preparing', icon: SunIcon, label: '오늘' },
    { href: '/waiting', icon: HeartIcon, label: '기다림' },
    { href: '/town', icon: ShieldIcon, label: '동네' },
    { href: '/us', icon: UsersIcon, label: '우리' },
  ],
}

const QUICK_BUTTONS = [
  { type: 'feed', icon: BottleIcon, label: '수유', bg: '#C8F0D8', iconClass: 'text-[#3D8A5A]' },
  { type: 'sleep', icon: MoonIcon, label: '수면', bg: '#E8E0F8', iconClass: 'text-[#6366F1]' },
  { type: 'poop', icon: DropletIcon, label: '기저귀', bg: '#FEF0E8', iconClass: 'text-[#D89575]' },
  { type: 'temp', icon: ThermometerIcon, label: '체온', bg: '#FDE8E8', iconClass: 'text-[#D08068]' },
  { type: 'memo', icon: PillIcon, label: '투약', bg: '#E0F0F8', iconClass: 'text-[#4A90D9]' },
]

// 반원형 배치 좌표 (중앙 FAB 기준, px)
const ARC_POSITIONS = [
  { x: -120, y: -50 },   // 수유 (좌측 하단)
  { x: -76, y: -115 },   // 수면 (좌측 상단)
  { x: 0, y: -140 },     // 기저귀 (정중앙 상단)
  { x: 76, y: -115 },    // 체온 (우측 상단)
  { x: 120, y: -50 },    // 투약 (우측 하단)
]

export default function BottomNav() {
  const pathname = usePathname()
  const [fabOpen, setFabOpen] = useState(false)
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_mode') || 'parenting'
    return 'parenting'
  })

  // pathname 기반 모드 자동 감지 (localStorage보다 우선)
  useEffect(() => {
    if (pathname?.startsWith('/preparing') || pathname?.startsWith('/waiting')) {
      setMode('preparing')
    } else if (pathname?.startsWith('/pregnant')) {
      setMode('pregnant')
    } else {
      const saved = localStorage.getItem('dodam_mode')
      if (saved) setMode(saved)
    }
  }, [pathname])

  const tabs = TABS_BY_MODE[mode] || TABS_BY_MODE.parenting

  // 다른 페이지로 이동하면 FAB 닫기
  useEffect(() => { setFabOpen(false) }, [pathname])

  // ESC로 닫기
  useEffect(() => {
    if (!fabOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFabOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fabOpen])

  const handleQuickRecord = useCallback((type: string) => {
    if (navigator.vibrate) navigator.vibrate(30)
    window.dispatchEvent(new CustomEvent('dodam-record', { detail: { type } }))
    setFabOpen(false)
  }, [])

  if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/invite') || pathname?.startsWith('/post/') || pathname?.startsWith('/market-item/')) {
    return null
  }

  return (
    <>
      {/* 딤 오버레이 */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* 반원형 퀵버튼 */}
      {fabOpen && (
        <div className="fixed z-[70] bottom-[60px] left-1/2" style={{ maxWidth: 430 }}>
          <div className="relative" style={{ width: 0, height: 0 }}>
            {QUICK_BUTTONS.map((btn, i) => {
              const pos = ARC_POSITIONS[i]
              const Icon = btn.icon
              return (
                <div
                  key={btn.type}
                  className="absolute flex flex-col items-center gap-1.5"
                  style={{
                    left: pos.x - 28,
                    top: pos.y - 28,
                    animation: `fabItemPop 0.25s ${i * 0.04}s both cubic-bezier(0.34, 1.56, 0.64, 1)`,
                  }}
                >
                  <button
                    onClick={() => handleQuickRecord(btn.type)}
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                    style={{ backgroundColor: btn.bg }}
                  >
                    <Icon className={`w-6 h-6 ${btn.iconClass}`} />
                  </button>
                  <span className="text-[11px] font-semibold text-white whitespace-nowrap drop-shadow-sm">
                    {btn.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* BNB 바 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[65] bg-white border-t border-[#f0f0f0] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {mode === 'preparing' || mode === 'pregnant' ? (
            /* preparing/pregnant 모드: FAB 없이 4탭 균등 */
            tabs.map((tab) => (
              <NavTab key={tab.href} tab={tab} pathname={pathname} />
            ))
          ) : (
            <>
              {/* 좌측 2탭 */}
              {tabs.slice(0, 2).map((tab) => (
                <NavTab key={tab.href} tab={tab} pathname={pathname} />
              ))}

              {/* 중앙 FAB */}
              <button
                onClick={() => setFabOpen((v) => !v)}
                className={`flex flex-col items-center justify-center -mt-5 transition-transform duration-200 ${fabOpen ? 'scale-95' : ''}`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(61,138,90,0.35)] active:scale-90 transition-all duration-200 ${
                    fabOpen ? 'bg-[#212124]' : 'bg-[#3D8A5A]'
                  }`}
                >
                  {fabOpen ? (
                    <XIcon className="w-6 h-6 text-white" />
                  ) : (
                    <PlusIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 font-semibold ${fabOpen ? 'text-[#212124]' : 'text-[#3D8A5A]'}`}>
                  기록
                </span>
              </button>

              {/* 우측 2탭 */}
              {tabs.slice(2).map((tab) => (
                <NavTab key={tab.href} tab={tab} pathname={pathname} />
              ))}
            </>
          )}
        </div>
      </nav>

      {/* 애니메이션 keyframes */}
      <style jsx global>{`
        @keyframes fabItemPop {
          0% { opacity: 0; transform: scale(0.3) translateY(30px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}

function NavTab({ tab, pathname }: { tab: Tab; pathname: string | null }) {
  const isActive = tab.href === '/'
    ? pathname === '/'
    : pathname?.startsWith(tab.href)
  const Icon = tab.icon

  return (
    <Link
      href={tab.href}
      className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-1"
    >
      <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-[#212124]' : 'text-[#AEB1B9]'}`} />
      <span className={`text-[10px] transition-colors ${isActive ? 'text-[#212124] font-semibold' : 'text-[#AEB1B9]'}`}>
        {tab.label}
      </span>
    </Link>
  )
}
