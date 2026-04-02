'use client'

import { useState, useEffect } from 'react'

export default function GlobalToast() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message
      if (msg) {
        setMessage(msg)
        setTimeout(() => setMessage(null), 2500)
      }
    }
    window.addEventListener('dodam-toast', handler)
    return () => window.removeEventListener('dodam-toast', handler)
  }, [])

  if (!message) return null

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[#1A1A1A] px-5 py-2.5 rounded-xl text-body font-bold shadow-[0_8px_30px_rgba(0,0,0,0.3)] max-w-[320px] text-center" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
        {message}
      </div>
    </div>
  )
}
