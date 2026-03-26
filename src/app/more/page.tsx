'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import AdSlot from '@/components/ads/AdSlot'

// Lucide-style inline SVG 아이콘
function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const icons: Record<string, ReactNode> = {
    clipboard: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    landmark: <svg className={className} viewBox="0 0 24 24" {...s}><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
    sparkles: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 14l.7 2.1 2.3.9-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.9z"/></svg>,
    heart: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    compass: <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
    users: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    settings: <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    baby: <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="10"/><path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/></svg>,
    mail: <svg className={className} viewBox="0 0 24 24" {...s}><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>,
    party: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M5.8 11.3L2 22l10.7-3.79M4 3h.01M22 8h.01M15 2h.01M22 20h.01"/><path d="M22 2l-2.24.75a2.9 2.9 0 00-1.96 3.12L18.1 8l-2.11-.55a2.9 2.9 0 00-3.16 1.47L12 10.5"/></svg>,
    video: <svg className={className} viewBox="0 0 24 24" {...s}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
    siren: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M7 18v-6a5 5 0 0110 0v6M5 21h14M12 3v2M3.5 9.5l1.5 1M19 10.5l1.5-1"/></svg>,
    timer: <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3L2 6M22 6l-3-3M10 2h4"/></svg>,
    moon: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    syringe: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M18 2l4 4M7.5 20.5L2 22l1.5-5.5M15 4l5 5-11 11-5-5z"/></svg>,
    scan: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
    school: <svg className={className} viewBox="0 0 24 24" {...s}><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>,
  }
  return <>{icons[name] || <span className="text-base">?</span>}</>
}

interface MenuItem {
  href: string; icon: string; iconColor?: string; title: string; desc: string; external?: boolean; highlight?: boolean
}

const MENUS: Record<string, { label: string; items: MenuItem[] }[]> = {
  preparing: [
    { label: '도구', items: [
      { href: '/name', icon: 'sparkles', title: '태명 · 이름 짓기', desc: 'AI 추천 · 음양오행 분석' },
      { href: '/guide', icon: 'clipboard', title: '임신 준비 가이드', desc: '난임 Q&A · 생활 습관 · 병원 안내' },
    ]},
    { label: '정보 · 혜택', items: [
      { href: 'https://www.gov.kr/portal/onestopSvc/Infertility', icon: 'landmark', title: '정부 지원 혜택', desc: '난임시술비 · 엽산 무료', external: true },
    ]},
    { label: '나', items: [
      { href: '/mental-check', icon: 'heart', title: '마음 체크', desc: '스트레스 자가검사' },
      { href: '/fortune', icon: 'compass', title: '오늘의 운세', desc: '바이오리듬 · 별자리' },
      { href: '/settings/caregivers/invite', icon: 'users', title: '배우자 초대', desc: '함께 준비해요' },
    ]},
    { label: '', items: [
      { href: '/settings', icon: 'settings', title: '설정', desc: '테마 · 계정 관리' },
    ]},
  ],
  pregnant: [
    { label: '도구', items: [
      { href: '/name', icon: 'sparkles', title: '이름 짓기', desc: 'AI 추천 · 한자 · 음양오행' },
    ]},
    { label: '정보 · 혜택', items: [
      { href: 'https://www.gov.kr/portal/onestopSvc/fertility', icon: 'landmark', title: '정부 지원 혜택', desc: '맘편한임신 통합신청', external: true },
    ]},
    { label: '나', items: [
      { href: '/mental-check', icon: 'heart', title: '마음 체크', desc: '산후우울증 자가검사' },
      { href: '/fortune', icon: 'compass', title: '오늘의 운세', desc: '바이오리듬 · 별자리' },
      { href: '/settings/caregivers/invite', icon: 'mail', title: '가족 초대', desc: '카카오톡으로 초대' },
    ]},
    { label: '', items: [
      { href: '/birth', icon: 'party', title: '우리 아이, 만났어요!', desc: '육아 모드로 전환', highlight: true },
      { href: '/settings', icon: 'settings', title: '설정', desc: '테마 · 계정 관리' },
    ]},
  ],
  parenting: [
    { label: '긴급', items: [
      { href: '/emergency', icon: 'siren', iconColor: '#D05050', title: '응급 모드', desc: '소아과 · 어린이병원 · 응급실', highlight: true },
      { href: '/troubleshoot', icon: 'sparkles', title: '이럴 땐 어떡하죠?', desc: 'AI 상황별 대응 가이드' },
    ]},
    { label: '도구', items: [
      { href: '/feed-timer', icon: 'timer', title: '수유 타이머', desc: '좌우 교대 · 시간 측정' },
      { href: '/babyfood', icon: 'clipboard', title: '이유식 가이드', desc: '단계별 식재료 · 알레르기' },
      { href: '/lullaby', icon: 'moon', title: '자장가 · 동요', desc: '수면 도우미 125곡' },
      { href: '/vaccination', icon: 'syringe', title: '예방접종', desc: '스케줄 · 부작용 · 완료 체크' },
      { href: '/growth/analyze', icon: 'scan', title: '검진표 AI 분석', desc: '사진 찍으면 AI가 해석' },
      { href: '/name', icon: 'sparkles', title: '이름 분석', desc: '음양오행 · 삼원수리' },
    ]},
    { label: '정보 · 혜택', items: [
      { href: '/gov-support', icon: 'landmark', title: '정부 지원 혜택', desc: '부모급여 · 아동수당 · 보육료' },
      { href: '/kidsnote', icon: 'school', title: '키즈노트', desc: '알림장 · 사진 백업' },
    ]},
    { label: '나', items: [
      { href: '/mental-check', icon: 'heart', title: '마음 체크', desc: '산후우울증 자가검사 (EPDS)' },
      { href: '/fortune', icon: 'compass', title: '오늘의 운세', desc: '바이오리듬 · 별자리' },
      { href: '/settings/caregivers/invite', icon: 'mail', title: '가족 초대', desc: '카카오톡으로 초대' },
    ]},
    { label: '', items: [
      { href: '/settings', icon: 'settings', title: '설정', desc: '테마 · 아이 관리 · 계정' },
    ]},
  ],
}

export default function MorePage() {
  const [mode, setMode] = useState('parenting')

  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
  }, [])

  const groups = MENUS[mode] || MENUS.parenting

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">
        {groups.map((group, gi) => (
          <div key={group.label || gi}>
            {/* 두 번째 그룹 뒤에 네이티브 광고 1개 */}
            {gi === 2 && <AdSlot provider="kakao" />}
            {group.items.length > 0 && (
              <>
                <div className="bg-white rounded-xl border border-[#D5D0CA] shadow-sm overflow-hidden">
                  {group.items.map((item, i) => {
                    const isExt = item.external
                    const Comp = isExt ? 'a' : Link
                    const props = isExt
                      ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                      : { href: item.href }
                    return (
                      <Comp
                        key={item.href + item.title}
                        {...(props as any)}
                        className={`flex items-center gap-3 px-4 py-3 active:bg-[var(--color-page-bg)] transition-colors ${
                          i > 0 ? 'border-t border-[#E8E4DF]' : ''
                        } ${item.highlight ? 'bg-[var(--color-primary-bg)]' : ''}`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          item.highlight ? 'bg-[var(--color-accent-bg)]' : 'bg-[var(--color-page-bg)]'
                        }`}>
                          <span style={{ color: item.iconColor || 'var(--color-primary)' }}>
                            <Icon name={item.icon} />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#1A1918]">{item.title}</p>
                          <p className="text-[12px] text-[#6B6966]">{item.desc}</p>
                        </div>
                        <span className="text-[#9E9A95] text-sm shrink-0">{isExt ? '↗' : '→'}</span>
                      </Comp>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
