import { createClient } from '@/lib/supabase/client'
import type { CheckupSchedule, CheckupResult } from '@/components/pregnant/CheckupSchedule/types'
import { DEFAULT_CHECKUPS } from '@/constants/checkups'

/**
 * Upsert a preg_record for a given date + type.
 * Deletes any existing record for that (user, date, type) first, then inserts.
 */
export async function upsertPregRecord(
  date: string,
  type: string,
  value: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error: delError } = await supabase.from('preg_records')
    .delete()
    .eq('user_id', user.id)
    .eq('record_date', date)
    .eq('type', type)
  if (delError) {
    console.error('[upsertPregRecord] delete failed:', delError.message)
    return
  }
  const { error: insError } = await supabase.from('preg_records').insert({
    user_id: user.id,
    record_date: date,
    type,
    value,
  })
  if (insError) {
    console.error('[upsertPregRecord] insert failed:', insError.message)
  }
}

/** Fetch all preg_records for the current user, optionally filtered by types. */
export async function fetchPregRecords(types?: string[]): Promise<Array<{
  id: string
  record_date: string
  type: string
  value: Record<string, unknown>
}>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let query = supabase
    .from('preg_records')
    .select('id, record_date, type, value')
    .eq('user_id', user.id)
    .order('record_date', { ascending: false })
  if (types && types.length > 0) query = query.in('type', types)
  const { data, error } = await query
  if (error) {
    console.error('[fetchPregRecords] query failed:', error.message)
    return []
  }
  return (data ?? []) as Array<{ id: string; record_date: string; type: string; value: Record<string, unknown> }>
}

/** Delete all preg_records for a given date + type. */
export async function deletePregRecord(date: string, type: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('preg_records')
    .delete()
    .eq('user_id', user.id)
    .eq('record_date', date)
    .eq('type', type)
  if (error) {
    console.error('[deletePregRecord] delete failed:', error.message)
  }
}

// ===== Checkup Schedule CRUD =====

/** Fetch all checkup schedules, merging defaults with saved data. */
export async function fetchCheckupSchedules(): Promise<CheckupSchedule[]> {
  const rows = await fetchPregRecords(['checkup_schedule'])
  const savedMap = new Map<string, CheckupSchedule>()
  for (const row of rows) {
    const val = row.value as unknown as CheckupSchedule
    if (val.checkup_id) savedMap.set(val.checkup_id, val)
  }
  // Merge defaults with saved data
  const result: CheckupSchedule[] = DEFAULT_CHECKUPS.map(dc => {
    const saved = savedMap.get(dc.id)
    if (saved) return { ...saved, week: dc.week, title: saved.title || dc.title }
    return {
      checkup_id: dc.id,
      title: dc.title,
      week: dc.week,
      completed: false,
      is_custom: false,
    }
  })
  // Add custom checkups
  for (const [id, val] of savedMap) {
    if (val.is_custom) result.push(val)
  }
  return result.sort((a, b) => (a.week ?? 99) - (b.week ?? 99))
}

/** Create or update a checkup schedule entry. */
export async function saveCheckupSchedule(
  data: CheckupSchedule
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const recordDate = data.scheduled_date || today
  // Use checkup_id as the date key prefix to allow multiple schedules
  await upsertPregRecord(
    `sched_${data.checkup_id}`,
    'checkup_schedule',
    data as unknown as Record<string, unknown>
  )
}

/** Mark a checkup as completed. */
export async function completeCheckup(checkupId: string): Promise<void> {
  const rows = await fetchPregRecords(['checkup_schedule'])
  const existing = rows.find(
    r => (r.value as unknown as CheckupSchedule).checkup_id === checkupId
  )
  if (existing) {
    const val = existing.value as unknown as CheckupSchedule
    val.completed = true
    val.completed_date = new Date().toISOString().split('T')[0]
    await upsertPregRecord(
      `sched_${checkupId}`,
      'checkup_schedule',
      val as unknown as Record<string, unknown>
    )
  }
}

/** Delete a checkup schedule (custom only). */
export async function deleteCheckupSchedule(checkupId: string): Promise<void> {
  await deletePregRecord(`sched_${checkupId}`, 'checkup_schedule')
}

/**
 * Bulk insert for migration.
 */
export async function bulkInsertPregRecords(
  records: Array<{ date: string; type: string; value: Record<string, unknown> }>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || records.length === 0) return
  const rows = records.map(r => ({
    user_id: user.id,
    record_date: r.date,
    type: r.type,
    value: r.value,
  }))
  const { error } = await supabase.from('preg_records').insert(rows)
  if (error) {
    console.error('[bulkInsertPregRecords] insert failed:', error.message)
  }
}

// ===== Checkup Result CRUD =====

/** Save or update a checkup result. */
export async function saveCheckupResult(result: CheckupResult): Promise<void> {
  await upsertPregRecord(
    `result_${result.checkup_id}`,
    'checkup_result',
    result as unknown as Record<string, unknown>
  )
}

/** Fetch a single checkup result by checkup_id. */
export async function fetchCheckupResult(
  checkupId: string
): Promise<CheckupResult | null> {
  const rows = await fetchPregRecords(['checkup_result'])
  const match = rows.find(
    r => (r.value as unknown as CheckupResult).checkup_id === checkupId
  )
  return match ? (match.value as unknown as CheckupResult) : null
}

/** Fetch all checkup results. */
export async function fetchAllCheckupResults(): Promise<CheckupResult[]> {
  const rows = await fetchPregRecords(['checkup_result'])
  return rows.map(r => r.value as unknown as CheckupResult)
}

/** Delete a checkup result. */
export async function deleteCheckupResult(checkupId: string): Promise<void> {
  await deletePregRecord(`result_${checkupId}`, 'checkup_result')
}

/** Get current user ID helper. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
