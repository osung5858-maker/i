import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '운세 · 바이오리듬',
  description: '띠, 별자리, 오늘의 운세. 재미로 보는 육아 운세.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
