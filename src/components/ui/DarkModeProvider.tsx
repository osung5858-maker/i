'use client'

import { useEffect } from 'react'

export default function DarkModeProvider() {
  useEffect(() => {
    // 저장된 설정 또는 시스템 설정
    const saved = localStorage.getItem('dodam_dark_mode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (saved === 'true' || (saved === 'auto' && prefersDark) || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark')
    }

    // 자동 모드: 야간(20시~6시) 자동 전환
    if (saved === 'auto' || !saved) {
      const hour = new Date().getHours()
      if (hour >= 20 || hour < 6) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  return null
}
