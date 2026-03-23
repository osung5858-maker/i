'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// 모드별 메뉴 구성
const MENUS: Record<string, { label: string; items: { href: string; icon: string; title: string; desc: string; external?: boolean }[] }[]> = {
  preparing: [
    {
      label: '나',
      items: [
        { href: '/health', icon: '💚', title: '내 건강', desc: 'Google Fit · 수면 · 걸음수 · 심박' },
      ],
    },
    {
      label: '둘이서',
      items: [
        { href: '/settings/caregivers/invite', icon: '💑', title: '파트너 초대', desc: '카카오톡으로 함께 준비해요' },
        { href: '/mental-check', icon: '💚', title: '마음 체크', desc: '스트레스 자가검사 · 감정 돌봄' },
        { href: 'https://www.youtube.com/results?search_query=커플요가+임신준비', icon: '🧘', title: '커플 요가', desc: '둘이 함께하는 스트레칭', external: true },
        { href: 'https://www.youtube.com/results?search_query=임신준비+부부+소통', icon: '💬', title: '부부 소통 가이드', desc: '임신 준비 대화법', external: true },
      ],
    },
    {
      label: '설정',
      items: [
        { href: '/settings', icon: '⚙️', title: '설정', desc: '알림 · 계정' },
      ],
    },
    {
      label: '즐겨보기',
      items: [
        { href: 'https://www.youtube.com/@todaydoha', icon: '🎬', title: '도하, 오늘도', desc: '육아 가이드 유튜브', external: true },
      ],
    },
  ],
  pregnant: [
    {
      label: '나',
      items: [
        { href: '/health', icon: '💚', title: '내 건강', desc: 'Google Fit · 수면 · 걸음수 · 심박' },
      ],
    },
    {
      label: '둘이서',
      items: [
        { href: '/settings/caregivers/invite', icon: '💌', title: '가족 초대', desc: '카카오톡으로 초대' },
        { href: '/name', icon: '✨', title: '이름 짓기', desc: 'AI 추천 · 음양오행 · 점수' },
        { href: '/birth', icon: '🎉', title: '출산했어요!', desc: '축하 → 육아 모드 전환' },
      ],
    },
    {
      label: '마음',
      items: [
        { href: '/mental-check', icon: '💚', title: '마음 체크', desc: '산후우울증 자가검사 (EPDS)' },
      ],
    },
    {
      label: '설정',
      items: [
        { href: '/settings', icon: '⚙️', title: '설정', desc: '알림 · 계정' },
      ],
    },
    {
      label: '즐겨보기',
      items: [
        { href: 'https://www.youtube.com/@todaydoha', icon: '🎬', title: '도하, 오늘도', desc: '육아 가이드 유튜브', external: true },
      ],
    },
  ],
  parenting: [
    {
      label: '나',
      items: [
        { href: '/health', icon: '💚', title: '내 건강', desc: 'Google Fit · 수면 · 걸음수 · 심박' },
      ],
    },
    {
      label: '돌봄',
      items: [
        { href: '/feed-timer', icon: '🤱', title: '수유 타이머', desc: '좌/우 교대 · 시간 측정' },
        { href: '/lullaby', icon: '🌙', title: '자장가 · 동요', desc: '수면 도우미 · 120곡+' },
        { href: '/vaccination', icon: '💉', title: '예방접종', desc: '전체 스케줄 · 완료 체크' },
        { href: '/memory', icon: '📋', title: '발달 체크', desc: '월령별 발달 · AI 분석' },
      ],
    },
    {
      label: '마음',
      items: [
        { href: '/mental-check', icon: '💚', title: '마음 체크', desc: '산후우울증 자가검사 (EPDS)' },
      ],
    },
    {
      label: '함께',
      items: [
        { href: '/settings/caregivers', icon: '👥', title: '동반양육자', desc: '기록 공유 · 함께 돌봄' },
        { href: '/settings/caregivers/invite', icon: '💌', title: '가족 초대', desc: '카카오톡으로 초대' },
      ],
    },
    {
      label: '긴급',
      items: [
        { href: '/emergency', icon: '🚨', title: '응급 소아과', desc: '지금 영업 중인 가까운 소아과' },
      ],
    },
    {
      label: '설정',
      items: [
        { href: '/settings', icon: '⚙️', title: '설정', desc: '알림 · 계정 · 다크 모드' },
        { href: '/settings/children', icon: '👶', title: '아이 프로필', desc: '이름 · 생일 · 특이사항' },
      ],
    },
    {
      label: '즐겨보기',
      items: [
        { href: 'https://www.youtube.com/@todaydoha', icon: '🎬', title: '도하, 오늘도', desc: '육아 가이드 유튜브', external: true },
      ],
    },
  ],
}

export default function UsPage() {
  const [mode, setMode] = useState('parenting')

  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
  }, [])

  const groups = MENUS[mode] || MENUS.parenting

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">우리</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28 space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[13px] font-semibold text-[#868B94] mb-2">{group.label}</p>
            <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
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
                    className={`flex items-center gap-3 px-4 py-3 active:bg-[#F5F4F1] transition-colors ${
                      i > 0 ? 'border-t border-[#f0f0f0]' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#F5F4F1] flex items-center justify-center shrink-0">
                      <span className="text-base">{item.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-[#1A1918]">{item.title}</p>
                      <p className="text-[11px] text-[#868B94]">{item.desc}</p>
                    </div>
                    <span className="text-[#AEB1B9] text-sm">{isExt ? '↗' : '→'}</span>
                  </Comp>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
