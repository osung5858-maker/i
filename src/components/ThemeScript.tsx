'use client'

import { useEffect } from 'react'

/**
 * 테마 플래시 방지 스크립트
 * localStorage에서 테마를 읽어 CSS 변수를 즉시 적용
 */
export default function ThemeScript() {
  useEffect(() => {
    // 클라이언트 사이드에서만 실행 (SSR 시 건너뜀)
    const themeMap = {
      coral: { p: '#E8937A', pl: '#F0A890', pb: '#FFF5F2', a: '#D07A62', ab: '#FFE0D4', bg: '#FFF5F2', ff: '#FFD4C4', ft: '#E8937A', fs: 'rgba(232,147,122,0.35)', cs: 'rgba(232,147,122,0.08)', hs: 'rgba(232,147,122,0.1)', ts: 'rgba(232,147,122,0.06)', g: 'linear-gradient(135deg,#FFF5F2 0%,#FFE8E0 50%,#FFD4C4 100%)' },
      lavender: { p: '#8B7EC8', pl: '#A498D4', pb: '#F5F3FA', a: '#6B5EAA', ab: '#E4DFF0', bg: '#F5F3FA', ff: '#D4C8F0', ft: '#8B7EC8', fs: 'rgba(139,126,200,0.35)', cs: 'rgba(139,126,200,0.08)', hs: 'rgba(139,126,200,0.1)', ts: 'rgba(139,126,200,0.06)', g: 'linear-gradient(135deg,#F5F3FA 0%,#EDE8F5 50%,#E0DAF0 100%)' },
      peach: { p: '#FF8C5A', pl: '#FFA070', pb: '#FFF8F0', a: '#2D6B4A', ab: '#FFE0C8', bg: '#FFF8F0', ff: '#FFD4B0', ft: '#FF8C5A', fs: 'rgba(255,140,90,0.35)', cs: 'rgba(255,140,90,0.08)', hs: 'rgba(255,140,90,0.1)', ts: 'rgba(255,140,90,0.06)', g: 'linear-gradient(135deg,#FFF8F0 0%,#FFEFD6 50%,#FFE4C4 100%)' },
      rose: { p: '#C87B8A', pl: '#D4909E', pb: '#FFF2F4', a: '#A85C6C', ab: '#F0D0D6', bg: '#FFF2F4', ff: '#F0C4CC', ft: '#C87B8A', fs: 'rgba(200,123,138,0.35)', cs: 'rgba(200,123,138,0.08)', hs: 'rgba(200,123,138,0.1)', ts: 'rgba(200,123,138,0.06)', g: 'linear-gradient(135deg,#FFF2F4 0%,#FFE8EC 50%,#FFD8E0 100%)' },
      blue: { p: '#6B9EC8', pl: '#88B4D4', pb: '#F0F5FA', a: '#4A80B0', ab: '#D0E2F0', bg: '#F0F5FA', ff: '#B8D4E8', ft: '#6B9EC8', fs: 'rgba(107,158,200,0.35)', cs: 'rgba(107,158,200,0.08)', hs: 'rgba(107,158,200,0.1)', ts: 'rgba(107,158,200,0.06)', g: 'linear-gradient(135deg,#F0F5FA 0%,#E4EFF8 50%,#D4E6F4 100%)' },
      amber: { p: '#C8A055', pl: '#D4B470', pb: '#FDF8EE', a: '#A08040', ab: '#E8D8B8', bg: '#FDF8EE', ff: '#E8D4A8', ft: '#C8A055', fs: 'rgba(200,160,85,0.35)', cs: 'rgba(200,160,85,0.08)', hs: 'rgba(200,160,85,0.1)', ts: 'rgba(200,160,85,0.06)', g: 'linear-gradient(135deg,#FDF8EE 0%,#F8F0DA 50%,#F0E4C8 100%)' },
      sage: { p: '#5EA88A', pl: '#78BA9E', pb: '#F0F8F4', a: '#3D8A5A', ab: '#C8E8D4', bg: '#F0F8F4', ff: '#B8E0C8', ft: '#5EA88A', fs: 'rgba(94,168,138,0.35)', cs: 'rgba(94,168,138,0.08)', hs: 'rgba(94,168,138,0.1)', ts: 'rgba(94,168,138,0.06)', g: 'linear-gradient(135deg,#F0F8F4 0%,#E0F5E9 50%,#D0EFE0 100%)' },
    }

    const themeId = localStorage.getItem('dodam_color_theme') || 'coral'
    const theme = (themeMap as any)[themeId] || themeMap.coral
    const root = document.documentElement

    root.style.setProperty('--color-primary', theme.p)
    root.style.setProperty('--color-primary-light', theme.pl)
    root.style.setProperty('--color-primary-bg', theme.pb)
    root.style.setProperty('--color-accent', theme.a)
    root.style.setProperty('--color-accent-bg', theme.ab)
    root.style.setProperty('--color-page-bg', theme.bg)
    root.style.setProperty('--color-fab-from', theme.ff)
    root.style.setProperty('--color-fab-to', theme.ft)
    root.style.setProperty('--color-fab-shadow', theme.fs)
    root.style.setProperty('--color-card-shadow', theme.cs)
    root.style.setProperty('--color-header-shadow', theme.hs)
    root.style.setProperty('--color-tab-shadow', theme.ts)
    root.style.setProperty('--dodam-gradient', theme.g)
  }, [])

  return null // 이 컴포넌트는 렌더링하지 않음
}
