'use client'

import { useEffect, useRef } from 'react'

interface KakaoAdFitProps {
  /**
   * AdFit 광고 단위 ID (카카오 AdFit에서 발급)
   * 예: "DAN-xxxxxxxxxx"
   */
  unit: string

  /**
   * 광고 너비 (px)
   */
  width: number

  /**
   * 광고 높이 (px)
   */
  height: number

  /**
   * 커스텀 클래스
   */
  className?: string

  /**
   * 컨테이너 스타일
   */
  style?: React.CSSProperties
}

export default function KakaoAdFit({
  unit,
  width,
  height,
  className = '',
  style,
}: KakaoAdFitProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const isProduction = process.env.NODE_ENV === 'production'

  useEffect(() => {
    // 프로덕션이 아니면 광고 로드하지 않음
    if (!isProduction || !unit) return

    // 이미 스크립트가 로드되었으면 스킵
    if (scriptRef.current) return

    try {
      // 카카오 AdFit 스크립트 동적 생성
      const script = document.createElement('script')
      script.async = true
      script.type = 'text/javascript'
      script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js'

      // 광고 컨테이너에 삽입
      if (adRef.current) {
        const ins = document.createElement('ins')
        ins.className = 'kakao_ad_area'
        ins.style.display = 'none'
        ins.setAttribute('data-ad-unit', unit)
        ins.setAttribute('data-ad-width', String(width))
        ins.setAttribute('data-ad-height', String(height))

        adRef.current.appendChild(ins)
        adRef.current.appendChild(script)
        scriptRef.current = script
      }
    } catch (error) {
      console.error('[KakaoAdFit] Failed to load ad:', error)
    }

    // Cleanup
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current)
        scriptRef.current = null
      }
    }
  }, [isProduction, unit, width, height])

  // 개발 환경에서는 플레이스홀더 표시
  if (!isProduction || !unit) {
    return (
      <div
        className={`bg-[#FEE500]/10 border-2 border-dashed border-[#FEE500]/30 rounded-lg p-4 text-center ${className}`}
        style={{ width: `${width}px`, height: `${height}px`, ...style }}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-sm text-tertiary font-medium">카카오 AdFit 광고</p>
          <p className="text-xs text-muted mt-1">
            {width}×{height}
          </p>
          <p className="text-xs text-muted">
            {unit || '광고 단위 ID 필요'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={adRef}
      className={`kakao-adfit-container ${className}`}
      style={{ width: `${width}px`, height: `${height}px`, ...style }}
    />
  )
}

/**
 * 사용 예시:
 *
 * 1. 모바일 배너 (320x50)
 * <KakaoAdFit unit="DAN-xxxxxxxxxx" width={320} height={50} />
 *
 * 2. 모바일 큰 배너 (320x100)
 * <KakaoAdFit
 *   unit="DAN-xxxxxxxxxx"
 *   width={320}
 *   height={100}
 *   className="mx-auto my-4"
 * />
 *
 * 3. 피드 내 광고 (300x250)
 * <KakaoAdFit
 *   unit="DAN-xxxxxxxxxx"
 *   width={300}
 *   height={250}
 *   className="my-6"
 * />
 *
 * 카카오 AdFit 광고 사이즈:
 * - 320x50: 모바일 배너
 * - 320x100: 모바일 큰 배너
 * - 300x250: 중형 직사각형
 * - 250x250: 정사각형
 * - 160x600: 와이드 스카이스크래퍼
 */
