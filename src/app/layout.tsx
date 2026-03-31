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
import ThemeInitializer from '@/components/ThemeInitializer'
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
        {/* 테마 플래시 방지 — 페인트 전 동기 실행으로 CSS 변수 적용 */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var m={coral:{p:'#E8937A',pl:'#F0A890',pb:'#FFF5F2',a:'#D07A62',ab:'#FFE0D4',bg:'#FFF5F2',ff:'#FFD4C4',ft:'#E8937A',fs:'rgba(232,147,122,0.35)',cs:'rgba(232,147,122,0.08)',hs:'rgba(232,147,122,0.1)',ts:'rgba(232,147,122,0.06)',g:'linear-gradient(135deg,#FFF5F2 0%,#FFE8E0 50%,#FFD4C4 100%)'},lavender:{p:'#8B7EC8',pl:'#A498D4',pb:'#F5F3FA',a:'#6B5EAA',ab:'#E4DFF0',bg:'#F5F3FA',ff:'#D4C8F0',ft:'#8B7EC8',fs:'rgba(139,126,200,0.35)',cs:'rgba(139,126,200,0.08)',hs:'rgba(139,126,200,0.1)',ts:'rgba(139,126,200,0.06)',g:'linear-gradient(135deg,#F5F3FA 0%,#EDE8F5 50%,#E0DAF0 100%)'},peach:{p:'#FF8C5A',pl:'#FFA070',pb:'#FFF8F0',a:'#2D6B4A',ab:'#FFE0C8',bg:'#FFF8F0',ff:'#FFD4B0',ft:'#FF8C5A',fs:'rgba(255,140,90,0.35)',cs:'rgba(255,140,90,0.08)',hs:'rgba(255,140,90,0.1)',ts:'rgba(255,140,90,0.06)',g:'linear-gradient(135deg,#FFF8F0 0%,#FFEFD6 50%,#FFE4C4 100%)'},rose:{p:'#C87B8A',pl:'#D4909E',pb:'#FFF2F4',a:'#A85C6C',ab:'#F0D0D6',bg:'#FFF2F4',ff:'#F0C4CC',ft:'#C87B8A',fs:'rgba(200,123,138,0.35)',cs:'rgba(200,123,138,0.08)',hs:'rgba(200,123,138,0.1)',ts:'rgba(200,123,138,0.06)',g:'linear-gradient(135deg,#FFF2F4 0%,#FFE8EC 50%,#FFD8E0 100%)'},blue:{p:'#6B9EC8',pl:'#88B4D4',pb:'#F0F5FA',a:'#4A80B0',ab:'#D0E2F0',bg:'#F0F5FA',ff:'#B8D4E8',ft:'#6B9EC8',fs:'rgba(107,158,200,0.35)',cs:'rgba(107,158,200,0.08)',hs:'rgba(107,158,200,0.1)',ts:'rgba(107,158,200,0.06)',g:'linear-gradient(135deg,#F0F5FA 0%,#E4EFF8 50%,#D4E6F4 100%)'},amber:{p:'#C8A055',pl:'#D4B470',pb:'#FDF8EE',a:'#A08040',ab:'#E8D8B8',bg:'#FDF8EE',ff:'#E8D4A8',ft:'#C8A055',fs:'rgba(200,160,85,0.35)',cs:'rgba(200,160,85,0.08)',hs:'rgba(200,160,85,0.1)',ts:'rgba(200,160,85,0.06)',g:'linear-gradient(135deg,#FDF8EE 0%,#F8F0DA 50%,#F0E4C8 100%)'},sage:{p:'#5EA88A',pl:'#78BA9E',pb:'#F0F8F4',a:'#3D8A5A',ab:'#C8E8D4',bg:'#F0F8F4',ff:'#B8E0C8',ft:'#5EA88A',fs:'rgba(94,168,138,0.35)',cs:'rgba(94,168,138,0.08)',hs:'rgba(94,168,138,0.1)',ts:'rgba(94,168,138,0.06)',g:'linear-gradient(135deg,#F0F8F4 0%,#E0F5E9 50%,#D0EFE0 100%)'}};var id=localStorage.getItem('dodam_color_theme')||'coral';var t=m[id]||m.coral;var r=document.documentElement;r.style.setProperty('--color-primary',t.p);r.style.setProperty('--color-primary-light',t.pl);r.style.setProperty('--color-primary-bg',t.pb);r.style.setProperty('--color-accent',t.a);r.style.setProperty('--color-accent-bg',t.ab);r.style.setProperty('--color-page-bg',t.bg);r.style.setProperty('--color-fab-from',t.ff);r.style.setProperty('--color-fab-to',t.ft);r.style.setProperty('--color-fab-shadow',t.fs);r.style.setProperty('--color-card-shadow',t.cs);r.style.setProperty('--color-header-shadow',t.hs);r.style.setProperty('--color-tab-shadow',t.ts);r.style.setProperty('--dodam-gradient',t.g);}catch(e){}})();` }} />
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
        <SecurityMigrator />
        <SplashProvider />
        <KakaoSDK />
        <div className="w-full max-w-[430px] min-h-full flex flex-col relative shadow-[0_0_40px_rgba(0,0,0,0.08)]" style={{ backgroundColor: 'var(--color-page-bg)' }}>
          <ThemeInitializer />
          <GlobalHeader />
          <main className="flex-1 pb-20" id="main-content">{children}</main>
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
