/**
 * localStorage 만료 캐시 정리
 * 날짜 기반 키들(dodam_suppl_YYYY-MM-DD, dodam_mood_YYYY-MM-DD 등)을
 * 7일 이상 지난 것들은 자동 삭제
 */
export function cleanupExpiredCache() {
  if (typeof window === 'undefined') return

  try {
    const now = Date.now()
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    const datePatterns = [
      'dodam_suppl_',
      'dodam_mood_',
      'dodam_preg_mood_',
      'dodam_daily_',
      'dodam_ai_care_',
      'dodam_preg_meal_',
      'dodam_prep_meal_',
      'dodam_ai_preg_',
      'dodam_ai_briefing_',
    ]

    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      for (const pattern of datePatterns) {
        if (key.startsWith(pattern)) {
          // Extract date from key (YYYY-MM-DD format)
          const datePart = key.slice(pattern.length, pattern.length + 10)
          const keyDate = new Date(datePart).getTime()
          if (!isNaN(keyDate) && now - keyDate > SEVEN_DAYS) {
            keysToRemove.push(key)
          }
          break
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch {
    // silently ignore errors
  }
}
