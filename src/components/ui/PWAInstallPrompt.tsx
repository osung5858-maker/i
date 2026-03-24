'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // SW 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // 2번째 방문부터 표시
      const visits = Number(localStorage.getItem('dodam-visits') || '0') + 1
      localStorage.setItem('dodam-visits', String(visits))
      if (visits >= 2 && !localStorage.getItem('dodam-pwa-dismissed')) {
        setShow(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('dodam-pwa-dismissed', 'true')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[55] max-w-lg mx-auto animate-slideUp">
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-[#ECECEC] p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6F0F] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">도</span>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-[#212124]">도담을 홈 화면에 추가하세요</p>
            <p className="text-[12px] text-[#6B6966] mt-0.5">앱처럼 바로 열 수 있어요</p>
          </div>
          <button onClick={handleDismiss} className="text-[#9E9A95] text-xs p-1">✕</button>
        </div>
        <button
          onClick={handleInstall}
          className="w-full h-10 rounded-xl bg-[#FF6F0F] text-white text-[13px] font-semibold mt-3 active:scale-[0.98] transition-transform"
        >
          홈 화면에 추가
        </button>
      </div>
    </div>
  )
}
