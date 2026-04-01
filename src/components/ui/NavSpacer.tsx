'use client'

import { usePathname } from 'next/navigation'

const HIDE_PATHS = ['/onboarding', '/invite', '/auth', '/post/', '/market-item/', '/landing', '/privacy', '/terms', '/celebration', '/birth']

export default function NavSpacer() {
  const pathname = usePathname()
  if (HIDE_PATHS.some(p => pathname?.startsWith(p))) return null
  return <div className="h-20 shrink-0" />
}
