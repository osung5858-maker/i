import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '동네 육아 지도',
  description: '내 주변 소아과, 키즈카페, 수유실, 놀이터, 약국을 한 눈에.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
