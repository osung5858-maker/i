'use client'

import { useState, useEffect, useCallback } from 'react'
import SplashScreen from '@/components/ui/SplashScreen'

export default function SplashProvider() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('dodam_splash_shown')) {
      setShow(true)
    }
  }, [])

  const handleFinish = useCallback(() => {
    sessionStorage.setItem('dodam_splash_shown', '1')
    setShow(false)
  }, [])

  if (!show) return null
  return <SplashScreen onFinish={handleFinish} />
}
