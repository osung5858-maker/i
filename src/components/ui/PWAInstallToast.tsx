'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'dodam_pwa_dismiss'
const SHOWN_TODAY_KEY = 'dodam_pwa_shown'

function alreadyShownToday(): boolean {
  try {
    const v = localStorage.getItem(SHOWN_TODAY_KEY)
    return v === new Date().toISOString().split('T')[0]
  } catch { return false }
}

function markShownToday() {
  try { localStorage.setItem(SHOWN_TODAY_KEY, new Date().toISOString().split('T')[0]) } catch { /* */ }
}

export default function PWAInstallToast() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // 이미 설치된 PWA면 표시 안 함
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')
    if (isStandalone) return

    // 오늘 이미 한 번 봤으면 표시 안 함
    if (alreadyShownToday()) return

    // X 버튼으로 닫은 적 있으면 7일간 표시 안 함
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed && Date.now() - Number(dismissed) < 7 * 86400000) return

    let prompted = false

    const handler = (e: Event) => {
      e.preventDefault()
      prompted = true
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
      markShownToday()
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Safari/iOS는 beforeinstallprompt 없음 → 3초 후 폴백 (1회만)
    const fallback = setTimeout(() => {
      if (!prompted) {
        setShow(true)
        markShownToday()
      }
    }, 3000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(fallback)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
    }
    setShow(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-32px)] max-w-[398px] animate-[slideUp_0.3s_ease-out]">
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center gap-3">
        <Image
          src="/icon-192.png"
          alt="도담"
          width={40}
          height={40}
          className="rounded-xl shrink-0"
        />
        <p className="text-[13px] text-gray-700 leading-snug flex-1">
          <span className="font-semibold text-gray-900">홈화면에 추가</span>하면
          앱처럼 바로 열 수 있어요
        </p>
        <button
          onClick={handleInstall}
          className="shrink-0 px-3 py-1.5 text-[13px] font-bold rounded-lg text-white cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          추가
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          aria-label="닫기"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
