'use client'

import { useEffect, useState } from 'react'

interface Props {
  message: string
  action?: { label: string; onClick: () => void }
  duration?: number
  onDismiss: () => void
}

export default function Toast({ message, action, duration = 5000, onDismiss }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | undefined

    const timer = setTimeout(() => {
      setVisible(false)
      dismissTimer = setTimeout(onDismiss, 300)
    }, duration)

    return () => {
      clearTimeout(timer)
      if (dismissTimer) clearTimeout(dismissTimer)
    }
  }, [duration, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`
        fixed top-4 left-4 right-4 z-[60] max-w-lg mx-auto
        bg-[#1A1A1A] rounded-2xl px-4 py-3.5
        flex items-center justify-between gap-3
        shadow-[0_8px_30px_rgba(0,0,0,0.3)]
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
      style={{ backgroundColor: '#1A1A1A' }}
    >
      <span className="text-body font-bold" style={{ color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-body font-bold text-[var(--color-primary)] shrink-0 active:opacity-70"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
