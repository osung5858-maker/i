'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// IA 구조 확정안 기반 모드별 메뉴
const MENUS: Record<string, { label: string; items: { href: string; icon: string; title: string; desc: string; external?: boolean; highlight?: boolean }[] }[]> = {
  preparing: [
    {
      label: '정보',
      items: [
        { href: '/waiting', icon: '📋', title: '임신 준비 가이드', desc: '주기 추적 · 체크리스트 · 정부지원' },
        { href: 'https://www.gov.kr/portal/onestopSvc/Infertility', icon: '🏛️', title: '정부 지원 제도', desc: '난임시술비 · 엽산 무료 등', external: true },
      ],
    },
    {
      label: '도구',
      items: [
        { href: '/name', icon: '✨', title: '태명 · 이름 짓기', desc: 'AI 추천 · 음양오행 분석' },
      ],
    },
    {
      label: '마음',
      items: [
        { href: '/mental-check', icon: '🧘', title: '마음 체크', desc: '스트레스 자가검사 (EPDS)' },
        { href: '/fortune', icon: '🔮', title: '운세 · 바이오리듬', desc: '띠 · 별자리 · 오늘의 운세' },
      ],
    },
    {
      label: '함께 · 설정',
      items: [
        { href: '/settings/caregivers/invite', icon: '💑', title: '배우자 초대', desc: '카카오톡으로 함께 준비해요' },
        { href: '/settings', icon: '⚙️', title: '내 계정 · 설정', desc: '프로필 · 알림' },
      ],
    },
  ],
  pregnant: [
    {
      label: '정보',
      items: [
        { href: '/pregnant', icon: '🍐', title: '주차별 발달 가이드', desc: '태아 크기 · 발달 · 검진 일정' },
        { href: 'https://www.gov.kr/portal/onestopSvc/fertility', icon: '🏛️', title: '정부 지원 · 혜택', desc: '맘편한임신 통합신청', external: true },
      ],
    },
    {
      label: '도구',
      items: [
        { href: '/name', icon: '✨', title: '이름 짓기', desc: 'AI 추천 · 음양오행 · 점수' },
      ],
    },
    {
      label: '마음',
      items: [
        { href: '/mental-check', icon: '💚', title: '마음 체크', desc: '산후우울증 자가검사 (EPDS)' },
        { href: '/fortune', icon: '🔮', title: '운세 · 바이오리듬', desc: '띠 · 별자리 · 오늘의 운세' },
      ],
    },
    {
      label: '함께 · 설정',
      items: [
        { href: '/settings/caregivers/invite', icon: '💌', title: '가족 초대', desc: '카카오톡으로 초대' },
        { href: '/birth', icon: '🎉', title: '출산했어요!', desc: '축하 → 육아 모드 전환', highlight: true },
        { href: '/settings', icon: '⚙️', title: '내 계정 · 설정', desc: '프로필 · 알림' },
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
      label: '긴급',
      items: [
        { href: '/emergency', icon: '🚨', title: '응급 소아과', desc: '지금 영업 중인 가까운 소아과', highlight: true },
      ],
    },
    {
      label: '돌봄 도구',
      items: [
        { href: '/feed-timer', icon: '🤱', title: '수유 타이머', desc: '좌/우 교대 · 시간 측정' },
        { href: '/lullaby', icon: '🌙', title: '자장가 · 동요', desc: '수면 도우미 · 125곡' },
        { href: '/vaccination', icon: '💉', title: '예방접종', desc: '전체 스케줄 · 완료 체크' },
        { href: '/growth/analyze', icon: '📄', title: '검진표 AI 분석', desc: '영유아검진 결과표 → AI 분석' },
      ],
    },
    {
      label: '연동',
      items: [
        { href: '/kidsnote', icon: '🏫', title: '키즈노트', desc: '어린이집 알림장 · 사진 백업' },
      ],
    },
    {
      label: '마음',
      items: [
        { href: '/mental-check', icon: '💚', title: '마음 체크', desc: '산후우울증 자가검사 (EPDS)' },
        { href: '/fortune', icon: '🔮', title: '운세 · 바이오리듬', desc: '띠 · 별자리 · 오늘의 운세' },
      ],
    },
    {
      label: '가족 · 설정',
      items: [
        { href: '/settings/caregivers', icon: '👥', title: '동반양육자', desc: '기록 공유 · 함께 돌봄' },
        { href: '/settings/caregivers/invite', icon: '💌', title: '가족 초대', desc: '카카오톡으로 초대' },
        { href: '/settings', icon: '⚙️', title: '내 계정 · 설정', desc: '프로필 · 아이 관리 · 알림' },
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

export default function MorePage() {
  const [mode, setMode] = useState('parenting')

  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
  }, [])

  const groups = MENUS[mode] || MENUS.parenting

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5]">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-[#E8E4DF]/60">
        <div className="flex items-center h-14 px-5 max-w-lg mx-auto w-full">
          <h1 className="text-[17px] font-bold text-[#1A1918]">우리</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            {group.items.length > 0 && (
              <>
                <p className="text-[12px] font-semibold text-[#9E9A95] mb-2 uppercase tracking-wider">{group.label}</p>
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
                        className={`flex items-center gap-3 px-4 py-3 active:bg-[#FFF9F5] transition-colors ${
                          i > 0 ? 'border-t border-[#E8E4DF]' : ''
                        } ${item.highlight ? 'bg-[#FFF0E6]' : ''}`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          item.highlight ? 'bg-[#D08068]/10' : 'bg-[#FFF9F5]'
                        }`}>
                          <span className="text-base">{item.icon}</span>
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
