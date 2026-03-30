import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '성장 예측',
  description: 'AI가 알려주는 우리 아이 미래 모습',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
