'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // 이미 standalone(PWA/앱)으로 실행 중이면 표시하지 않음
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    if (isStandalone) return

    // 이미 닫은 적 있으면 7일간 안 보여줌
    const dismissed = localStorage.getItem('dodam_pwa_dismissed')
    if (dismissed) {
      const diff = Date.now() - Number(dismissed)
      if (diff < 7 * 24 * 60 * 60 * 1000) return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // beforeinstallprompt가 안 뜨는 브라우저(Safari 등)에도 안내 표시
    const timer = setTimeout(() => {
      if (!deferredPrompt) setShow(true)
    }, 3000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShow(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('dodam_pwa_dismissed', String(Date.now()))
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 flex items-center gap-3">
      <Image
        src="/icon-192.png"
        alt="도담 앱 아이콘"
        width={44}
        height={44}
        className="rounded-xl shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-body font-bold text-primary leading-snug">
          도담 AI 육아 파트너를 홈화면에 추가하세요
        </p>
        <p className="text-caption text-tertiary">앱처럼 바로 열 수 있어요</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="text-body font-bold text-white bg-[var(--color-primary)] px-3 py-1.5 rounded-lg active:opacity-80"
          >
            추가
          </button>
        ) : (
          <button
            onClick={handleDismiss}
            className="text-body font-medium text-[var(--color-primary)] px-2 py-1.5 rounded-lg active:opacity-60"
          >
            확인
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="text-tertiary p-1 active:opacity-60"
          aria-label="닫기"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
