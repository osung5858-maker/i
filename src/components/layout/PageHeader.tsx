'use client'

import { useRouter } from 'next/navigation'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
  subtitle?: string
  transparent?: boolean
  /** standalone pages (chat etc) use top-0; pages under GlobalHeader use top-[72px] (default) */
  standalone?: boolean
}

export default function PageHeader({ title, showBack = true, rightAction, subtitle, transparent = false, standalone = false }: PageHeaderProps) {
  const router = useRouter()

  return (
    <header
      className={`sticky z-30 ${standalone ? 'top-0' : 'top-[72px]'}`}
      style={transparent ? undefined : {
        background: 'linear-gradient(180deg, var(--color-primary-bg) 0%, rgba(255,255,255,0.95) 100%)',
        borderBottom: '1px solid var(--color-border-light)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center h-14 px-4 max-w-lg mx-auto gap-3">
        {/* 좌측: 뒤로가기 */}
        <div className="w-9 shrink-0">
          {showBack && (
            <button
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors active:scale-95"
              style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* 중앙: 제목 */}
        <div className="flex-1 min-w-0 text-center">
          <p
            className="truncate"
            style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3 }}
          >
            {title}
          </p>
          {subtitle && (
            <p className="truncate" style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-primary)', marginTop: -1 }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* 우측: 액션 */}
        <div className="w-9 shrink-0 flex justify-end">
          {rightAction || <div className="w-9" />}
        </div>
      </div>
    </header>
  )
}
