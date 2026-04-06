import { createClient } from '@/lib/supabase/client'

/**
 * Upsert a user_record for a given date + type.
 * Deletes any existing record for that (user, date, type) first, then inserts.
 */
export async function upsertUserRecord(
  date: string,
  type: string,
  value: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error: delError } = await supabase.from('user_records')
    .delete()
    .eq('user_id', user.id)
    .eq('record_date', date)
    .eq('type', type)
  if (delError) {
    console.error('[upsertUserRecord] delete failed:', delError.message)
    return
  }
  const { error: insError } = await supabase.from('user_records').insert({
    user_id: user.id,
    record_date: date,
    type,
    value,
  })
  if (insError) {
    console.error('[upsertUserRecord] insert failed:', insError.message)
  }
}

/**
 * Append a user_record without removing existing ones for the same date+type.
 * Use for types where multiple records per day are valid.
 */
export async function insertUserRecord(
  date: string,
  type: string,
  value: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('user_records').insert({
    user_id: user.id,
    record_date: date,
    type,
    value,
  })
  if (error) {
    console.error('[insertUserRecord] insert failed:', error.message)
  }
}

/** Fetch all user_records for the current user, optionally filtered by types. */
export async function fetchUserRecords(types?: string[]): Promise<Array<{
  id: string
  record_date: string
  type: string
  value: Record<string, unknown>
}>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let query = supabase
    .from('user_records')
    .select('id, record_date, type, value')
    .eq('user_id', user.id)
    .order('record_date', { ascending: false })
  if (types && types.length > 0) query = query.in('type', types)
  const { data, error } = await query
  if (error) {
    console.error('[fetchUserRecords] query failed:', error.message)
    return []
  }
  return (data ?? []) as Array<{ id: string; record_date: string; type: string; value: Record<string, unknown> }>
}

/** Delete all user_records for a given date + type. */
export async function deleteUserRecord(date: string, type: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('user_records')
    .delete()
    .eq('user_id', user.id)
    .eq('record_date', date)
    .eq('type', type)
  if (error) {
    console.error('[deleteUserRecord] delete failed:', error.message)
  }
}

/**
 * Bulk upsert: insert multiple records in one go (for migration).
 * Skips auth check per-call — caller must ensure user is authenticated.
 */
export async function bulkInsertUserRecords(
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
  const { error } = await supabase.from('user_records').insert(rows)
  if (error) {
    console.error('[bulkInsertUserRecords] insert failed:', error.message)
  }
}
