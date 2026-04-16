import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '정부 지원 혜택',
  description: '부모급여, 아동수당, 첫만남이용권, 보육료 등 육아 정부 지원 혜택 총정리.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
