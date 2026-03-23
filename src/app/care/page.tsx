'use client'

import Link from 'next/link'

export default function CarePage() {
  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">케어</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28 space-y-3">
        {/* 수면 도우미 */}
        <p className="text-[13px] font-semibold text-[#868B94] mb-1">수면 도우미</p>
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          {[
            { href: '/lullaby', icon: '🌙', title: '자장가', desc: '61곡 · 앱 내 재생' },
            { href: '/lullaby', icon: '🎵', title: '동요', desc: '59곡 · 앱 내 재생' },
            { href: '/lullaby', icon: '🌧️', title: '자연음', desc: '빗소리 · 파도 · 백색소음' },
          ].map((item, i) => (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 active:bg-[#F5F4F1] ${i > 0 ? 'border-t border-[#f0f0f0]' : ''}`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#F5F4F1] flex items-center justify-center shrink-0">
                <span className="text-base">{item.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#1A1918]">{item.title}</p>
                <p className="text-[11px] text-[#868B94]">{item.desc}</p>
              </div>
              <span className="text-[#AEB1B9] text-sm">→</span>
            </Link>
          ))}
        </div>

        {/* 건강 */}
        <p className="text-[13px] font-semibold text-[#868B94] mb-1 pt-1">건강</p>
        <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
          <Link href="/memory" className="flex items-center gap-3 px-4 py-3 active:bg-[#F5F4F1]">
            <div className="w-9 h-9 rounded-xl bg-[#F5F4F1] flex items-center justify-center shrink-0">
              <span className="text-base">📋</span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[#1A1918]">발달 체크리스트</p>
              <p className="text-[11px] text-[#868B94]">월령별 발달 확인 · AI 분석</p>
            </div>
            <span className="text-[#AEB1B9] text-sm">→</span>
          </Link>
          <div className="border-t border-[#f0f0f0]">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-[#F5F4F1] flex items-center justify-center shrink-0">
                <span className="text-base">🚨</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#1A1918]">응급 모드</p>
                <p className="text-[11px] text-[#868B94]">핸드폰 흔들면 가까운 소아과 검색</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
