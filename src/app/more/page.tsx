'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'

function Icon({ name, className = 'w-6 h-6' }: { name: string; className?: string }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const icons: Record<string, ReactNode> = {
    clipboard:   <svg className={className} viewBox="0 0 24 24" {...s}><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    landmark:    <svg className={className} viewBox="0 0 24 24" {...s}><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
    sparkles:    <svg className={className} viewBox="0 0 24 24" {...s}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 14l.7 2.1 2.3.9-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.9z"/></svg>,
    heart:       <svg className={className} viewBox="0 0 24 24" {...s}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    compass:     <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
    users:       <svg className={className} viewBox="0 0 24 24" {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    settings:    <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    baby:        <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="10"/><path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/></svg>,
    mail:        <svg className={className} viewBox="0 0 24 24" {...s}><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>,
    party:       <svg className={className} viewBox="0 0 24 24" {...s}><path d="M5.8 11.3L2 22l10.7-3.79M4 3h.01M22 8h.01M15 2h.01M22 20h.01"/><path d="M22 2l-2.24.75a2.9 2.9 0 00-1.96 3.12L18.1 8l-2.11-.55a2.9 2.9 0 00-3.16 1.47L12 10.5"/></svg>,
    siren:       <svg className={className} viewBox="0 0 24 24" {...s}><path d="M7 18v-6a5 5 0 0110 0v6M5 21h14M12 3v2M3.5 9.5l1.5 1M19 10.5l1.5-1"/></svg>,
    timer:       <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3L2 6M22 6l-3-3M10 2h4"/></svg>,
    moon:        <svg className={className} viewBox="0 0 24 24" {...s}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    syringe:     <svg className={className} viewBox="0 0 24 24" {...s}><path d="M18 2l4 4M7.5 20.5L2 22l1.5-5.5M15 4l5 5-11 11-5-5z"/></svg>,
    scan:        <svg className={className} viewBox="0 0 24 24" {...s}><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
    school:      <svg className={className} viewBox="0 0 24 24" {...s}><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>,
    chart:       <svg className={className} viewBox="0 0 24 24" {...s}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    puzzle:      <svg className={className} viewBox="0 0 24 24" {...s}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    volume:      <svg className={className} viewBox="0 0 24 24" {...s}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>,
    shield:      <svg className={className} viewBox="0 0 24 24" {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    camera:      <svg className={className} viewBox="0 0 24 24" {...s}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    utensils:    <svg className={className} viewBox="0 0 24 24" {...s}><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    star:        <svg className={className} viewBox="0 0 24 24" {...s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    guide:       <svg className={className} viewBox="0 0 24 24" {...s}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
    map:         <svg className={className} viewBox="0 0 24 24" {...s}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  }
  return <>{icons[name] || null}</>
}

interface GridItem {
  href: string
  icon: string
  iconBg?: string
  iconColor?: string
  title: string
  desc: string
  external?: boolean
  badge?: string
}

interface BannerItem {
  href: string
  icon: string
  title: string
  desc: string
  color: string
  textColor?: string
}

interface Section {
  label: string
  grid?: GridItem[]
  banner?: BannerItem
}

const SECTIONS: Record<string, Section[]> = {
  preparing: [
    { label: '', grid: [
      { href: '/name',         icon: 'sparkles', title: '태명·이름 짓기',   desc: 'AI 추천 · 음양오행' },
      { href: '/guide',        icon: 'guide',    title: '임신 준비 가이드', desc: '난임 Q&A · 생활습관' },
      { href: '/ovulation',    icon: 'timer',    iconBg: '#E8F5EF', iconColor: '#5BA882', title: '배란일 계산기', desc: '가임기 · 다음 생리 예측' },
      // { href: '/map',          icon: 'map',      iconBg: '#E8F4FD', iconColor: '#3B82F6', title: '병원 찾기', desc: '산부인과 · 난임병원' },
      { href: '/lullaby',      icon: 'moon',     iconBg: '#EEF2FF', iconColor: '#6366F1', title: '태교 음악', desc: '태아에게 들려주는 음악' },
      { href: '/mental-check', icon: 'heart',    iconBg: '#FFF0F3', iconColor: '#E8607A', title: '마음 체크', desc: '스트레스 자가검사' },
      { href: '/fortune',      icon: 'star',     iconBg: '#FFFBE6', iconColor: '#D4A017', title: '오늘의 운세', desc: '바이오리듬 · 별자리' },
    ]},
    { label: '', grid: [
      { href: 'https://www.gov.kr/portal/onestopSvc/Infertility', icon: 'landmark', title: '정부 지원 혜택', desc: '난임시술비 · 엽산', external: true },
    ]},
    { label: '', grid: [
      { href: '/settings', icon: 'settings', iconBg: '#F0EDE8', iconColor: '#6B6966', title: '설정', desc: '테마 · 계정 관리' },
    ]},
  ],
  pregnant: [
    { label: '', grid: [
      { href: '/name',         icon: 'sparkles', title: '이름 짓기',       desc: 'AI 추천 · 한자 · 오행' },
      // { href: '/map',          icon: 'map',      iconBg: '#E8F4FD', iconColor: '#3B82F6', title: '병원 찾기', desc: '산부인과 · 조리원' },
      { href: '/lullaby',      icon: 'moon',     iconBg: '#EEF2FF', iconColor: '#6366F1', title: '태교 음악', desc: '태아에게 들려주는 음악' },
      { href: '/babyfood',     icon: 'utensils', iconBg: '#E8F5EF', iconColor: '#5BA882', title: '이유식 예습', desc: '출산 전 미리 알아보기' },
      { href: '/birth-prep',   icon: 'clipboard', iconBg: '#FFF0E6', iconColor: '#E8937A', title: '출산 준비물', desc: '체크리스트 · 주차별 정리' },
      { href: '/mental-check', icon: 'heart',    iconBg: '#FFF0F3', iconColor: '#E8607A', title: '마음 체크', desc: '산후우울증 자가검사' },
      { href: '/fortune',      icon: 'star',     iconBg: '#FFFBE6', iconColor: '#D4A017', title: '오늘의 운세', desc: '바이오리듬 · 별자리' },
    ]},
    { label: '', grid: [
      { href: 'https://www.gov.kr/portal/onestopSvc/fertility', icon: 'landmark', title: '정부 지원 혜택', desc: '맘편한임신 통합신청', external: true },
    ]},
    { label: '', grid: [
      { href: '/settings', icon: 'settings', iconBg: '#F0EDE8', iconColor: '#6B6966', title: '설정', desc: '테마 · 계정 관리' },
    ]},
    { label: '', banner: { href: '/birth', icon: 'party', title: '우리 아이, 만났어요! 🎉', desc: '출산 완료 · 육아 모드로 전환', color: 'var(--color-primary)', textColor: '#fff' } },
  ],
  parenting: [
    { label: '', banner: { href: '/emergency', icon: 'siren', title: '🚨 응급 모드', desc: '소아과 · 어린이병원 · 응급실', color: '#FFF0F0', textColor: '#D05050' } },
    { label: '', grid: [
      { href: '/troubleshoot',  icon: 'sparkles', title: '육아 SOS',     desc: 'AI 증상 체크리스트' },
      { href: '/babyfood',      icon: 'utensils', title: '이유식 가이드', desc: '단계별 · 알레르기' },
      { href: '/vaccination',   icon: 'syringe',  title: '예방접종',      desc: '스케줄 · 완료 체크' },
      { href: '/lullaby',       icon: 'moon',     iconBg: '#EEF2FF', iconColor: '#6366F1', title: '자장가·동요', desc: '수면 도우미 125곡' },
      { href: '/milestone',     icon: 'baby',     title: '첫 순간들',     desc: '뒤집기 · 첫 걸음' },
      { href: '/growth/analyze',icon: 'scan',     title: '검진표 AI 분석', desc: '사진 찍으면 AI 해석' },
      { href: '/growth-sim',    icon: 'chart',    iconBg: '#E8F5EF', iconColor: '#5BA882', title: '성장 시뮬레이터', desc: '키·체중 성장 예측' },
      { href: '/temperament',   icon: 'puzzle',   iconBg: '#F3EDFF', iconColor: '#8B5CF6', title: '기질 검사',      desc: '우리 아이 성격 유형' },
      { href: '/cry',           icon: 'volume',   iconBg: '#FFF0E6', iconColor: '#E8937A', title: '울음 분석',      desc: '배고픔 · 졸림 · 불편' },
      { href: '/allergy',       icon: 'shield',   iconBg: '#FFF8E1', iconColor: '#F59E0B', title: '알레르기 체크',  desc: '식품별 반응 기록' },
      { href: '/timelapse',     icon: 'camera',   iconBg: '#F0F4FF', iconColor: '#3B82F6', title: '성장 타임랩스',  desc: '사진으로 보는 성장' },
    ]},
    { label: '', grid: [
      { href: '/gov-support', icon: 'landmark', title: '정부 지원 혜택', desc: '부모급여 · 아동수당' },
      { href: '/kidsnote',    icon: 'school',   title: '키즈노트',     desc: '알림장 · 사진 백업' },
    ]},
    { label: '', grid: [
      { href: '/fortune',      icon: 'star',  iconBg: '#FFFBE6', iconColor: '#D4A017', title: '오늘의 운세', desc: '바이오리듬 · 별자리' },
      { href: '/mental-check', icon: 'heart', iconBg: '#FFF0F3', iconColor: '#E8607A', title: '마음 체크',   desc: '산후우울증 (EPDS)' },
    ]},
    { label: '', grid: [
      { href: '/settings', icon: 'settings', iconBg: '#F0EDE8', iconColor: '#6B6966', title: '설정', desc: '테마 · 아이 관리' },
    ]},
  ],
}

export default function MorePage() {
  const [mode, setMode] = useState('parenting')

  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
  }, [])

  const sections = SECTIONS[mode] || SECTIONS.parenting

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      <div className="max-w-lg mx-auto w-full px-4 pt-4 pb-24 space-y-5">
        {sections.map((section, si) => (
          <div key={si}>
            {/* 섹션 라벨 */}
            {section.label && (
              <p className="text-body font-bold text-secondary mb-2 px-1">{section.label}</p>
            )}

            {/* 배너 (full-width) */}
            {section.banner && (() => {
              const b = section.banner!
              return (
                <Link href={b.href}
                  className="flex items-center gap-3 rounded-2xl px-5 py-4 shadow-sm active:opacity-80 transition-opacity"
                  style={{ background: b.color }}
                >
                  <div className="flex-1 min-w-0" style={{ color: b.textColor || '#1A1918' }}>
                    <p className="text-subtitle leading-tight">{b.title}</p>
                    <p className="text-body opacity-80 mt-0.5">{b.desc}</p>
                  </div>
                  <span className="text-heading-2" style={{ color: b.textColor || '#9E9A95' }}>→</span>
                </Link>
              )
            })()}

            {/* 그리드 */}
            {section.grid && section.grid.length > 0 && (
              <div className="flex flex-col shadow-sm">
                {section.grid.map((item, idx) => {
                  const Comp = item.external ? 'a' : Link
                  const props = item.external
                    ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                    : { href: item.href }
                  const isFirst = idx === 0
                  const isLast = idx === section.grid!.length - 1
                  const isSingle = section.grid!.length === 1

                  // 그룹별 라운딩: 첫 버튼 상단만, 중간 버튼 사각, 마지막 버튼 하단만
                  const roundingClass = isSingle
                    ? 'rounded-xl'
                    : isFirst
                      ? 'rounded-t-xl rounded-b-none'
                      : isLast
                        ? 'rounded-t-none rounded-b-xl'
                        : 'rounded-none'

                  return (
                    <Comp
                      key={item.href + item.title}
                      {...(props as any)}
                      className={`bg-white ${roundingClass} border border-[#E8E4DF] px-4 py-4 flex items-center gap-3 active:bg-[#FAFAF8] transition-all ${!isLast ? 'border-b-0' : ''}`}
                    >
                      {/* 아이콘 */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                        style={{
                          backgroundColor: item.iconBg || 'var(--color-page-bg)',
                          color: item.iconColor || 'var(--color-primary)'
                        }}
                      >
                        <Icon name={item.icon} className="w-5 h-5" />
                      </div>

                      {/* 텍스트 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-subtitle text-primary leading-snug mb-0.5 truncate">{item.title}</p>
                        <p className="text-body text-secondary leading-snug truncate">{item.desc}</p>
                      </div>

                      {/* 화살표 */}
                      <svg className="w-5 h-5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Comp>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
