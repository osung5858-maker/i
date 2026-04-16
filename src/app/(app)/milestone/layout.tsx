import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '첫 순간들 — 마일스톤 기록',
  description: '아이의 첫 미소, 첫 뒤집기, 첫 걸음 등 소중한 순간을 기록하세요.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
