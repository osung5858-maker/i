import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'life.dodam.android',
  appName: '도담',
  webDir: 'public', // 서버 모드에서는 사용 안 함, 플레이스홀더
  server: {
    // Vercel 배포 URL을 직접 로드 (SSR + API 모두 동작)
    url: 'https://www.dodam.life',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#FFF9F5',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFF9F5',
  },
}

export default config
