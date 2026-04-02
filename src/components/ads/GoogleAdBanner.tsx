'use client'

import { useEffect, useRef } from 'react'

interface GoogleAdBannerProps {
  /**
   * 광고 슬롯 ID (Google AdSense에서 발급)
   * 예: "1234567890"
   */
  adSlot: string

  /**
   * 광고 형식
   * - 'display': 디스플레이 광고 (기본)
   * - 'in-article': 기사 내 광고
   * - 'in-feed': 피드 내 광고
   */
  format?: 'display' | 'in-article' | 'in-feed'

  /**
   * 광고 레이아웃 키 (responsive 광고용)
   */
  layoutKey?: string

  /**
   * 반응형 여부 (기본: true)
   */
  responsive?: boolean

  /**
   * 광고 스타일 (높이, 여백 등)
   */
  style?: React.CSSProperties

  /**
   * 커스텀 클래스
   */
  className?: string
}

export default function GoogleAdBanner({
  adSlot,
  format = 'display',
  layoutKey,
  responsive = true,
  style,
  className = '',
}: GoogleAdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const isProduction = process.env.NODE_ENV === 'production'
  const adClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID

  useEffect(() => {
    // 프로덕션이 아니거나 adClient가 없으면 광고 로드하지 않음
    if (!isProduction || !adClient) return

    try {
      // Google AdSense 스크립트 로드 확인
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        // 광고 푸시
        const adsbygoogle = (window as any).adsbygoogle || []
        adsbygoogle.push({})
      }
    } catch (error) {
      console.error('[GoogleAd] Failed to load ad:', error)
    }
  }, [isProduction, adClient])

  // 개발 환경 또는 adClient 미설정 시 플레이스홀더 표시
  if (!isProduction || !adClient) {
    return (
      <div
        className={`bg-[#f5f5f5] border-2 border-dashed border-[#E8E4DF] rounded-lg p-4 text-center ${className}`}
        style={style}
      >
        <p className="text-sm text-tertiary font-medium">광고 영역</p>
        <p className="text-xs text-muted mt-1">
          {adClient ? '개발 환경에서는 표시되지 않습니다' : 'NEXT_PUBLIC_GOOGLE_ADSENSE_ID 설정 필요'}
        </p>
      </div>
    )
  }

  const adFormatClass = format === 'in-article' ? 'adsbygoogle-noablate' : ''

  return (
    <div className={`ad-container ${className}`} style={style}>
      <ins
        ref={adRef}
        className={`adsbygoogle ${adFormatClass}`}
        style={{ display: 'block', ...(style || {}) }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={responsive ? 'auto' : format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
        {...(format === 'in-article' && { 'data-ad-layout': 'in-article' })}
        {...(format === 'in-feed' && { 'data-ad-layout': 'in-feed' })}
        {...(layoutKey && { 'data-ad-layout-key': layoutKey })}
      />
    </div>
  )
}

/**
 * 사용 예시:
 *
 * 1. 기본 디스플레이 광고 (반응형)
 * <GoogleAdBanner adSlot="1234567890" />
 *
 * 2. 피드 내 광고 (알림 목록 등)
 * <GoogleAdBanner
 *   adSlot="1234567890"
 *   format="in-feed"
 *   layoutKey="-fb+5w+4e-db+86"
 * />
 *
 * 3. 기사 내 광고 (긴 콘텐츠 중간)
 * <GoogleAdBanner
 *   adSlot="1234567890"
 *   format="in-article"
 *   className="my-6"
 * />
 *
 * 4. 고정 크기 광고
 * <GoogleAdBanner
 *   adSlot="1234567890"
 *   responsive={false}
 *   style={{ width: '320px', height: '100px' }}
 * />
 */
