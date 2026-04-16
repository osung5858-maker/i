import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '아기 이름 짓기 · AI 작명',
  description: 'AI 이름 추천, 한자 분석, 음양오행 성명학, 이름 비교까지. 우리 아이 이름을 지어보세요.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
