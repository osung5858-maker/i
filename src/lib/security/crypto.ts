/**
 * 키즈노트 credential 암호화/복호화
 * Web Crypto API 기반 AES-GCM 암호화
 *
 * 암호화 키는 사용자의 Supabase user ID에서 파생하여
 * 다른 기기/사용자가 복호화할 수 없도록 함
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256

/**
 * 패스프레이즈에서 AES 키 파생 (PBKDF2)
 */
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  // 고정 salt (기기 내 저장 용도이므로 충분)
  const salt = encoder.encode('dodam-kn-v1')

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * 문자열을 AES-GCM으로 암호화
 * @returns base64 인코딩된 "iv:ciphertext" 형식
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase)
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext),
  )

  const ivBase64 = btoa(String.fromCharCode(...iv))
  const ctBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))

  return `${ivBase64}:${ctBase64}`
}

/**
 * AES-GCM 복호화
 * @param encrypted "iv:ciphertext" 형식의 base64 문자열
 */
export async function decrypt(encrypted: string, passphrase: string): Promise<string | null> {
  try {
    const [ivBase64, ctBase64] = encrypted.split(':')
    if (!ivBase64 || !ctBase64) return null

    const key = await deriveKey(passphrase)
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(ctBase64), c => c.charCodeAt(0))

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext,
    )

    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}
