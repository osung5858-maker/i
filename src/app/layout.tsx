import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import BottomNav from '@/components/bnb/BottomNav'
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt'
import KakaoSDK from '@/components/ui/KakaoSDK'
import DarkModeProvider from '@/components/ui/DarkModeProvider'
import DevResetButton from '@/components/ui/DevResetButton'

export const metadata: Metadata = {
  title: '도담 - 오늘도 도담하게',
  description:
    '아이의 하루 리듬을 이해하고, 동네 육아 인프라까지 연결해주는 AI 케어 파트너',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '도담',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4A90D9',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-[#E8E4DF] flex justify-center">
        <div className="w-full max-w-[430px] min-h-full bg-[#FFF9F5] flex flex-col relative shadow-[0_0_40px_rgba(0,0,0,0.08)]">
          <Script
            src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=services`}
            strategy="beforeInteractive"
          />
          <KakaoSDK />
          <DarkModeProvider />
          <main className="flex-1 pb-20">{children}</main>
          <BottomNav />
          <PWAInstallPrompt />
          <DevResetButton />
          <Analytics />
        </div>
      </body>
    </html>
  )
}
