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
interface RecordItem {
  type: string; label: string; emoji: string
  hasInput?: string // legacy
  step3?: { label: string; value: number | string; unit?: string }[]
  tags?: Record<string, string>
  baseType?: string
}
interface RecordCategory {
  key: string; emoji: string; label: string; color: string; items: RecordItem[]
}

const RECORD_CATEGORIES: RecordCategory[] = [
  { key: 'eat', emoji: '🍼', label: '먹기', color: '#3D8A5A',
    items: [
      { type: 'breast_left', label: '모유(왼)', emoji: '🤱', baseType: 'feed', tags: { side: 'left' },
        step3: [{ label: '5분', value: 5, unit: '분' }, { label: '10분', value: 10, unit: '분' }, { label: '15분', value: 15, unit: '분' }, { label: '20분', value: 20, unit: '분' }, { label: '30분', value: 30, unit: '분' }] },
      { type: 'breast_right', label: '모유(오)', emoji: '🤱', baseType: 'feed', tags: { side: 'right' },
        step3: [{ label: '5분', value: 5, unit: '분' }, { label: '10분', value: 10, unit: '분' }, { label: '15분', value: 15, unit: '분' }, { label: '20분', value: 20, unit: '분' }, { label: '30분', value: 30, unit: '분' }] },
      { type: 'feed', label: '분유', emoji: '🍼',
        step3: [{ label: '60', value: 60, unit: 'ml' }, { label: '90', value: 90, unit: 'ml' }, { label: '120', value: 120, unit: 'ml' }, { label: '150', value: 150, unit: 'ml' }, { label: '180', value: 180, unit: 'ml' }] },
      { type: 'babyfood', label: '이유식', emoji: '🥣',
        step3: [{ label: '쌀미음', value: 'rice' }, { label: '야채죽', value: 'veggie' }, { label: '고기죽', value: 'meat' }, { label: '과일', value: 'fruit' }, { label: '기타', value: 'etc' }] },
      { type: 'pump', label: '유축', emoji: '🫙', baseType: 'feed',
        step3: [{ label: '30', value: 30, unit: 'ml' }, { label: '60', value: 60, unit: 'ml' }, { label: '90', value: 90, unit: 'ml' }, { label: '120', value: 120, unit: 'ml' }, { label: '150', value: 150, unit: 'ml' }] },
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
      { type: 'poop_normal', label: '정상', emoji: '💩', baseType: 'poop', tags: { status: 'normal' } },
      { type: 'poop_soft', label: '묽음', emoji: '💩', baseType: 'poop', tags: { status: 'soft' } },
      { type: 'poop_hard', label: '단단', emoji: '💩', baseType: 'poop', tags: { status: 'hard' } },
    ]
  },
  { key: 'health', emoji: '🏥', label: '건강', color: '#D08068',
    items: [
      { type: 'temp', label: '체온', emoji: '🌡️',
        step3: [{ label: '36.5', value: 36.5, unit: '°C' }, { label: '37.0', value: 37.0, unit: '°C' }, { label: '37.5', value: 37.5, unit: '°C' }, { label: '38.0', value: 38.0, unit: '°C' }, { label: '38.5', value: 38.5, unit: '°C' }] },
      { type: 'memo', label: '투약', emoji: '💊' },
    ]
  },
  { key: 'more', emoji: '📝', label: '더보기', color: '#868B94',
    items: [
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
  const [selectedItem, setSelectedItem] = useState<string | null>(null) // 3단계: 용량 선택
  const [fabStyle, setFabStyle] = useState<'A' | 'B'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('dodam_fab_style') as 'A' | 'B') || 'A'
    return 'A'
  })

  const handleQuickRecord = useCallback((type: string, extra?: Record<string, unknown>) => {
    if (navigator.vibrate) navigator.vibrate(30)
    window.dispatchEvent(new CustomEvent('dodam-record', { detail: { type, ...extra } }))
    setFabOpen(false)
    setSelectedCategory(null)
    setSelectedItem(null)
  }, [])

  if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/invite') || pathname?.startsWith('/post/') || pathname?.startsWith('/market-item/')) {
    return null
  }

  return (
    <>
      {/* ===== A안: 반원형 TOP5 + ... 더보기 ===== */}
      {fabOpen && fabStyle === 'A' && (() => {
        const TOP5 = [
          { type: 'breast_left', emoji: '🤱', label: '모유', bg: '#C8F0D8', tags: { side: 'left' }, baseType: 'feed' },
          { type: 'feed', emoji: '🍼', label: '분유', bg: '#C8F0D8', hasInput: 'ml' },
          { type: 'sleep', emoji: '💤', label: '수면', bg: '#E8E0F8' },
          { type: 'pee', emoji: '💧', label: '소변', bg: '#FEF0E8' },
          { type: 'poop', emoji: '💩', label: '대변', bg: '#FEF0E8' },
        ]
        const ARC = [
          { x: -120, y: -50 }, { x: -76, y: -115 }, { x: 0, y: -140 }, { x: 76, y: -115 }, { x: 120, y: -50 },
        ]
        // 더보기 바텀시트
        if (selectedCategory === 'more_a') return (
          <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => { setFabOpen(false); setSelectedCategory(null) }} />
            <div className="fixed z-[70] bottom-0 left-0 right-0 max-w-[430px] mx-auto">
              <div className="bg-white rounded-t-2xl shadow-xl animate-slideUp pb-[env(safe-area-inset-bottom)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
                <div className="px-5 pb-5">
                  <p className="text-[14px] font-bold text-[#1A1918] mb-3">더보기</p>
                  <RecordGrid onRecord={handleQuickRecord} />
                </div>
              </div>
            </div>
          </>
        )
        return (
          <>
            <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { setFabOpen(false); setSelectedCategory(null) }} />
            <div className="fixed z-[70] bottom-[60px] left-1/2" style={{ maxWidth: 430 }}>
              <div className="relative" style={{ width: 0, height: 0 }}>
                {TOP5.map((btn, i) => (
                  <div key={btn.type} className="absolute flex flex-col items-center gap-1.5"
                    style={{ left: ARC[i].x - 28, top: ARC[i].y - 28, animation: `fabItemPop 0.25s ${i * 0.04}s both cubic-bezier(0.34, 1.56, 0.64, 1)` }}>
                    <button onClick={() => {
                      if (btn.hasInput) {
                        const val = prompt(`${btn.label} (ml)`); if (val) handleQuickRecord(btn.type, { amount_ml: Number(val) })
                      } else {
                        handleQuickRecord(btn.baseType || btn.type, btn.tags ? { tags: btn.tags } : {})
                      }
                    }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform" style={{ backgroundColor: btn.bg }}>
                      <span className="text-2xl">{btn.emoji}</span>
                    </button>
                    <span className="text-[11px] font-semibold text-white whitespace-nowrap drop-shadow-sm">{btn.label}</span>
                  </div>
                ))}
                {/* ... 더보기 */}
                <div className="absolute flex flex-col items-center gap-1.5" style={{ left: 0 - 28, top: -180 - 28, animation: 'fabItemPop 0.25s 0.2s both cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  <button onClick={() => setSelectedCategory('more_a')} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90 bg-[#F5F4F1]">
                    <span className="text-lg">···</span>
                  </button>
                  <span className="text-[10px] font-semibold text-white/80 drop-shadow-sm">더보기</span>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* ===== B안: 반원형 변신 ===== */}
      {fabOpen && fabStyle === 'B' && (() => {
        const ARC = [
          { x: -120, y: -50 }, { x: -76, y: -115 }, { x: 0, y: -140 }, { x: 76, y: -115 }, { x: 120, y: -50 },
        ]
        if (!selectedCategory) {
          // 1단계: 카테고리
          return (
            <>
              <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setFabOpen(false)} />
              <div className="fixed z-[70] bottom-[60px] left-1/2" style={{ maxWidth: 430 }}>
                <div className="relative" style={{ width: 0, height: 0 }}>
                  {RECORD_CATEGORIES.map((cat, i) => (
                    <div key={cat.key} className="absolute flex flex-col items-center gap-1.5"
                      style={{ left: ARC[i].x - 28, top: ARC[i].y - 28, animation: `fabItemPop 0.25s ${i * 0.04}s both cubic-bezier(0.34, 1.56, 0.64, 1)` }}>
                      <button onClick={() => {
                        if (cat.items.length === 1) handleQuickRecord(cat.items[0].type)
                        else setSelectedCategory(cat.key)
                      }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform" style={{ backgroundColor: cat.color + '20' }}>
                        <span className="text-2xl">{cat.emoji}</span>
                      </button>
                      <span className="text-[11px] font-semibold text-white whitespace-nowrap drop-shadow-sm">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        }
        // 3단계: 프리셋 선택 (반원형 유지)
        if (selectedItem) {
          const item = RECORD_CATEGORIES.flatMap(c => c.items).find(i => i.type === selectedItem)
          if (!item || !item.step3) return null
          const presets = item.step3
          return (
            <>
              <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { setFabOpen(false); setSelectedCategory(null); setSelectedItem(null) }} />
              <div className="fixed z-[70] bottom-[60px] left-1/2" style={{ maxWidth: 430 }}>
                <div className="relative" style={{ width: 0, height: 0 }}>
                  {presets.map((p, i) => {
                    const pos = ARC[i % ARC.length]
                    return (
                      <div key={String(p.value)} className="absolute flex flex-col items-center gap-1"
                        style={{ left: pos.x - 24, top: pos.y - 24, animation: `fabItemPop 0.2s ${i * 0.03}s both cubic-bezier(0.34, 1.56, 0.64, 1)` }}>
                        <button onClick={() => {
                          const recordType = item.baseType || item.type
                          const extra: Record<string, unknown> = {}
                          // 태그 복사
                          if (item.tags) extra.tags = { ...item.tags }
                          // 값 설정
                          if (p.unit === 'ml') extra.amount_ml = p.value
                          else if (p.unit === '°C') extra.tags = { ...(extra.tags as any || {}), celsius: p.value }
                          else if (p.unit === '분') extra.tags = { ...(extra.tags as any || {}), duration_min: p.value }
                          else extra.tags = { ...(extra.tags as any || {}), subtype: p.value }
                          handleQuickRecord(recordType, extra)
                        }} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform bg-white">
                          <span className="text-[12px] font-bold text-[#3D8A5A]">{p.label}</span>
                        </button>
                        <span className="text-[9px] font-semibold text-white drop-shadow-sm">{p.unit || ''}</span>
                      </div>
                    )
                  })}
                  {/* 뒤로 */}
                  <div className="absolute" style={{ left: -16, top: -24 }}>
                    <button onClick={() => setSelectedItem(null)} className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-90">
                      <span className="text-[12px] text-[#868B94]">←</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )
        }

        // 2단계: 세부 (같은 반원형에서 변신)
        const cat = RECORD_CATEGORIES.find(c => c.key === selectedCategory)
        if (!cat) return null
        return (
          <>
            <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { setFabOpen(false); setSelectedCategory(null) }} />
            <div className="fixed z-[70] bottom-[60px] left-1/2" style={{ maxWidth: 430 }}>
              <div className="relative" style={{ width: 0, height: 0 }}>
                {cat.items.map((item, i) => {
                  const positions = cat.items.length <= 3
                    ? [{ x: -76, y: -115 }, { x: 0, y: -140 }, { x: 76, y: -115 }]
                    : cat.items.length <= 5
                      ? ARC
                      : [{ x: -120, y: -50 }, { x: -80, y: -110 }, { x: -20, y: -145 }, { x: 40, y: -140 }, { x: 90, y: -100 }]
                  const pos = positions[i % positions.length]
                  return (
                    <div key={item.type} className="absolute flex flex-col items-center gap-1.5"
                      style={{ left: pos.x - 28, top: pos.y - 28, animation: `fabItemPop 0.2s ${i * 0.03}s both cubic-bezier(0.34, 1.56, 0.64, 1)` }}>
                      <button onClick={() => {
                        if (item.step3) {
                          setSelectedItem(item.type) // 3단계로
                        } else {
                          const recordType = item.baseType || item.type
                          const extra: Record<string, unknown> = {}
                          if (item.tags) extra.tags = item.tags
                          handleQuickRecord(recordType, extra)
                        }
                      }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform" style={{ backgroundColor: cat.color + '25' }}>
                        <span className="text-xl">{item.emoji}</span>
                      </button>
                      <span className="text-[11px] font-semibold text-white whitespace-nowrap drop-shadow-sm">{item.label}</span>
                    </div>
                  )
                })}
                {/* 뒤로 */}
                <div className="absolute" style={{ left: -20, top: -30 }}>
                  <button onClick={() => setSelectedCategory(null)} className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center active:scale-90">
                    <span className="text-[14px] text-[#868B94]">←</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      })()}

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

// 더보기 전체 기록 그리드
function RecordGrid({ onRecord }: { onRecord: (type: string, extra?: Record<string, unknown>) => void }) {
  const ALL_ITEMS = RECORD_CATEGORIES.flatMap(cat => cat.items.map(item => ({ ...item, catColor: cat.color })))
  return (
    <div className="grid grid-cols-4 gap-2">
      {ALL_ITEMS.map(item => (
        <button key={item.type} onClick={() => {
          const recordType = item.baseType || item.type
          const extra: Record<string, unknown> = {}
          if (item.tags) extra.tags = item.tags
          onRecord(recordType, extra)
        }} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#F5F4F1] active:bg-[#ECECEC] active:scale-95">
          <span className="text-xl">{item.emoji}</span>
          <span className="text-[9px] font-medium text-[#1A1918]">{item.label}</span>
        </button>
      ))}
    </div>
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
