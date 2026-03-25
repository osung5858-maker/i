'use client'

import { useRouter } from 'next/navigation'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
  subtitle?: string
  transparent?: boolean
}

export default function PageHeader({ title, showBack = false, rightAction, subtitle, transparent = false }: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className={`sticky top-0 z-40 ${transparent ? 'bg-transparent' : 'bg-white border-b border-[#E8E4DF]'}`}>
      <div className="flex items-center justify-between h-12 px-4 max-w-lg mx-auto">
        {/* 좌측: 뒤로가기 또는 빈 공간 */}
        <div className="w-10">
          {showBack && (
            <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full active:bg-[#FFF9F5]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A1918]">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* 중앙: 제목 */}
        <div className="flex-1 text-center">
          <p className="text-[15px] font-bold text-[#1A1918]">{title}</p>
          {subtitle && <p className="text-[10px] text-[#6B6966] -mt-0.5">{subtitle}</p>}
        </div>

        {/* 우측: 액션 */}
        <div className="w-10 flex justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  )
}
