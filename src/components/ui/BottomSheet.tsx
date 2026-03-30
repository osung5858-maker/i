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
      <div className="fixed inset-0 z-[75] bg-black/30 animate-fadeIn" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[75] animate-slideUp">
        <div className="max-w-lg mx-auto bg-white rounded-t-[20px] shadow-[0_-2px_20px_rgba(0,0,0,0.08)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full bg-[#ECECEC]" />
          </div>
          {title && (
            <p className="text-center text-[15px] font-bold text-[#212124] pb-3">{title}</p>
          )}
          <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">{children}</div>
        </div>
      </div>
    </>
  )
}
