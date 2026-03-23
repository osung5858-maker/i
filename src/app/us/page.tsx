'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// 모드별 메뉴 구성
const MENUS: Record<string, { label: string; items: { href: string; icon: string; title: string; desc: string; external?: boolean }[] }[]> = {
  preparing: [
    {
      label: '건강',
      items: [
        { href: '/health', icon: '💚', title: '내 건강', desc: '수면 · 스트레스 · 걸음수 · 체중' },
      ],
    },
    {
      label: '파트너',
      items: [
        { href: '/settings/caregivers/invite', icon: '💑', title: '파트너 초대하기', desc: '카카오톡으로 초대 · 함께 준비해요' },
        { href: '/settings/caregivers', icon: '💌', title: '응원 메시지', desc: '서로 격려 · 준비 과정 공유' },
      ],
    },
    {
      label: '함께 준비',
      items: [
        { href: '/preparing', icon: '📋', title: '함께 볼 체크리스트', desc: '검사 · 준비물 · 생활습관' },
        { href: '/map', icon: '🏥', title: '산부인과 찾기', desc: '근처 산부인과 · 난임 클리닉' },
      ],
    },
    {
      label: '설정',
      items: [
        { href: '/settings', icon: '⚙️', title: '설정', desc: '알림 · 계정' },
      ],
    },
    {
      label: '콘텐츠',
      items: [
        { href: 'https://www.youtube.com/@todaydoha', icon: '🎬', title: '도하, 오늘도', desc: '육아 가이드 · 유튜브 채널', external: true },
      ],
    },
  ],
  pregnant: [
    {
      label: '건강',
      items: [
        { href: '/health', icon: '💚', title: '내 건강', desc: '수면 · 체중 · 스트레스 · 걸음수' },
      ],
    },
    {
      label: '가족',
      items: [
        { href: '/settings/caregivers', icon: '👥', title: '공동양육자', desc: '가족 초대 · 기록 공유' },
        { href: '/settings/caregivers/invite', icon: '💌', title: '가족 초대하기', desc: '카카오톡으로 초대 링크 보내기' },
      ],
    },
    {
      label: '동네',
      items: [
        { href: '/map', icon: '🏥', title: '산부인과 · 소아과', desc: '동네 의료 시설 찾기' },
      ],
    },
    {
      label: '설정',
      items: [
        { href: '/settings', icon: '⚙️', title: '설정', desc: '알림 · 계정' },
      ],
    },
    {
      label: '콘텐츠',
      items: [
        { href: 'https://www.youtube.com/@todaydoha', icon: '🎬', title: '도하, 오늘도', desc: '육아 가이드 · 유튜브 채널', external: true },
      ],
    },
  ],
  parenting: [
    {
      label: '건강',
      items: [
        { href: '/health', icon: '💚', title: '내 건강', desc: '수면 · 스트레스 · AI 건강 케어' },
      ],
    },
    {
      label: '케어',
      items: [
        { href: '/lullaby', icon: '🌙', title: '자장가 · 동요', desc: '수면 도우미 · 120곡+' },
        { href: '/memory', icon: '📋', title: '발달 체크리스트', desc: '월령별 발달 확인 · AI 분석' },
      ],
    },
    {
      label: '가족',
      items: [
        { href: '/settings/caregivers', icon: '👥', title: '공동양육자', desc: '가족 초대 · 기록 공유' },
        { href: '/settings/caregivers/invite', icon: '💌', title: '가족 초대하기', desc: '카카오톡으로 초대 링크 보내기' },
      ],
    },
    {
      label: '동네',
      items: [
        { href: '/map', icon: '🗺️', title: '동네 육아 지도', desc: '소아과 · 키즈카페 · 문화센터' },
        { href: '/emergency', icon: '🚨', title: '응급 소아과 찾기', desc: '지금 영업 중인 가까운 소아과' },
      ],
    },
    {
      label: '설정',
      items: [
        { href: '/settings', icon: '⚙️', title: '설정', desc: '알림 · 계정 · 다크 모드' },
        { href: '/settings/children', icon: '👶', title: '아기 프로필', desc: '이름 · 생일 · 특이사항 관리' },
      ],
    },
    {
      label: '콘텐츠',
      items: [
        { href: 'https://www.youtube.com/@todaydoha', icon: '🎬', title: '도하, 오늘도', desc: '육아 가이드 · 유튜브 채널', external: true },
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
