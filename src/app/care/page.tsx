'use client'

import Link from 'next/link'

const CHANNEL_URL = 'https://www.youtube.com/@todaydoha'

const SECTIONS = [
  {
    label: '수면 도우미',
    items: [
      { href: '/lullaby', icon: '🌙', title: '자장가', desc: 'Doha Sleep Series · 61곡', internal: true },
      { href: '/lullaby', icon: '🎵', title: '동요', desc: 'DOHA SONG SERIES · 59곡', internal: true },
      { href: '/lullaby', icon: '🌧️', title: '자연음', desc: '빗소리 · 파도 · 백색소음 · 심장소리', internal: true },
    ],
  },
  {
    label: '육아 가이드',
    items: [
      { href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9dZ90gGtuco9wzMj_kdkUlMD', icon: '🍼', title: '수유 & 이유식 전략', desc: '0~6개월 수유 준비부터 이유식까지 · 12편' },
      { href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA', icon: '🛡️', title: '아기 안전 세팅 가이드', desc: '집 안 안전 환경 만들기 · 22편' },
      { href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA', icon: '✏️', title: '0~4개월 발달 로드맵', desc: '월령별 발달 체크 · 17편' },
      { href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA', icon: '🏥', title: '출산 후 부모 생존 가이드', desc: '산후조리부터 육아 적응까지 · 38편' },
    ],
  },
  {
    label: '콘텐츠',
    items: [
      { href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA', icon: '📞', title: '긴급 육아 마법 전화', desc: '말 안 들을 때 보여주는 영상 · 13편' },
      { href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA', icon: '🎬', title: "Doha's 일상", desc: '도하의 소중한 하루하루 · 53편' },
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
                const isExternal = !('internal' in item)
                const Wrapper = isExternal ? 'a' : Link
                const wrapperProps = isExternal
                  ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                  : { href: item.href }

                return (
                  <Wrapper
                    key={item.title}
                    {...(wrapperProps as any)}
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
                    <span className="text-[#AEB1B9] text-sm shrink-0">{isExternal ? '↗' : '→'}</span>
                  </Wrapper>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
