import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '울음 번역기',
  description: '울음 소리로 아이 마음 읽기',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
