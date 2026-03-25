'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 레거시 /us → /more 리다이렉트
export default function UsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/more') }, [router])
  return (
    <div className="flex items-center justify-center h-[100dvh]">
      <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  )
}
