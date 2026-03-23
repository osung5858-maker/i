'use client'

import Link from 'next/link'

const CHANNEL_URL = 'https://www.youtube.com/@todaydoha'

const SECTIONS = [
  {
    label: '수면 도우미',
    items: [
      {
        href: '/lullaby',
        icon: '🌙',
        bg: 'bg-[#E8E0F8]',
        title: '자장가',
        desc: 'Doha Sleep Series · 61곡',
        internal: true,
      },
      {
        href: '/lullaby',
        icon: '🎵',
        bg: 'bg-[#C8F0D8]',
        title: '동요',
        desc: 'DOHA SONG SERIES · 59곡',
        internal: true,
      },
      {
        href: '/lullaby',
        icon: '🌧️',
        bg: 'bg-[#E0F0F8]',
        title: '자연음',
        desc: '빗소리 · 파도 · 백색소음 · 심장소리',
        internal: true,
      },
    ],
  },
  {
    label: '육아 가이드',
    items: [
      {
        href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9dZ90gGtuco9wzMj_kdkUlMD',
        icon: '🍼',
        bg: 'bg-[#FEF0E8]',
        title: '수유 & 이유식 전략',
        desc: '0~6개월 수유 준비부터 이유식까지 · 12편',
        badge: '인기',
      },
      {
        href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA',
        icon: '🛡️',
        bg: 'bg-[#E0F0F8]',
        title: '아기 안전 세팅 가이드',
        desc: '집 안 안전 환경 만들기 · 22편',
      },
      {
        href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA',
        icon: '✏️',
        bg: 'bg-[#F5F5FA]',
        title: '0~4개월 발달 로드맵',
        desc: '월령별 발달 체크 · 17편',
      },
      {
        href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA',
        icon: '🏥',
        bg: 'bg-[#C8F0D8]',
        title: '출산 후 부모 생존 가이드',
        desc: '산후조리부터 육아 적응까지 · 38편',
        badge: '필수',
      },
    ],
  },
  {
    label: '긴급 & 콘텐츠',
    items: [
      {
        href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA',
        icon: '📞',
        bg: 'bg-[#FDE8E8]',
        title: '긴급 육아 마법 전화',
        desc: '말 안 들을 때 보여주는 영상 · 13편',
        badge: '꿀팁',
      },
{
        href: 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA',
        icon: '🎬',
        bg: 'bg-[#F0F0F0]',
        title: "Doha's 일상",
        desc: '도하의 소중한 하루하루 · 53편',
      },
    ],
  },
]

export default function CarePage() {
  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">케어</h1>
          <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] font-medium text-[#FF0000]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.8 1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.8-1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
            도하, 오늘도
          </a>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-28 space-y-5">
        {/* 채널 배너 */}
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-r from-[#3D8A5A] to-[#5B6DFF] rounded-2xl p-5 text-white active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-2xl">👶</span>
            </div>
            <div>
              <p className="text-[15px] font-bold">도하, 오늘도</p>
              <p className="text-[12px] text-white/80">도하의 소중한 하루를 기록하는 가족 채널</p>
              <p className="text-[11px] text-white/60 mt-0.5">구독자 176명 · 영상 280개</p>
            </div>
          </div>
        </a>

        {/* 섹션별 메뉴 */}
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[12px] font-semibold text-[#9C9B99] uppercase tracking-wide mb-2 px-1">{section.label}</p>
            <div className="bg-white rounded-2xl border border-[#f0f0f0] overflow-hidden">
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
                    className={`flex items-center gap-3.5 px-4 py-3.5 active:bg-[#F7F8FA] transition-colors ${
                      i > 0 ? 'border-t border-[#f0f0f0]' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                      <span className="text-lg">{item.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-[#1A1918]">{item.title}</p>
                        {'badge' in item && item.badge && (
                          <span className="px-1.5 py-0.5 bg-[#3D8A5A] text-white text-[9px] font-bold rounded-md">{item.badge}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9C9B99]">{item.desc}</p>
                    </div>
                    <span className="text-[#D1D0CD] text-sm shrink-0">{isExternal ? '↗' : '→'}</span>
                  </Wrapper>
                )
              })}
            </div>
          </div>
        ))}

        {/* 응급 안내 */}
        <div className="bg-[#FDE8E8] rounded-2xl p-4 border border-[#F5CDCD]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🚨</span>
            <span className="text-[13px] font-bold text-[#D08068]">응급 모드</span>
          </div>
          <p className="text-[12px] text-[#8B5E4E] leading-relaxed">
            아이가 아플 때, 핸드폰을 흔들면 가까운 소아과를 바로 찾아줘요.
          </p>
        </div>
      </div>
    </div>
  )
}
