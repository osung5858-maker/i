/**
 * AES-GCM 기반 localStorage 암호화 유틸리티
 * - 아이 이름/생년월일, 임신/생리 주기 등 민감 정보 암호화 저장
 * - 키: 앱 고유 시크릿 + 브라우저 지문(origin) 조합
 * - XSS 방어는 CSP로, 이 레이어는 기기 직접 접근 시 평문 노출 방지
 */

const APP_SECRET = 'dodam-secure-v1'

async function deriveKey(): Promise<CryptoKey> {
  const rawKey = new TextEncoder().encode(`${APP_SECRET}:${location.origin}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKey)
  return crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decrypt(encoded: string): Promise<string> {
  const key = await deriveKey()
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plainBuffer)
}

// AES-GCM 암호화 여부 판별 (마이그레이션 호환)
function isEncrypted(value: string): boolean {
  try {
    const decoded = atob(value)
    return decoded.length > 12
  } catch {
    return false
  }
}

/**
 * 암호화하여 localStorage에 저장
 */
export async function setSecure(key: string, value: string): Promise<void> {
  if (!value) {
    localStorage.setItem(key, value)
    return
  }
  try {
    const encrypted = await encrypt(value)
    localStorage.setItem(key, `enc:${encrypted}`)
  } catch {
    // crypto 실패 시 (구형 브라우저) 그대로 저장
    localStorage.setItem(key, value)
  }
}

/**
 * localStorage에서 복호화하여 반환
 */
export async function getSecure(key: string): Promise<string> {
  const raw = localStorage.getItem(key)
  if (!raw) return ''
  if (!raw.startsWith('enc:')) return raw // 기존 평문 데이터 호환
  try {
    return await decrypt(raw.slice(4))
  } catch {
    return raw.slice(4) // 복호화 실패 시 암호문 원문 반환
  }
}

/**
 * 기존 평문 → 암호화로 일괄 마이그레이션
 * 앱 첫 로드 시 1회 실행
 */
export async function migrateToSecure(keys: string[]): Promise<void> {
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw || raw.startsWith('enc:')) continue
    await setSecure(key, raw)
  }
}
