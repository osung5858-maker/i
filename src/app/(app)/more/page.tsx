'use client'

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import Link from 'next/link'

/* ── SVG path 데이터 (모듈 스코프 — 렌더마다 재생성 안 함) ── */
const ICON_PATHS: Record<string, string> = {
  clipboard:   'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2|R8,2,8,4,1',
  landmark:    'L3,22,21,22|L6,18,6,11|L10,18,10,11|L14,18,14,11|L18,18,18,11|P12 2 20 7 4 7',
  sparkles:    'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z|M18 14l.7 2.1 2.3.9-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.9z',
  heart:       'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  compass:     'C12,12,10|P16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76',
  users:       'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|C9,7,4|M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  settings:    'C12,12,3|M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  baby:        'C12,12,10|M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5',
  party:       'M5.8 11.3L2 22l10.7-3.79M4 3h.01M22 8h.01M15 2h.01M22 20h.01|M22 2l-2.24.75a2.9 2.9 0 00-1.96 3.12L18.1 8l-2.11-.55a2.9 2.9 0 00-3.16 1.47L12 10.5',
  siren:       'M7 18v-6a5 5 0 0110 0v6M5 21h14M12 3v2M3.5 9.5l1.5 1M19 10.5l1.5-1',
  timer:       'C12,13,8|M12 9v4l2 2M5 3L2 6M22 6l-3-3M10 2h4',
  moon:        'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  syringe:     'M18 2l4 4M7.5 20.5L2 22l1.5-5.5M15 4l5 5-11 11-5-5z',
  scan:        'M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2|L7,12,17,12',
  school:      'M2 10l10-5 10 5-10 5z|M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
  chart:       'PL22 12 18 12 15 21 9 3 6 12 2 12',
  puzzle:      'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z|L7,7,7.01,7',
  volume:      'PG11 5 6 9 2 9 2 15 6 15 11 19 11 5|M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07',
  shield:      'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  camera:      'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z|C12,13,4',
  utensils:    'L12,2,12,22|M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  star:        'PG12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2',
  guide:       'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z|M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z',
  map:         'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z|C12,10,3',
}

/** 경량 아이콘 렌더러 — path 데이터를 SVG 엘리먼트로 변환 */
const Icon = memo(function Icon({ name, className = 'w-6 h-6' }: { name: string; className?: string }) {
  const data = ICON_PATHS[name]
  if (!data) return null

  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const parts = data.split('|')

  return (
    <svg className={className} viewBox="0 0 24 24" {...s}>
      {parts.map((p, i) => {
        if (p.startsWith('C')) { const [cx, cy, r] = p.slice(1).split(','); return <circle key={i} cx={cx} cy={cy} r={r} /> }
        if (p.startsWith('R')) { const [x, y, w, h, rx] = p.slice(1).split(','); return <rect key={i} x={x} y={y} width={w} height={h} rx={rx} /> }
        if (p.startsWith('L')) { const [x1, y1, x2, y2] = p.slice(1).split(','); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} /> }
        if (p.startsWith('PG')) return <polygon key={i} points={p.slice(2)} />
        if (p.startsWith('PL')) return <polyline key={i} points={p.slice(2)} />
        if (p.startsWith('P')) return <polygon key={i} points={p.slice(1)} />
        return <path key={i} d={p} />
      })}
    </svg>
  )
})

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
  icon?: string
  iconBg?: string
  iconColor?: string
  grid?: GridItem[]
  banner?: BannerItem
}

const SECTIONS: Record<string, Section[]> = {
  preparing: [
    { label: '준비 도우미', icon: 'guide', iconBg: '#FFF0E6', iconColor: '#E8937A', grid: [
      { href: '/name',         icon: 'sparkles', title: '태명·이름 짓기',   desc: 'AI 추천 · 음양오행' },
      { href: '/guide',        icon: 'guide',    title: '임신 준비 가이드', desc: '난임 Q&A · 생활습관' },
      { href: '/ovulation',    icon: 'timer',    iconBg: '#E8F5EF', iconColor: '#5BA882', title: '배란일 계산기', desc: '가임기 · 다음 생리 예측' },
      { href: '/lullaby',      icon: 'moon',     iconBg: '#EEF2FF', iconColor: '#6366F1', title: '태교 음악', desc: '태아에게 들려주는 음악' },
    ]},
    { label: '마음 챙김', icon: 'heart', iconBg: '#FFF0F3', iconColor: '#E8607A', grid: [
      { href: '/mental-check', icon: 'heart',    iconBg: '#FFF0F3', iconColor: '#E8607A', title: '마음 체크', desc: '스트레스 자가검사' },
      { href: '/fortune',      icon: 'star',     iconBg: '#FFFBE6', iconColor: '#D4A017', title: '오늘의 운세', desc: '바이오리듬 · 별자리' },
    ]},
    { label: '연동·지원', icon: 'landmark', iconBg: '#E8F4FD', iconColor: '#3B82F6', grid: [
      { href: 'https://www.gov.kr/portal/onestopSvc/Infertility', icon: 'landmark', title: '정부 지원 혜택', desc: '난임시술비 · 엽산', external: true },
      { href: '/settings', icon: 'settings', iconBg: '#F0EDE8', iconColor: '#6B6966', title: '설정', desc: '테마 · 알림 · 계정' },
    ]},
  ],
  pregnant: [
    { label: '출산 준비', icon: 'clipboard', iconBg: '#FFF0E6', iconColor: '#E8937A', grid: [
      { href: '/name',         icon: 'sparkles', title: '이름 짓기',       desc: 'AI 추천 · 한자 · 오행' },
      { href: '/birth-prep',   icon: 'clipboard', iconBg: '#FFF0E6', iconColor: '#E8937A', title: '출산 준비물', desc: '체크리스트 · 주차별 정리' },
      { href: '/babyfood',     icon: 'utensils', iconBg: '#E8F5EF', iconColor: '#5BA882', title: '이유식 예습', desc: '출산 전 미리 알아보기' },
      { href: '/lullaby',      icon: 'moon',     iconBg: '#EEF2FF', iconColor: '#6366F1', title: '태교 음악', desc: '태아에게 들려주는 음악' },
    ]},
    { label: '마음 챙김', icon: 'heart', iconBg: '#FFF0F3', iconColor: '#E8607A', grid: [
      { href: '/mental-check', icon: 'heart',    iconBg: '#FFF0F3', iconColor: '#E8607A', title: '마음 체크', desc: '산후우울증 자가검사' },
      { href: '/fortune',      icon: 'star',     iconBg: '#FFFBE6', iconColor: '#D4A017', title: '오늘의 운세', desc: '바이오리듬 · 별자리' },
    ]},
    { label: '연동·지원', icon: 'landmark', iconBg: '#E8F4FD', iconColor: '#3B82F6', grid: [
      { href: 'https://www.gov.kr/portal/onestopSvc/fertility', icon: 'landmark', title: '정부 지원 혜택', desc: '맘편한임신 통합신청', external: true },
      { href: '/settings', icon: 'settings', iconBg: '#F0EDE8', iconColor: '#6B6966', title: '설정', desc: '테마 · 알림 · 계정' },
    ]},
    { label: '', banner: { href: '/birth', icon: 'party', title: '우리 아이, 만났어요! 🎉', desc: '출산 완료 · 육아 모드로 전환', color: 'var(--color-primary)', textColor: '#fff' } },
  ],
  parenting: [
    { label: '', banner: { href: '/emergency', icon: 'siren', title: '🚨 응급 모드', desc: '소아과 · 어린이병원 · 응급실', color: '#FFF0F0', textColor: '#D05050' } },
    { label: '건강·의료', icon: 'syringe', iconBg: '#FFF0F0', iconColor: '#D05050', grid: [
      { href: '/troubleshoot',  icon: 'sparkles', title: '육아 SOS',     desc: 'AI 증상 체크리스트' },
      { href: '/vaccination',   icon: 'syringe',  title: '예방접종',      desc: '스케줄 · 완료 체크' },
      { href: '/allergy',       icon: 'shield',   iconBg: '#FFF8E1', iconColor: '#F59E0B', title: '알레르기 체크',  desc: '식품별 반응 기록' },
      { href: '/cry',           icon: 'volume',   iconBg: '#FFF0E6', iconColor: '#E8937A', title: '울음 분석',      desc: '배고픔 · 졸림 · 불편' },
    ]},
    { label: 'AI 분석', icon: 'sparkles', iconBg: '#F3EDFF', iconColor: '#8B5CF6', grid: [
      { href: '/growth/analyze',icon: 'scan',     title: '검진표 AI 분석', desc: '사진 찍으면 AI 해석' },
      { href: '/growth-sim',    icon: 'chart',    iconBg: '#E8F5EF', iconColor: '#5BA882', title: '성장 시뮬레이터', desc: '키·체중 성장 예측' },
      { href: '/temperament',   icon: 'puzzle',   iconBg: '#F3EDFF', iconColor: '#8B5CF6', title: '기질 검사',      desc: '우리 아이 성격 유형' },
    ]},
    { label: '육아 생활', icon: 'baby', iconBg: '#E8F5EF', iconColor: '#5BA882', grid: [
      { href: '/babyfood',      icon: 'utensils', title: '이유식 가이드', desc: '단계별 · 알레르기' },
      { href: '/lullaby',       icon: 'moon',     iconBg: '#EEF2FF', iconColor: '#6366F1', title: '자장가·동요', desc: '수면 도우미 125곡' },
      { href: '/milestone',     icon: 'baby',     title: '첫 순간들',     desc: '뒤집기 · 첫 걸음' },
      { href: '/timelapse',     icon: 'camera',   iconBg: '#F0F4FF', iconColor: '#3B82F6', title: '성장 타임랩스',  desc: '사진으로 보는 성장' },
    ]},
    { label: '연동·지원', icon: 'landmark', iconBg: '#E8F4FD', iconColor: '#3B82F6', grid: [
      { href: '/gov-support', icon: 'landmark', title: '정부 지원 혜택', desc: '부모급여 · 아동수당' },
      { href: '/kidsnote',    icon: 'school',   title: '키즈노트',     desc: '알림장 · 사진 백업' },
    ]},
    { label: '마음 챙김', icon: 'heart', iconBg: '#FFF0F3', iconColor: '#E8607A', grid: [
      { href: '/fortune',      icon: 'star',  iconBg: '#FFFBE6', iconColor: '#D4A017', title: '오늘의 운세', desc: '바이오리듬 · 별자리' },
      { href: '/mental-check', icon: 'heart', iconBg: '#FFF0F3', iconColor: '#E8607A', title: '마음 체크',   desc: '산후우울증 (EPDS)' },
    ]},
    { label: '가족', icon: 'users', iconBg: '#EEF2FF', iconColor: '#6366F1', grid: [
      { href: '/settings', icon: 'baby',  title: '아이 관리',   desc: '프로필 · 생일 · 월령' },
      { href: '/settings/caregivers', icon: 'users', iconBg: '#EEF2FF', iconColor: '#6366F1', title: '공동양육자', desc: '가족 초대 · 관리' },
      { href: '/settings', icon: 'settings', iconBg: '#F0EDE8', iconColor: '#6B6966', title: '앱 설정', desc: '테마 · 알림 · 계정' },
    ]},
  ],
}

export default function MorePage() {
  const [mode, setMode] = useState('parenting')
  const [openCategory, setOpenCategory] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
  }, [])

  const sections = SECTIONS[mode] || SECTIONS.parenting
  const categories = useMemo(() => sections.filter(s => s.label && s.grid), [sections])
  const banners = useMemo(() => sections.filter(s => s.banner), [sections])

  const selectedCategory = openCategory !== null ? categories[openCategory] : null

  // 2뎁스 진입 시 포커스 이동 + 슬라이드 애니메이션
  const openDetail = useCallback((idx: number) => {
    setOpenCategory(idx)
    setAnimating(true)
    requestAnimationFrame(() => {
      detailRef.current?.querySelector<HTMLButtonElement>('[aria-label="뒤로가기"]')?.focus()
      setTimeout(() => setAnimating(false), 200)
    })
  }, [])

  const closeDetail = useCallback(() => {
    setAnimating(true)
    setTimeout(() => {
      setOpenCategory(null)
      setAnimating(false)
    }, 150)
  }, [])

  // ESC 키로 2뎁스에서 1뎁스 복귀
  useEffect(() => {
    if (openCategory === null) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openCategory, closeDetail])

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      <div className="max-w-lg mx-auto w-full px-4 pt-4 pb-24">

        {/* ── 2뎁스: 카테고리 상세 ── */}
        {selectedCategory ? (
          <div
            ref={detailRef}
            className={animating ? 'animate-slide-in' : ''}
            role="region"
            aria-label={`${selectedCategory.label} 메뉴`}
          >
            {/* 공통 서브 헤더 (PageHeader와 동일 디자인) */}
            <header
              className="sticky z-30 top-[72px] -mx-4"
              style={{
                background: 'linear-gradient(180deg, var(--color-primary-bg) 0%, rgba(255,255,255,0.95) 100%)',
                borderBottom: '1px solid var(--color-border-light)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center h-14 px-4 max-w-lg mx-auto gap-3">
                <div className="w-9 shrink-0">
                  <button
                    onClick={closeDetail}
                    aria-label="뒤로가기"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors active:scale-95"
                    style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 min-w-0 text-center">
                  <p className="truncate" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                    {selectedCategory.label}
                  </p>
                </div>
                <div className="w-9 shrink-0" />
              </div>
            </header>

            <div className="h-4" />
            {/* 세부 메뉴 리스트 */}
            <div className="flex flex-col shadow-sm" role="list">
              {selectedCategory.grid!.map((item, idx) => {
                const Comp = item.external ? 'a' : Link
                const props = item.external
                  ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                  : { href: item.href }
                const isFirst = idx === 0
                const isLast = idx === selectedCategory.grid!.length - 1
                const isSingle = selectedCategory.grid!.length === 1
                const roundingClass = isSingle
                  ? 'rounded-xl'
                  : isFirst ? 'rounded-t-xl' : isLast ? 'rounded-b-xl' : ''

                return (
                  <Comp
                    key={item.href + item.title}
                    {...(props as any)}
                    role="listitem"
                    className={`bg-white ${roundingClass} border border-[#E8E4DF] px-4 py-4 flex items-center gap-3 active:bg-[#FAFAF8] transition-all ${!isLast ? 'border-b-0' : ''}`}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                      style={{
                        backgroundColor: item.iconBg || 'var(--color-page-bg)',
                        color: item.iconColor || 'var(--color-primary)'
                      }}
                    >
                      <Icon name={item.icon} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-subtitle text-primary leading-snug mb-0.5 truncate">{item.title}</p>
                      <p className="text-body text-secondary leading-snug truncate">{item.desc}</p>
                    </div>
                    <svg className="w-5 h-5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Comp>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── 1뎁스: 카테고리 그리드 ── */
          <div className="space-y-4">
            {/* 배너 */}
            {banners.map((section, si) => {
              const b = section.banner!
              return (
                <Link key={`banner-${si}`} href={b.href}
                  className="flex items-center gap-3 rounded-2xl px-5 py-4 shadow-sm active:opacity-80 transition-opacity"
                  style={{ background: b.color }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-subtitle leading-tight" style={{ color: b.textColor || '#1A1918' }}>{b.title}</p>
                    <p className="text-body mt-0.5" style={{ color: b.textColor || '#1A1918', opacity: 0.9 }}>{b.desc}</p>
                  </div>
                  <span className="text-heading-2" aria-hidden="true" style={{ color: b.textColor || '#9E9A95' }}>→</span>
                </Link>
              )
            })}

            {/* 카테고리 카드 그리드 (3열) */}
            <div className="grid grid-cols-3 gap-2.5" role="list" aria-label="카테고리 목록">
              {categories.map((cat, ci) => (
                <button
                  key={ci}
                  onClick={() => openDetail(ci)}
                  role="listitem"
                  className="bg-white rounded-2xl border border-[#E8E4DF] p-3.5 flex flex-col items-center gap-2 active:bg-[#FAFAF8] shadow-sm transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: cat.iconBg || 'var(--color-page-bg)',
                      color: cat.iconColor || 'var(--color-primary)'
                    }}
                  >
                    <Icon name={cat.icon || 'compass'} className="w-6 h-6" />
                  </div>
                  <p className="text-[13px] font-semibold text-primary leading-tight text-center">{cat.label}</p>
                </button>
              ))}
            </div>

          </div>
        )}
      </div>

      {/* 슬라이드 인 애니메이션 */}
      <style jsx>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.2s ease-out; }
        @media (prefers-reduced-motion: reduce) { .animate-slide-in { animation: none; } }
      `}</style>
    </div>
  )
}
