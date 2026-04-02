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
    const applyAppropriateTheme = () => {
      // 우선순위 1: 사용자가 직접 선택한 테마
      const userSelectedTheme = localStorage.getItem('dodam_color_theme')

      // 우선순위 2: 모드별 자동 테마
      const mode = localStorage.getItem('dodam_mode') || 'parenting'
      const modeThemeMap: Record<string, string> = {
        preparing: 'peach',    // 피치오렌지 (임신 준비)
        pregnant: 'amber',     // 앰버 골드 (임신 중)
        parenting: 'sage',     // 세이지 민트 (육아)
      }

      // 사용자 선택 테마가 있으면 그것 사용, 없으면 모드별 테마 사용
      const themeId = userSelectedTheme || modeThemeMap[mode] || DEFAULT_THEME_ID
      const theme = getThemeById(themeId)
      applyThemeToDOM(theme)
    }

    // 초기 테마 적용
    applyAppropriateTheme()

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
