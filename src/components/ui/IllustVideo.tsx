'use client'

interface Props {
  src: string
  className?: string
  /** 'fade' = 가장자리 페이드 (기본), 'circle' = 원형 마스크, 'icon' = 소형 원형 아이콘 */
  variant?: 'fade' | 'circle' | 'icon'
}

export default function IllustVideo({ src, className = 'w-48 h-48', variant = 'fade' }: Props) {
  if (variant === 'icon') {
    // 소형 아이콘용 — 원형 + 소프트 글로우
    return (
      <div className={`relative rounded-full overflow-hidden ${className}`}
        style={{
          maskImage: 'radial-gradient(circle, black 55%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 80%)',
        }}>
        <video src={src} autoPlay loop muted playsInline preload="none" className="w-full h-full object-cover" />
      </div>
    )
  }

  if (variant === 'circle') {
    // 원형 마스크 + 소프트 엣지
    return (
      <div className={`relative overflow-hidden ${className}`}
        style={{
          maskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 72%)',
        }}>
        <video src={src} autoPlay loop muted playsInline preload="none" className="w-full h-full object-cover" />
      </div>
    )
  }

  // 기본: 사각형 + 가장자리 페이드
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        className="w-full h-full object-cover"
      />
      {/* 외곽 투명 그라데이션 — radial mask로 가장자리 페이드 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 70% at center, black 50%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at center, black 50%, transparent 100%)',
          background: 'inherit',
        }}
      />
      {/* 네 방향 페이드 오버레이 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          linear-gradient(to bottom, var(--fade-bg, white) 0%, transparent 18%),
          linear-gradient(to top, var(--fade-bg, white) 0%, transparent 18%),
          linear-gradient(to right, var(--fade-bg, white) 0%, transparent 18%),
          linear-gradient(to left, var(--fade-bg, white) 0%, transparent 18%)
        `,
      }} />
    </div>
  )
}
