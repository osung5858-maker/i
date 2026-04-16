import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이유식 가이드',
  description: '월령별 이유식 단계 가이드. 초기~완료기 추천 식재료, 알레르기 주의사항, 진행 신호까지.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
