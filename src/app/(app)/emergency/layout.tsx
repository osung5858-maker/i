import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '응급 소아과 찾기',
  description: '현재 위치 기반 가까운 소아과, 응급실 찾기. 야간 진료, 응급 연락처.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
