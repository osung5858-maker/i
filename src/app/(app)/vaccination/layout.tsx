import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '예방접종 스케줄 · 완료 체크',
  description: '0~6세 필수 예방접종 전체 스케줄. 부작용, 지연접종 정보 포함.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
