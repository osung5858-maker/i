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

// 2단계 기록 카테고리
const RECORD_CATEGORIES = [
  { key: 'eat', emoji: '🍼', label: '먹기', color: '#3D8A5A',
    items: [
      { type: 'breast_left', label: '모유(왼)', emoji: '🤱' },
      { type: 'breast_right', label: '모유(오)', emoji: '🤱' },
      { type: 'breast_both', label: '모유(양쪽)', emoji: '🤱' },
      { type: 'feed', label: '분유', emoji: '🍼', hasInput: 'ml' },
      { type: 'babyfood', label: '이유식', emoji: '🥣' },
      { type: 'snack', label: '간식', emoji: '🍪' },
      { type: 'water', label: '물', emoji: '💧' },
      { type: 'pump', label: '유축', emoji: '🫙', hasInput: 'ml' },
    ]
  },
  { key: 'sleep', emoji: '💤', label: '잠', color: '#6366F1',
    items: [
      { type: 'sleep', label: '수면 시작/종료', emoji: '💤' },
    ]
  },
  { key: 'diaper', emoji: '🩲', label: '기저귀', color: '#D89575',
    items: [
      { type: 'pee', label: '소변', emoji: '💧' },
      { type: 'poop_normal', label: '대변 (정상)', emoji: '💩' },
      { type: 'poop_soft', label: '대변 (묽음)', emoji: '💩' },
      { type: 'poop_hard', label: '대변 (단단)', emoji: '💩' },
      { type: 'pee_poop', label: '소변+대변', emoji: '🩲' },
    ]
  },
  { key: 'health', emoji: '🏥', label: '건강', color: '#D08068',
    items: [
      { type: 'temp', label: '체온', emoji: '🌡️', hasInput: '°C' },
      { type: 'memo', label: '투약', emoji: '💊' },
      { type: 'hospital', label: '병원 방문', emoji: '🏥' },
    ]
  },
  { key: 'activity', emoji: '📝', label: '활동', color: '#4A90D9',
    items: [
      { type: 'bath', label: '목욕', emoji: '🛁' },
      { type: 'walk', label: '산책', emoji: '🚶' },
      { type: 'note', label: '메모', emoji: '📝' },
    ]
  },
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

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

  const handleQuickRecord = useCallback((type: string, extra?: Record<string, unknown>) => {
    if (navigator.vibrate) navigator.vibrate(30)
    window.dispatchEvent(new CustomEvent('dodam-record', { detail: { type, ...extra } }))
    setFabOpen(false)
    setSelectedCategory(null)
    setInputValue('')
  }, [])

  if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/invite') || pathname?.startsWith('/post/') || pathname?.startsWith('/market-item/')) {
    return null
  }

  return (
    <>
      {/* 기록 바텀시트 */}
      {fabOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => { setFabOpen(false); setSelectedCategory(null) }}>
          <div className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl animate-slideUp"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>

            {!selectedCategory ? (
              /* 1단계: 카테고리 선택 */
              <div className="px-5 pb-6">
                <p className="text-[14px] font-bold text-[#1A1918] mb-3 text-center">기록하기</p>
                <div className="flex justify-around">
                  {RECORD_CATEGORIES.map(cat => (
                    <button key={cat.key} onClick={() => setSelectedCategory(cat.key)}
                      className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: cat.color + '15' }}>
                        <span className="text-2xl">{cat.emoji}</span>
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* 2단계: 세부 항목 */
              <div className="px-5 pb-6">
                <div className="flex items-center mb-3">
                  <button onClick={() => setSelectedCategory(null)} className="text-[#868B94] text-sm mr-2">←</button>
                  <p className="text-[14px] font-bold text-[#1A1918]">
                    {RECORD_CATEGORIES.find(c => c.key === selectedCategory)?.label}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {RECORD_CATEGORIES.find(c => c.key === selectedCategory)?.items.map(item => (
                    <button key={item.type}
                      onClick={() => {
                        if (item.hasInput) {
                          // 입력이 필요한 항목은 프롬프트
                          const val = prompt(`${item.label} ${item.hasInput === 'ml' ? '(ml)' : '(°C)'}`)
                          if (val) {
                            const extra = item.hasInput === 'ml' ? { amount_ml: Number(val) } : { tags: { celsius: Number(val) } }
                            handleQuickRecord(item.type === 'pump' ? 'feed' : item.type, extra)
                          }
                        } else {
                          // 즉시 기록
                          const extra: Record<string, unknown> = {}
                          if (item.type.startsWith('poop_')) extra.tags = { status: item.type.replace('poop_', '') }
                          if (item.type === 'pee_poop') extra.tags = { status: 'normal' }
                          if (item.type.startsWith('breast_')) extra.tags = { side: item.type.replace('breast_', '') }
                          const baseType = item.type.startsWith('poop_') || item.type === 'pee_poop' ? 'poop'
                            : item.type.startsWith('breast_') ? 'feed'
                            : item.type
                          handleQuickRecord(baseType, extra)
                        }
                      }}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-[#F5F4F1] active:bg-[#ECECEC] active:scale-95 transition-all"
                    >
                      <span className="text-xl">{item.emoji}</span>
                      <span className="text-[10px] font-medium text-[#1A1918]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
