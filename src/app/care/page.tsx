'use client'

import Link from 'next/link'

const CHANNEL_URL = 'https://www.youtube.com/@todaydoha'
const PLAYLISTS = {
  lullaby: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA',
  nursery: 'https://www.youtube.com/playlist?list=PLAyG7B7am9dZ90gGtuco9wzMj_kdkUlMD',
  // 정확한 playlist ID는 채널에서 확인 후 업데이트
  channel: CHANNEL_URL + '/playlists',
}

const SECTIONS = [
  {
    label: '수면 도우미',
    items: [
      { href: '/lullaby', icon: '🌙', title: '자장가', desc: '61곡 · 앱 내 재생', internal: true },
      { href: '/lullaby', icon: '🎵', title: '동요', desc: '59곡 · 앱 내 재생', internal: true },
      { href: '/lullaby', icon: '🌧️', title: '자연음', desc: '빗소리 · 파도 · 백색소음', internal: true },
    ],
  },
  {
    label: '육아 가이드',
    items: [
      { href: CHANNEL_URL + '/playlists', icon: '🍼', title: '수유 & 이유식 전략', desc: '12편 · YouTube' },
      { href: CHANNEL_URL + '/playlists', icon: '🛡️', title: '아기 안전 세팅', desc: '22편 · YouTube' },
      { href: CHANNEL_URL + '/playlists', icon: '✏️', title: '0~4개월 발달 로드맵', desc: '17편 · YouTube' },
      { href: CHANNEL_URL + '/playlists', icon: '🏥', title: '출산 후 생존 가이드', desc: '38편 · YouTube' },
    ],
  },
  {
    label: '콘텐츠',
    items: [
      { href: CHANNEL_URL + '/playlists', icon: '📞', title: '긴급 육아 마법 전화', desc: '13편 · YouTube' },
      { href: CHANNEL_URL + '/videos', icon: '🎬', title: "Doha's 일상", desc: '53편 · YouTube' },
    ],
  },
]

export default function CarePage() {
  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">케어</h1>
          <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[#3D8A5A]">
            도하, 오늘도 →
          </a>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28 space-y-3">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[13px] font-semibold text-[#868B94] mb-2">{section.label}</p>
            <div className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
              {section.items.map((item, i) => {
                const isInternal = 'internal' in item
                const Comp = isInternal ? Link : 'a'
                const props = isInternal
                  ? { href: item.href }
                  : { href: item.href, target: '_blank', rel: 'noopener noreferrer' }

                return (
                  <Comp
                    key={item.title}
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
                    <span className="text-[#AEB1B9] text-sm shrink-0">{isInternal ? '→' : '↗'}</span>
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
