import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import BottomNav from '@/components/bnb/BottomNav'
import GlobalHeader from '@/components/layout/GlobalHeader'
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt'
import KakaoSDK from '@/components/ui/KakaoSDK'
import DevResetButton from '@/components/ui/DevResetButton'
import GlobalToast from '@/components/ui/GlobalToast'
import ScrollToTop from '@/components/ui/ScrollToTop'
import NavSpacer from '@/components/ui/NavSpacer'
import ThemeInitializer from '@/components/ThemeInitializer'
import ThemeScript from '@/components/ThemeScript'
import SplashProvider from '@/components/SplashProvider'
import SecurityMigrator from '@/components/SecurityMigrator'

export const metadata: Metadata = {
  metadataBase: new URL('https://dodam.life'),
  title: {
    default: '도담 · AI 육아 파트너',
    template: '%s | 도담',
  },
  description: 'AI가 아이의 수유·수면 리듬을 분석하고, 이유식 추천부터 발달 체크·동네 소아과까지 연결해주는 스마트 육아 파트너 앱. 임신 준비부터 출산, 육아까지 한 앱으로.',
  keywords: [
    '육아 앱', '아기 수유 기록', '수면 기록', 'AI 육아', '이유식 추천',
    '임신 앱', '출산 준비', '태교', '신생아 관리', '아기 성장 기록',
    '소아과 찾기', '예방접종 스케줄', '산후우울증 자가검사',
    '부모급여', '첫만남이용권', '국민행복카드',
    '도담', 'dodam', '육아 일기', '아기 발달 체크',
  ],
  authors: [{ name: '도담', url: 'https://dodam.life' }],
  creator: '도담',
  publisher: '도담',
  category: 'health',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '도담',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://dodam.life',
    siteName: '도담 · AI 육아 파트너',
    title: '도담 · AI 육아 파트너',
    description: 'AI가 아이의 리듬을 분석하고, 이유식 추천부터 발달 체크·동네 소아과까지 연결해주는 스마트 육아 앱',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '도담 · AI 육아 파트너',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '도담 · AI 육아 파트너',
    description: 'AI 수유/수면 예측, 이유식 추천, 발달 체크, 동네 소아과 — 임신 준비부터 육아까지',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://dodam.life',
  },
  verification: {
    google: '',
  },
  other: {
    'google-adsense-account': 'ca-pub-7884114322521157',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E8937A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard Variable 폰트 — preconnect + preload */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* Display Fonts — Gmarket Sans for headlines */}
        <link
          rel="preload"
          as="style"
          href="https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSans.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSans.css"
        />
        {/* SUIT Variable for accents */}
        <link
          rel="preload"
          as="style"
          href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'MobileApplication',
              name: '도담 · AI 육아 파트너',
              description: 'AI가 아이의 수유·수면 리듬을 분석하고, 이유식 추천부터 발달 체크·동네 소아과까지 연결해주는 스마트 육아 파트너',
              applicationCategory: 'HealthApplication',
              operatingSystem: 'Web, iOS, Android',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
              aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1200' },
              author: { '@type': 'Organization', name: '도담', url: 'https://dodam.life' },
              inLanguage: 'ko',
              keywords: '육아앱,아기수유기록,AI육아,이유식추천,임신앱,출산준비,소아과찾기,예방접종',
            }),
          }}
        />
        {/* Google AdSense 반려 — 재승인 시 아래 주석 해제
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7884114322521157"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        /> */}
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=services`}
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-full bg-[#E8E4DF] flex justify-center">
        <ThemeScript />
        <SecurityMigrator />
        <SplashProvider />
        <KakaoSDK />
        <div className="w-full max-w-[430px] min-h-full flex flex-col relative shadow-[0_0_40px_rgba(0,0,0,0.08)]" style={{ backgroundColor: 'var(--color-page-bg)' }}>
          <ThemeInitializer />
          <GlobalHeader />
          <main id="main-content">{children}<NavSpacer /></main>
          <ScrollToTop />
          <BottomNav />
          <PWAInstallPrompt />
          <DevResetButton />
          <GlobalToast />
          <Analytics />
        </div>
      </body>
    </html>
  )
}
