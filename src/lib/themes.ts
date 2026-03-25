// 도담 컬러 테마 정의
export interface ColorTheme {
  id: string
  name: string
  emoji: string
  primary: string
  primaryLight: string
  primaryBg: string
  accent: string
  accentBg: string
  gradient: string
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'coral',
    name: '코랄',
    emoji: '🌸',
    primary: '#E8937A',
    primaryLight: '#F0A890',
    primaryBg: '#FFF5F2',
    accent: '#D07A62',
    accentBg: '#FFE0D4',
    gradient: 'linear-gradient(135deg, #FFF5F2 0%, #FFE8E0 50%, #FFD4C4 100%)',
  },
  {
    id: 'lavender',
    name: '라벤더',
    emoji: '💜',
    primary: '#8B7EC8',
    primaryLight: '#A498D4',
    primaryBg: '#F5F3FA',
    accent: '#6B5EAA',
    accentBg: '#E4DFF0',
    gradient: 'linear-gradient(135deg, #F5F3FA 0%, #EDE8F5 50%, #E0DAF0 100%)',
  },
  {
    id: 'peach',
    name: '피치오렌지',
    emoji: '🍑',
    primary: '#FF8C5A',
    primaryLight: '#FFA070',
    primaryBg: '#FFF8F0',
    accent: '#2D6B4A',
    accentBg: '#FFE0C8',
    gradient: 'linear-gradient(135deg, #FFF8F0 0%, #FFEFD6 50%, #FFE4C4 100%)',
  },
  {
    id: 'rose',
    name: '더스티 로즈',
    emoji: '🌹',
    primary: '#C87B8A',
    primaryLight: '#D4909E',
    primaryBg: '#FFF2F4',
    accent: '#A85C6C',
    accentBg: '#F0D0D6',
    gradient: 'linear-gradient(135deg, #FFF2F4 0%, #FFE8EC 50%, #FFD8E0 100%)',
  },
  {
    id: 'blue',
    name: '소프트 블루',
    emoji: '💧',
    primary: '#6B9EC8',
    primaryLight: '#88B4D4',
    primaryBg: '#F0F5FA',
    accent: '#4A80B0',
    accentBg: '#D0E2F0',
    gradient: 'linear-gradient(135deg, #F0F5FA 0%, #E4EFF8 50%, #D4E6F4 100%)',
  },
  {
    id: 'amber',
    name: '앰버 골드',
    emoji: '✨',
    primary: '#C8A055',
    primaryLight: '#D4B470',
    primaryBg: '#FDF8EE',
    accent: '#A08040',
    accentBg: '#E8D8B8',
    gradient: 'linear-gradient(135deg, #FDF8EE 0%, #F8F0DA 50%, #F0E4C8 100%)',
  },
  {
    id: 'sage',
    name: '세이지 민트',
    emoji: '🌿',
    primary: '#5EA88A',
    primaryLight: '#78BA9E',
    primaryBg: '#F0F8F4',
    accent: '#3D8A5A',
    accentBg: '#C8E8D4',
    gradient: 'linear-gradient(135deg, #F0F8F4 0%, #E0F5E9 50%, #D0EFE0 100%)',
  },
]

export const DEFAULT_THEME_ID = 'coral'

export function getThemeById(id: string): ColorTheme {
  return COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0]
}

export function applyThemeToDOM(theme: ColorTheme) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-primary-light', theme.primaryLight)
  root.style.setProperty('--color-primary-bg', theme.primaryBg)
  root.style.setProperty('--color-accent', theme.accent)
  root.style.setProperty('--color-accent-bg', theme.accentBg)
  root.style.setProperty('--dodam-gradient', theme.gradient)
}
