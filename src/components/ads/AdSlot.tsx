'use client'

import { useEffect, useRef } from 'react'

interface Props {
  /** 'kakao' = 카카오 애드핏 | 'google' = 구글 애드센스 */
  provider?: 'kakao' | 'google'
  className?: string
}

export default function AdSlot({ provider = 'kakao', className = '' }: Props) {
  const adRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    if (provider === 'kakao') {
      // 카카오 애드핏 스크립트 로드
      if (!document.querySelector('script[src*="ba.min.js"]')) {
        const script = document.createElement('script')
        script.src = '//t1.daumcdn.net/kas/static/ba.min.js'
        script.async = true
        document.body.appendChild(script)
      }
    } else {
      // 구글 애드센스 push
      try {
        if ((window as any).adsbygoogle) {
          ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
        }
      } catch { /* 미로드 시 무시 */ }
    }
  }, [provider])

  if (provider === 'kakao') {
    return (
      <div className={`flex justify-center ${className}`}>
        <ins
          className="kakao_ad_area"
          style={{ display: 'none' }}
          data-ad-unit="DAN-3244MEaMSYCUqnpv"
          data-ad-width="320"
          data-ad-height="50"
        />
      </div>
    )
  }

  // 구글 애드센스
  return (
    <div className={`flex justify-center ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '320px', height: '50px' }}
        data-ad-client="ca-pub-7884114322521157"
        data-ad-slot="XXXXXXXXXX"
        data-ad-format="horizontal"
        data-full-width-responsive="false"
      />
    </div>
  )
}
