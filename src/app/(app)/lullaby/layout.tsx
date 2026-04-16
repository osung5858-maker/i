import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '자장가 · 동요 · 수면 음악',
  description: '아기 자장가 58곡, 동요 57곡. AI 수면 추천으로 아이의 잠든 시간을 늘려보세요.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
