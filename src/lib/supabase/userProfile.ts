import { createClient } from '@/lib/supabase/client'

export type UserSettings = {
  notification_settings?: Record<string, unknown>
  reminder_offset?: number
  daycare?: string | null
  care_reminders?: Record<string, unknown>
}

export type ProfileFields = {
  mode?: string
  intro_shown?: boolean
  tutorial_preparing?: boolean
  tutorial_pregnant?: boolean
  tutorial_parenting?: boolean
  my_role?: string
  mother_birth?: string | null
  father_birth?: string | null
  mother_height?: number | null
  father_height?: number | null
  chosen_nickname?: string | null
  last_period?: string | null
  cycle_length?: number | null
  region?: string | null
  due_date?: string | null
  user_settings?: UserSettings
}

/** Fire-and-forget: upsert user_profiles fields. Silently no-ops if not logged in. */
export async function upsertProfile(fields: ProfileFields): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('user_profiles').upsert(
    { user_id: user.id, ...fields },
    { onConflict: 'user_id' }
  )
  if (error) {
    console.error('[upsertProfile] upsert failed:', error.message)
  }
}

/** Fetch the current user's full profile row. Returns null if not logged in or no row yet. */
export async function getProfile(): Promise<ProfileFields & { user_id?: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (error) {
    console.error('[getProfile] query failed:', error.message)
    return null
  }
  return data ?? null
}
