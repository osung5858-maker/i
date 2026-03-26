import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ['image/webp'],
  },
  async headers() {
    // 보안 헤더 (모든 경로에 적용)
    const securityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self)',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://dapi.kakao.com https://t1.daumcdn.net https://pagead2.googlesyndication.com https://www.googletagmanager.com https://va.vercel-scripts.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https: http:",
          "font-src 'self' data:",
          "media-src 'self' blob: data:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://kapi.kakao.com https://kauth.kakao.com https://dapi.kakao.com https://t1.daumcdn.net https://*.kakao.com https://api.open-meteo.com https://air-quality-api.open-meteo.com https://www.kidsnote.com https://pagead2.googlesyndication.com https://va.vercel-scripts.com",
          "frame-src 'self' https://www.youtube.com https://pagead2.googlesyndication.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self' https://*.supabase.co https://accounts.google.com https://kauth.kakao.com",
        ].join('; '),
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
    ]

    return [
      {
        // 모든 경로에 보안 헤더 적용
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
};

export default nextConfig;
