import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.kakaocdn.net' },
      { protocol: 'http', hostname: '**.kakaocdn.net' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '**.daumcdn.net' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    localPatterns: [
      {
        pathname: '/api/kidsnote/image',
        search: '**',
      },
      {
        pathname: '/**',
      },
    ],
    deviceSizes: [390, 430, 768],
    minimumCacheTTL: 86400,
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
        value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
      },
      {
        // Protect against cross-origin attacks while allowing OAuth popups
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin-allow-popups',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://dapi.kakao.com http://dapi.kakao.com https://t1.kakaocdn.net https://t2.kakaocdn.net https://t1.daumcdn.net https://pagead2.googlesyndication.com https://www.googletagmanager.com https://va.vercel-scripts.com webpack://*",
          "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
          "img-src 'self' data: blob: https: http:",
          "font-src 'self' data: https://cdn.jsdelivr.net",
          "media-src 'self' blob: data:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://kapi.kakao.com https://kauth.kakao.com https://dapi.kakao.com http://dapi.kakao.com https://*.daumcdn.net http://*.daumcdn.net https://*.kakao.com https://api.open-meteo.com https://air-quality-api.open-meteo.com https://www.kidsnote.com https://pagead2.googlesyndication.com https://va.vercel-scripts.com ws://localhost:* http://localhost:*",
          "frame-src 'self' https://www.youtube.com https://pagead2.googlesyndication.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self' https://*.supabase.co https://accounts.google.com https://kauth.kakao.com",
          "upgrade-insecure-requests",
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
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=86400, stale-while-revalidate=604800'
              : 'no-cache, no-store, must-revalidate',
          },
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
