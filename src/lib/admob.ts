/**
 * AdMob 초기화 + 플랫폼 감지 유틸
 *
 * - SSR 안전 (try/catch)
 * - 웹에서는 모두 no-op
 * - 동적 import로 번들 사이즈 영향 없음
 */

let _native: boolean | null = null

/** Capacitor 네이티브 앱 안에서 실행 중인지 */
export function isNativePlatform(): boolean {
  if (_native !== null) return _native
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core')
    _native = Capacitor.isNativePlatform()
  } catch {
    _native = false
  }
  return _native!
}

let initialized = false

/** AdMob SDK 초기화 — 네이티브일 때만, 최초 1회만 실행 */
export async function initAdMob(): Promise<void> {
  if (initialized || !isNativePlatform()) return

  try {
    const { AdMob } = await import('@capacitor-community/admob')
    await AdMob.initialize({
      initializeForTesting: process.env.NODE_ENV !== 'production',
    })
    initialized = true
  } catch (error) {
    console.error('[AdMob] init failed:', error)
  }
}
