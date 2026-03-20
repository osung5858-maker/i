'use client'

import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 animate-fadeIn" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp">
        <div className="max-w-lg mx-auto bg-white dark:bg-[#1a1a1a] rounded-t-3xl shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[#e0e0e0] dark:bg-[#3a3a3a]" />
          </div>
          {title && (
            <p className="text-center text-sm font-bold text-[#0A0B0D] dark:text-white pb-2">{title}</p>
          )}
          <div className="px-6 pb-8">{children}</div>
        </div>
      </div>
    </>
  )
}
