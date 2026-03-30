import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '알레르기 트래커',
  description: '새 식재료 도입 시 3일간 알레르기 반응을 관찰하고 기록하는 트래커입니다.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
