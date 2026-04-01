'use client'

import { useRouter } from 'next/navigation'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
  subtitle?: string
  transparent?: boolean
  standalone?: boolean  // GlobalHeader 없는 페이지에서 top-0으로
}

export default function PageHeader({ title, showBack = false, rightAction, subtitle, transparent = false, standalone = false }: PageHeaderProps) {
  const router = useRouter()

  return (
    <header
      className={`sticky ${standalone ? 'top-0 z-40' : 'top-[72px] z-30'} ${transparent ? 'bg-transparent' : 'bg-white'}`}
      style={{
        borderBottom: transparent ? 'none' : '1px solid var(--border-default)'
      }}
    >
      <div className="flex items-center h-12 max-w-lg mx-auto" style={{ padding: '0 var(--spacing-4)' }}>
        {/* 좌측: 뒤로가기 */}
        <div className="w-10 shrink-0">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 rounded-full active:bg-[var(--color-page-bg)]"
              style={{ marginLeft: 'calc(-1 * var(--spacing-2))' }}
              aria-label="뒤로가기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-primary)' }}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* 중앙: 제목 */}
        <div className="flex-1 min-w-0 text-center">
          <p className="text-subtitle truncate">{title}</p>
          {subtitle && <p className="text-caption truncate" style={{ marginTop: '-2px', color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
        </div>

        {/* 우측: 액션 */}
        <div className="shrink-0 flex justify-end" style={{ marginLeft: 'var(--spacing-2)' }}>
          {rightAction || <div className="w-10" />}
        </div>
      </div>
    </header>
  )
}
