import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '산후우울증 자가검사 (EPDS)',
  description: '에든버러 산후우울증 척도로 정서 상태를 확인하세요. 10문항, 5분 소요.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
