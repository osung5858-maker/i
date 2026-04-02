// 도담 컬러 테마 정의 — Full Theme (배경+그림자+그라데이션 포함)
export interface ColorTheme {
  id: string
  name: string
  emoji: string
  // 포인트 컬러
  primary: string
  primaryLight: string
  primaryBg: string
  accent: string
  accentBg: string
  gradient: string
  // Full Theme — 배경/그림자
  pageBg: string
  cardShadow: string
  headerShadow: string
  tabShadow: string
  fabGradientFrom: string
  fabGradientTo: string
  fabShadow: string
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'coral',
    name: '코랄',
    emoji: '*',
    primary: '#E8937A',
    primaryLight: '#F0A890',
    primaryBg: '#FFF5F2',
    accent: '#D07A62',
    accentBg: '#FFE0D4',
    gradient: 'linear-gradient(135deg, #FFF5F2 0%, #FFE8E0 50%, #FFD4C4 100%)',
    pageBg: '#FFF5F2',
    cardShadow: 'rgba(232,147,122,0.08)',
    headerShadow: 'rgba(232,147,122,0.1)',
    tabShadow: 'rgba(232,147,122,0.06)',
    fabGradientFrom: '#FFD4C4',
    fabGradientTo: '#E8937A',
    fabShadow: 'rgba(232,147,122,0.35)',
  },
  {
    id: 'lavender',
    name: '라벤더',
    emoji: '*',
    primary: '#8B7EC8',
    primaryLight: '#A498D4',
    primaryBg: '#F5F3FA',
    accent: '#6B5EAA',
    accentBg: '#E4DFF0',
    gradient: 'linear-gradient(135deg, #F5F3FA 0%, #EDE8F5 50%, #E0DAF0 100%)',
    pageBg: '#F5F3FA',
    cardShadow: 'rgba(139,126,200,0.08)',
    headerShadow: 'rgba(139,126,200,0.1)',
    tabShadow: 'rgba(139,126,200,0.06)',
    fabGradientFrom: '#D4C8F0',
    fabGradientTo: '#8B7EC8',
    fabShadow: 'rgba(139,126,200,0.35)',
  },
  {
    id: 'peach',
    name: '피치오렌지',
    emoji: '*',
    primary: '#FF8C5A',
    primaryLight: '#FFA070',
    primaryBg: '#FFF8F0',
    accent: '#2D6B4A',
    accentBg: '#FFE0C8',
    gradient: 'linear-gradient(135deg, #FFF8F0 0%, #FFEFD6 50%, #FFE4C4 100%)',
    pageBg: '#FFF8F0',
    cardShadow: 'rgba(255,140,90,0.08)',
    headerShadow: 'rgba(255,140,90,0.1)',
    tabShadow: 'rgba(255,140,90,0.06)',
    fabGradientFrom: '#FFD4B0',
    fabGradientTo: '#FF8C5A',
    fabShadow: 'rgba(255,140,90,0.35)',
  },
  {
    id: 'rose',
    name: '더스티 로즈',
    emoji: '*',
    primary: '#C87B8A',
    primaryLight: '#D4909E',
    primaryBg: '#FFF2F4',
    accent: '#A85C6C',
    accentBg: '#F0D0D6',
    gradient: 'linear-gradient(135deg, #FFF2F4 0%, #FFE8EC 50%, #FFD8E0 100%)',
    pageBg: '#FFF2F4',
    cardShadow: 'rgba(200,123,138,0.08)',
    headerShadow: 'rgba(200,123,138,0.1)',
    tabShadow: 'rgba(200,123,138,0.06)',
    fabGradientFrom: '#F0C4CC',
    fabGradientTo: '#C87B8A',
    fabShadow: 'rgba(200,123,138,0.35)',
  },
  {
    id: 'blue',
    name: '소프트 블루',
    emoji: '*',
    primary: '#6B9EC8',
    primaryLight: '#88B4D4',
    primaryBg: '#F0F5FA',
    accent: '#4A80B0',
    accentBg: '#D0E2F0',
    gradient: 'linear-gradient(135deg, #F0F5FA 0%, #E4EFF8 50%, #D4E6F4 100%)',
    pageBg: '#F0F5FA',
    cardShadow: 'rgba(107,158,200,0.08)',
    headerShadow: 'rgba(107,158,200,0.1)',
    tabShadow: 'rgba(107,158,200,0.06)',
    fabGradientFrom: '#B8D4E8',
    fabGradientTo: '#6B9EC8',
    fabShadow: 'rgba(107,158,200,0.35)',
  },
  {
    id: 'amber',
    name: '앰버 골드',
    emoji: '*',
    primary: '#C8A055',
    primaryLight: '#D4B470',
    primaryBg: '#FDF8EE',
    accent: '#A08040',
    accentBg: '#E8D8B8',
    gradient: 'linear-gradient(135deg, #FDF8EE 0%, #F8F0DA 50%, #F0E4C8 100%)',
    pageBg: '#FDF8EE',
    cardShadow: 'rgba(200,160,85,0.08)',
    headerShadow: 'rgba(200,160,85,0.1)',
    tabShadow: 'rgba(200,160,85,0.06)',
    fabGradientFrom: '#E8D4A8',
    fabGradientTo: '#C8A055',
    fabShadow: 'rgba(200,160,85,0.35)',
  },
  {
    id: 'sage',
    name: '세이지 민트',
    emoji: '*',
    primary: '#5EA88A',
    primaryLight: '#78BA9E',
    primaryBg: '#F0F8F4',
    accent: '#3D8A5A',
    accentBg: '#C8E8D4',
    gradient: 'linear-gradient(135deg, #F0F8F4 0%, #E0F5E9 50%, #D0EFE0 100%)',
    pageBg: '#F0F8F4',
    cardShadow: 'rgba(94,168,138,0.08)',
    headerShadow: 'rgba(94,168,138,0.1)',
    tabShadow: 'rgba(94,168,138,0.06)',
    fabGradientFrom: '#B8E0C8',
    fabGradientTo: '#5EA88A',
    fabShadow: 'rgba(94,168,138,0.35)',
  },
  {
    id: 'mint',
    name: '민트 그린',
    emoji: '*',
    primary: '#4DB8AC',
    primaryLight: '#6FCCC0',
    primaryBg: '#F0FAFB',
    accent: '#2D9B8F',
    accentBg: '#CCEEE9',
    gradient: 'linear-gradient(135deg, #F0FAFB 0%, #E0F5F3 50%, #D0EEE8 100%)',
    pageBg: '#F0FAFB',
    cardShadow: 'rgba(77,184,172,0.08)',
    headerShadow: 'rgba(77,184,172,0.1)',
    tabShadow: 'rgba(77,184,172,0.06)',
    fabGradientFrom: '#B8E8E0',
    fabGradientTo: '#4DB8AC',
    fabShadow: 'rgba(77,184,172,0.35)',
  },
]

export const DEFAULT_THEME_ID = 'coral'

export function getThemeById(id: string): ColorTheme {
  return COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0]
}

export function applyThemeToDOM(theme: ColorTheme) {
  const root = document.documentElement
  // 포인트 컬러
  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-primary-light', theme.primaryLight)
  root.style.setProperty('--color-primary-bg', theme.primaryBg)
  root.style.setProperty('--color-accent', theme.accent)
  root.style.setProperty('--color-accent-bg', theme.accentBg)
  root.style.setProperty('--dodam-gradient', theme.gradient)
  // Full Theme
  root.style.setProperty('--color-page-bg', theme.pageBg)
  root.style.setProperty('--color-card-shadow', theme.cardShadow)
  root.style.setProperty('--color-header-shadow', theme.headerShadow)
  root.style.setProperty('--color-tab-shadow', theme.tabShadow)
  root.style.setProperty('--color-fab-from', theme.fabGradientFrom)
  root.style.setProperty('--color-fab-to', theme.fabGradientTo)
  root.style.setProperty('--color-fab-shadow', theme.fabShadow)
}

// 모드별 테마 매핑 (임신 준비 / 임신 중 / 육아)
export const MODE_THEME_MAP: Record<string, string> = {
  preparing: 'peach',    // 피치오렌지 (임신 준비)
  pregnant: 'amber',     // 앰버 골드 (임신 중)
  parenting: 'sage',     // 세이지 민트 (육아)
}

// 모드에 따라 자동으로 테마 적용
export function applyModeTheme(mode: string) {
  const themeId = MODE_THEME_MAP[mode] || DEFAULT_THEME_ID
  const theme = getThemeById(themeId)
  applyThemeToDOM(theme)
  // 모드 테마는 localStorage에 저장하지 않음 (사용자 선택 테마와 분리)
}
