'use client'

import { useState, useEffect } from 'react'
import { COLOR_THEMES, DEFAULT_THEME_ID, getThemeById, applyThemeToDOM } from '@/lib/themes'

const STORAGE_KEY = 'dodam_color_theme'

export default function ThemeSelector() {
  const [selected, setSelected] = useState(DEFAULT_THEME_ID)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setSelected(saved)
      applyThemeToDOM(getThemeById(saved))
    }
  }, [])

  const handleSelect = (id: string) => {
    setSelected(id)
    localStorage.setItem(STORAGE_KEY, id)
    applyThemeToDOM(getThemeById(id))
  }

  return (
    <div className="grid grid-cols-4 gap-2 px-1">
      {COLOR_THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => handleSelect(theme.id)}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
            selected === theme.id
              ? 'bg-white ring-2 shadow-sm'
              : 'bg-transparent active:bg-white/50'
          }`}
          style={selected === theme.id ? { boxShadow: `0 0 0 2px ${theme.primary}` } : {}}
        >
          <div
            className="w-10 h-10 rounded-full shadow-sm"
            style={{ background: theme.primary }}
          />
          <span className="text-[11px] font-medium text-[#1A1918]">{theme.name}</span>
        </button>
      ))}
    </div>
  )
}
