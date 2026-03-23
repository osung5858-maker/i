'use client'

import Link from 'next/link'

const MENU_GROUPS = [
  {
    label: '커뮤니티',
    items: [
      { href: '/community', icon: '💬', title: '같은 달 맘', desc: '같은 월령 부모들과 소통해요' },
      { href: '/community', icon: '📍', title: '우리 동네', desc: '동네 부모들의 이야기' },
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
]

export default function UsPage() {
  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">우리</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28 space-y-3">
        {MENU_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[13px] font-semibold text-[#868B94] mb-2">{group.label}</p>
            <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
              {group.items.map((item, i) => (
                <Link
                  key={item.href + item.title}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 active:bg-[#F5F4F1] transition-colors ${
                    i > 0 ? 'border-t border-[#f0f0f0]' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#F5F4F1] flex items-center justify-center shrink-0">
                    <span className="text-base">{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-[#1A1918]">{item.title}</p>
                    <p className="text-[11px] text-[#868B94]">{item.desc}</p>
                  </div>
                  <span className="text-[#AEB1B9] text-sm">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
