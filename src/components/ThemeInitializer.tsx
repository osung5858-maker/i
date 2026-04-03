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
    // blocking <script> in <head> 가 이미 테마를 적용했으면 스킵
    // (data-theme-applied 속성 체크)
    if (!document.documentElement.getAttribute('data-theme-applied')) {
      const userSelectedTheme = localStorage.getItem('dodam_color_theme')
      const mode = localStorage.getItem('dodam_mode') || 'parenting'
      const modeThemeMap: Record<string, string> = {
        preparing: 'peach',
        pregnant: 'amber',
        parenting: 'sage',
      }
      const themeId = userSelectedTheme || modeThemeMap[mode] || DEFAULT_THEME_ID
      const theme = getThemeById(themeId)
      applyThemeToDOM(theme)
    }

    // 다크 모드 비활성화 (라이트만 지원)
    document.documentElement.classList.remove('dark')

    // Cleanup expired localStorage caches (non-blocking)
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(cleanupExpiredCache)
    } else {
      setTimeout(cleanupExpiredCache, 3000)
    }
  }, [])

  return null
}
