'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

/**
 * Client component that tracks page views on route changes.
 * Drop into RootLayout to enable automatic page tracking.
 */
export default function AnalyticsPageView() {
  const pathname = usePathname()

  useEffect(() => {
    trackPageView(pathname)
  }, [pathname])

  return null
}
