'use client'

import { useEffect, useRef } from 'react'

interface Props {
  className?: string
}

export default function AdSlot({ className = '' }: Props) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // 카카오 애드핏 스크립트 로드
    if (!document.querySelector('script[src*="ba.min.js"]')) {
      const script = document.createElement('script')
      script.src = '//t1.daumcdn.net/kas/static/ba.min.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

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
