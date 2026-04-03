/**
 * 웹 푸시 알림 설정
 */

// VAPID Public Key — 클라이언트에서 사용 (공개키이므로 코드에 포함 가능)
export const VAPID_PUBLIC_KEY = 'BITzVh759e8pmLHPItzIKtS2jM1mlartS4otyUwQSVwklXMEdfYEeulWC76gGKLmeLASOsjV8NUy7vstVqR4hxQ'

// VAPID Private Key는 .env.local에 VAPID_PRIVATE_KEY로 저장
// 서버 사이드에서만 사용

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
  return DEFAULT_SETTINGS
}

export async function loadNotificationSettingsFromDB(): Promise<NotificationSettings> {
  try {
    const { getProfile } = await import('@/lib/supabase/userProfile')
    const profile = await getProfile()
    const saved = profile?.user_settings?.notification_settings as Partial<NotificationSettings> | undefined
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveNotificationSettings(settings: NotificationSettings) {
  import('@/lib/supabase/userProfile').then(({ upsertProfile }) => {
    upsertProfile({ user_settings: { notification_settings: settings as unknown as Record<string, unknown> } })
  })
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
