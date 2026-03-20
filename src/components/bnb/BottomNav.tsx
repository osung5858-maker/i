'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, ChartIcon, AlertIcon, MapIcon, SettingsIcon } from '@/components/ui/Icons'

interface Tab {
  href: string
  label: string
  icon: React.FC<{ className?: string }>
  isCenter?: boolean
}

const tabs: Tab[] = [
  { href: '/', icon: HomeIcon, label: '홈' },
  { href: '/growth', icon: ChartIcon, label: '성장' },
  { href: '/emergency', icon: AlertIcon, label: '응급', isCenter: true },
  { href: '/map', icon: MapIcon, label: '동네' },
  { href: '/settings', icon: SettingsIcon, label: '설정' },
]

export default function BottomNav() {
  const pathname = usePathname()

  if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/invite')) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a1a1a] border-t border-[#f0f0f0] dark:border-[#2a2a2a] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(tab.href)
          const Icon = tab.icon

          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#0052FF] flex items-center justify-center shadow-[0_4px_12px_rgba(0,82,255,0.3)] active:scale-95 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] mt-1 font-semibold text-[#0052FF]">
                  {tab.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-1"
            >
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isActive ? 'text-[#0A0B0D] dark:text-white' : 'text-[#9B9B9B]'
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-[#0A0B0D] dark:text-white' : 'text-[#9B9B9B]'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
