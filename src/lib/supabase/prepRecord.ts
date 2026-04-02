import { createClient } from '@/lib/supabase/client'

/**
 * Upsert a prep_record for a given date + type.
 * Deletes any existing record for that (user, date, type) first, then inserts.
 * Safe for all types including those without a unique DB constraint.
 */
export async function upsertPrepRecord(
  date: string,
  type: string,
  value: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('prep_records')
    .delete()
    .eq('user_id', user.id)
    .eq('record_date', date)
    .eq('type', type)
  await supabase.from('prep_records').insert({
    user_id: user.id,
    record_date: date,
    type,
    value,
  })
}

/**
 * Append a prep_record without removing existing ones for the same date+type.
 * Use for types where multiple records per day are valid (e.g. preg_test).
 */
export async function insertPrepRecord(
  date: string,
  type: string,
  value: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('prep_records').insert({
    user_id: user.id,
    record_date: date,
    type,
    value,
  })
}

/** Fetch all prep_records for the current user, optionally filtered by types. */
export async function fetchPrepRecords(types?: string[]): Promise<Array<{
  id: string
  record_date: string
  type: string
  value: Record<string, unknown>
}>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let query = supabase
    .from('prep_records')
    .select('id, record_date, type, value')
    .eq('user_id', user.id)
    .order('record_date', { ascending: false })
  if (types && types.length > 0) query = query.in('type', types)
  const { data } = await query
  return (data ?? []) as Array<{ id: string; record_date: string; type: string; value: Record<string, unknown> }>
}

/** Delete all prep_records for a given date + type. */
export async function deletePrepRecord(date: string, type: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('prep_records')
    .delete()
    .eq('user_id', user.id)
    .eq('record_date', date)
    .eq('type', type)
}
