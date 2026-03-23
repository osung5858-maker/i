'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GrowthRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/memory')
  }, [router])

  return (
    <div className="flex items-center justify-center h-[100dvh]">
      <div className="w-8 h-8 border-3 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" />
    </div>
  )
}
