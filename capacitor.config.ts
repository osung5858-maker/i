import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.dodam.care',
  appName: '도담',
  webDir: 'out',
  server: {
    url: 'https://dodam.life',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
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
  ios: {
    backgroundColor: '#FFF9F5',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
}

export default config
