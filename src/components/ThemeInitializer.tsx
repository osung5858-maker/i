'use client'

import { useEffect } from 'react'
import { DEFAULT_THEME_ID, getThemeById, applyThemeToDOM } from '@/lib/themes'
import { cleanupExpiredCache } from '@/lib/storage/cleanup'

const DARK_MODE_KEY = 'dodam_theme'

function applyDarkMode(mode: 'auto' | 'light' | 'dark') {
  const html = document.documentElement

  if (mode === 'dark') {
    html.classList.add('dark')
  } else if (mode === 'light') {
    html.classList.remove('dark')
  } else {
    // auto: 시스템 설정 따름
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
}

export function getDarkMode(): 'auto' | 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(DARK_MODE_KEY)
  if (saved === 'dark' || saved === 'light' || saved === 'auto') return saved
  return 'light'
}

export function setDarkMode(mode: 'auto' | 'light' | 'dark') {
  localStorage.setItem(DARK_MODE_KEY, mode)
  applyDarkMode(mode)
}

export default function ThemeInitializer() {
  useEffect(() => {
    // 컬러 테마 적용
    const savedColor = localStorage.getItem('dodam_color_theme') || DEFAULT_THEME_ID
    applyThemeToDOM(getThemeById(savedColor))

    // 다크 모드 — 현재 비활성화 (라이트만 지원)
    // 향후 전체 컴포넌트를 CSS 변수 기반으로 리팩토링 후 활성화
    document.documentElement.classList.remove('dark')
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {} // placeholder

    // Cleanup expired localStorage caches (non-blocking)
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(cleanupExpiredCache)
    } else {
      setTimeout(cleanupExpiredCache, 3000)
    }

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return null
}
