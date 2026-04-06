'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드', icon: '📊' },
  { href: '/admin/users', label: '유저 관리', icon: '👤' },
  { href: '/admin/posts', label: '게시글 관리', icon: '📝' },
  { href: '/admin/reports', label: '신고 관리', icon: '🚨' },
  { href: '/admin/places', label: '장소 관리', icon: '📍' },
  { href: '/admin/stats', label: '통계', icon: '🔢' },
  { href: '/admin/ads', label: '광고 관리', icon: '📢' },
  { href: '/admin/analytics', label: '페이지 분석', icon: '📈' },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/onboarding')
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div
      className="flex h-screen bg-gray-100"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
      }}
    >
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-slate-800 text-white">
        <div className="h-14 flex items-center px-5 border-b border-slate-700">
          <span className="text-lg font-bold tracking-tight">도담 어드민</span>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-slate-700 text-xs text-slate-400">
          v1.0 Phase 5
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-gray-200 flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-700">관리자 대시보드</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
          >
            로그아웃
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
