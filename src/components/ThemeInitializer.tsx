'use client'

import { useEffect } from 'react'
import { DEFAULT_THEME_ID, getThemeById, applyThemeToDOM } from '@/lib/themes'

export default function ThemeInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem('dodam_color_theme') || DEFAULT_THEME_ID
    applyThemeToDOM(getThemeById(saved))
  }, [])

  return null
}
