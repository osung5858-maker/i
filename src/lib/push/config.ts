/**
 * 웹 푸시 알림 설정
 */

// VAPID Public Key — 클라이언트에서 사용 (공개키이므로 코드에 포함 가능)
export const VAPID_PUBLIC_KEY = 'BITzVh759e8pmLHPItzIKtS2jM1mlartS4otyUwQSVwklXMEdfYEeulWC76gGKLmeLASOsjV8NUy7vstVqR4hxQ'

// VAPID Private Key는 .env.local에 VAPID_PRIVATE_KEY로 저장
// 서버 사이드에서만 사용

export const NOTIFICATION_SETTINGS_KEY = 'dodam_notification_settings'

export interface NotificationSettings {
  enabled: boolean
  predictFeed: boolean
  predictSleep: boolean
  vaccination: boolean
  dailyEncourage: boolean
  aiInsight: boolean
  dndStart: string // 'HH:MM'
  dndEnd: string   // 'HH:MM'
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  predictFeed: true,
  predictSleep: true,
  vaccination: true,
  dailyEncourage: true,
  aiInsight: true,
  dndStart: '22:00',
  dndEnd: '07:00',
}

export function loadNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveNotificationSettings(settings: NotificationSettings) {
  localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings))
}

export function isDndTime(settings: NotificationSettings): boolean {
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (settings.dndStart <= settings.dndEnd) {
    // 같은 날 범위 (예: 08:00~12:00)
    return hhmm >= settings.dndStart && hhmm < settings.dndEnd
  }
  // 자정 걸치는 범위 (예: 22:00~07:00)
  return hhmm >= settings.dndStart || hhmm < settings.dndEnd
}
