'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { bulkInsertUserRecords } from '@/lib/supabase/userRecord'
import { bulkInsertPregRecords } from '@/lib/supabase/pregRecord'
import { upsertProfile } from '@/lib/supabase/userProfile'
import { upsertPrepRecord } from '@/lib/supabase/prepRecord'

const MIGRATION_FLAG = 'dodam_db_migrated_v2'

function safeParseJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

async function migrateToDb() {
  if (localStorage.getItem(MIGRATION_FLAG)) return

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date().toISOString().split('T')[0]
  const results: string[] = []

  // --- user_records 이관 ---
  const userRecords: Array<{ date: string; type: string; value: Record<string, unknown> }> = []

  // 예방접종
  const vaccinations = safeParseJSON<Record<string, string>>('dodam_vaccinations', {})
  if (Object.keys(vaccinations).length > 0) {
    userRecords.push({ date: today, type: 'vaccinations', value: vaccinations })
    results.push('vaccinations')
  }

  // 부작용 추적
  const sideEffects = safeParseJSON('dodam_vax_sideeffects', [])
  if (Array.isArray(sideEffects) && sideEffects.length > 0) {
    userRecords.push({ date: today, type: 'vax_sideeffects', value: { entries: sideEffects } })
    results.push('vax_sideeffects')
  }

  // EPDS 검사 이력
  const epds = safeParseJSON('dodam_epds_history', [])
  if (Array.isArray(epds) && epds.length > 0) {
    userRecords.push({ date: today, type: 'epds_history', value: { entries: epds } })
    results.push('epds_history')
  }

  // 기분 이력
  const mood = safeParseJSON('dodam_mood_history', [])
  if (Array.isArray(mood) && mood.length > 0) {
    userRecords.push({ date: today, type: 'mood_history', value: { entries: mood } })
    results.push('mood_history')
  }

  // 수유 세션
  const feeds = safeParseJSON('dodam_feed_sessions', [])
  if (Array.isArray(feeds) && feeds.length > 0) {
    userRecords.push({ date: today, type: 'feed_sessions', value: { entries: feeds } })
    results.push('feed_sessions')
  }

  // 편지
  const letters = safeParseJSON('dodam_letters', [])
  if (Array.isArray(letters) && letters.length > 0) {
    userRecords.push({ date: today, type: 'letters', value: { entries: letters } })
    results.push('letters')
  }

  // 여정
  const journey = safeParseJSON('dodam_journey_entries', [])
  if (Array.isArray(journey) && journey.length > 0) {
    userRecords.push({ date: today, type: 'journey_entries', value: { entries: journey } })
    results.push('journey_entries')
  }

  // 북마크
  const bookmarks = safeParseJSON<string[]>('dodam_bookmarks', [])
  if (bookmarks.length > 0) {
    userRecords.push({ date: today, type: 'bookmarks', value: { ids: bookmarks } })
    results.push('bookmarks')
  }

  // 울음 분석 로그
  const cryLog = safeParseJSON('dodam_cry_log', [])
  if (Array.isArray(cryLog) && cryLog.length > 0) {
    userRecords.push({ date: today, type: 'cry_log', value: { entries: cryLog } })
    results.push('cry_log')
  }

  // 건강기록
  const healthRecords = safeParseJSON('dodam_health_records', {})
  if (Object.keys(healthRecords).length > 0) {
    userRecords.push({ date: today, type: 'health_records', value: healthRecords })
    results.push('health_records')
  }

  // 검진 이력
  const checkupHistory = safeParseJSON('dodam_checkup_history', [])
  if (Array.isArray(checkupHistory) && checkupHistory.length > 0) {
    userRecords.push({ date: today, type: 'checkup_history', value: { entries: checkupHistory } })
    results.push('checkup_history')
  }

  if (userRecords.length > 0) {
    await bulkInsertUserRecords(userRecords).catch(() => {})
  }

  // --- preg_records 이관 ---
  const pregRecords: Array<{ date: string; type: string; value: Record<string, unknown> }> = []

  // 임신 다이어리
  const pregDiary = safeParseJSON<Array<Record<string, unknown>>>('dodam_preg_diary', [])
  if (pregDiary.length > 0) {
    for (const entry of pregDiary) {
      const d = entry.date ? new Date(entry.date as string).toISOString().split('T')[0] : today
      pregRecords.push({ date: d, type: 'diary', value: entry })
    }
    results.push('preg_diary')
  }

  // 임신 건강기록
  const pregHealth = safeParseJSON<Record<string, Record<string, unknown>>>('dodam_preg_health', {})
  if (Object.keys(pregHealth).length > 0) {
    for (const [date, val] of Object.entries(pregHealth)) {
      pregRecords.push({ date, type: 'health', value: val as Record<string, unknown> })
    }
    results.push('preg_health')
  }

  // 검진 기록
  const checkupRecords = safeParseJSON<Array<Record<string, unknown>>>('dodam_checkup_records', [])
  if (checkupRecords.length > 0) {
    for (const entry of checkupRecords) {
      const d = (entry.date as string) || today
      pregRecords.push({ date: d, type: 'checkup', value: entry })
    }
    results.push('checkup_records')
  }

  if (pregRecords.length > 0) {
    await bulkInsertPregRecords(pregRecords).catch(() => {})
  }

  // --- prep_records 이관 ---
  // 준비 체크리스트
  const prepChecks = safeParseJSON<Record<string, boolean>>('dodam_preparing_checks', {})
  if (Object.keys(prepChecks).length > 0) {
    await upsertPrepRecord(today, 'checklist', prepChecks).catch(() => {})
    results.push('preparing_checks')
  }

  // 아기 용품 체크리스트
  const babyItems = safeParseJSON<Record<string, boolean>>('dodam_baby_items_done', {})
  if (Object.keys(babyItems).length > 0) {
    await upsertPrepRecord(today, 'baby_items', babyItems).catch(() => {})
    results.push('baby_items')
  }

  // --- user_profiles.user_settings 이관 ---
  const notifSettings = safeParseJSON('dodam_notification_settings', null)
  const reminderOffset = localStorage.getItem('dodam_reminder_offset')
  const daycare = localStorage.getItem('dodam_daycare')
  const careReminders = safeParseJSON('dodam_care_reminders', null)

  const settings: Record<string, unknown> = {}
  if (notifSettings) settings.notification_settings = notifSettings
  if (reminderOffset) settings.reminder_offset = Number(reminderOffset)
  if (daycare) settings.daycare = daycare
  if (careReminders) settings.care_reminders = careReminders

  if (Object.keys(settings).length > 0) {
    await upsertProfile({ user_settings: settings }).catch(() => {})
    results.push('user_settings')
  }

  // 완료 플래그
  localStorage.setItem(MIGRATION_FLAG, JSON.stringify({
    version: 2,
    migratedAt: new Date().toISOString(),
    items: results,
  }))
}

export default function DataMigrator() {
  useEffect(() => {
    // 페이지 init()의 auth 체크와 race condition 방지: 3초 지연
    const timer = setTimeout(() => migrateToDb().catch(() => {}), 3000)
    return () => clearTimeout(timer)
  }, [])
  return null
}
