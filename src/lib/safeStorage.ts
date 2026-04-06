/**
 * Safe localStorage wrapper.
 *
 * Safari private browsing mode throws SecurityError on any localStorage access.
 * These helpers swallow that error and return sensible fallbacks so the app
 * does not crash.
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
