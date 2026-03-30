import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '육아 SOS',
  description: '아이가 울어요, 열이 나요, 먹지 않아요 — AI가 체크리스트와 대응 방법을 알려드려요.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
