'use client'

import { useState, useEffect } from 'react'
import { COLOR_THEMES, DEFAULT_THEME_ID, getThemeById, applyThemeToDOM } from '@/lib/themes'

const STORAGE_KEY = 'dodam_color_theme'

export default function ThemeSelector() {
  const [savedTheme, setSavedTheme] = useState(DEFAULT_THEME_ID)
  const [previewTheme, setPreviewTheme] = useState(DEFAULT_THEME_ID)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const themeId = saved || DEFAULT_THEME_ID
    setSavedTheme(themeId)
    setPreviewTheme(themeId)
    applyThemeToDOM(getThemeById(themeId))
  }, [])

  const handlePreview = (id: string) => {
    setPreviewTheme(id)
    setHasChanges(id !== savedTheme)
    // 미리보기: 즉시 DOM에 적용
    applyThemeToDOM(getThemeById(id))
  }

  const handleApply = () => {
    localStorage.setItem(STORAGE_KEY, previewTheme)
    setSavedTheme(previewTheme)
    setHasChanges(false)
    window.dispatchEvent(new CustomEvent('dodam-toast', {
      detail: { message: `${getThemeById(previewTheme).name} 테마가 적용되었어요` }
    }))
  }

  const handleCancel = () => {
    setPreviewTheme(savedTheme)
    setHasChanges(false)
    // 원래 테마로 복구
    applyThemeToDOM(getThemeById(savedTheme))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2 px-1">
        {COLOR_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handlePreview(theme.id)}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
              previewTheme === theme.id
                ? 'bg-white ring-2 shadow-sm'
                : 'bg-transparent active:bg-white/50'
            }`}
            style={previewTheme === theme.id ? { boxShadow: `0 0 0 2px ${theme.primary}` } : {}}
          >
            <div
              className="w-10 h-10 rounded-full shadow-sm"
              style={{ background: theme.primary }}
            />
            <span className="text-label font-medium text-primary">{theme.name}</span>
          </button>
        ))}
      </div>

      {/* 적용/취소 버튼 */}
      {hasChanges && (
        <div className="flex gap-2 px-1">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-xl text-body font-semibold text-secondary bg-[#E8E4DF] active:bg-[#D8D4CF] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl font-semibold transition-colors"
            style={{ backgroundColor: getThemeById(previewTheme).primary, color: '#FFFFFF', fontSize: 14 }}
          >
            적용
          </button>
        </div>
      )}

      {/* 현재 적용된 테마 표시 */}
      {!hasChanges && (
        <p className="text-center text-label text-tertiary px-1">
          현재: {getThemeById(savedTheme).name}
        </p>
      )}
    </div>
  )
}
