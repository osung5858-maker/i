import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '아기 기질 분석',
  description: '수면·수유 패턴으로 알아보는 우리 아이 성격 유형',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
