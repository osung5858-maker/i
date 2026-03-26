import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '도담 · AI 육아 파트너 | 임신 준비부터 육아까지',
  description:
    'AI가 아이의 수유·수면 리듬을 분석하고, 이유식 추천부터 발달 체크·동네 소아과까지 연결해주는 스마트 육아 파트너. 임신 준비부터 출산, 육아까지 한 앱으로.',
  openGraph: {
    title: '도담 · AI 육아 파트너 | 임신 준비부터 육아까지',
    description: 'AI가 아이의 수유·수면 리듬을 분석하고, 이유식 추천부터 발달 체크·동네 소아과까지 연결해주는 스마트 육아 파트너.',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-y-auto bg-white"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
      }}
    >
      {children}
    </div>
  )
}
