/**
 * 환경 변수 중앙 관리
 *
 * - 모든 환경 변수를 한 곳에서 관리
 * - 타입 안전성 보장
 * - 누락된 필수 변수 즉시 감지
 * - 기본값 중앙 관리
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

export const config = {
  // Site
  siteUrl: getEnv('NEXT_PUBLIC_SITE_URL', 'https://dodam.life'),

  // Supabase
  supabase: {
    url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },

  // Kakao
  kakao: {
    jsKey: requireEnv('NEXT_PUBLIC_KAKAO_JS_KEY'),
  },

  // Google (서버 전용)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },

  // Gemini AI (서버 전용)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },

  // Firebase (서버 전용)
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },

  // Web Push
  vapid: {
    publicKey: requireEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
    privateKey: process.env.VAPID_PRIVATE_KEY, // 서버 전용
  },

  // Feature Flags
  features: {
    googleAdSense: process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID,
  },

  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const

export type Config = typeof config
