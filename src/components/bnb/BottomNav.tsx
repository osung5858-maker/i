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
    <nav className="absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-[#ECECEC] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
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
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-12 h-12 rounded-full bg-[#FF6F0F] flex items-center justify-center shadow-[0_2px_12px_rgba(255,111,15,0.35)] active:scale-95 transition-transform">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] mt-0.5 font-semibold text-[#FF6F0F]">
                  {tab.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-1"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-[#212124]' : 'text-[#AEB1B9]'
                }`}
              />
              <span
                className={`text-[10px] transition-colors ${
                  isActive ? 'text-[#212124] font-semibold' : 'text-[#AEB1B9]'
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
