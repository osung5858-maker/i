import { createClient } from '@/lib/supabase/client'
import { getPendingEvents, removePendingEvent } from './db'

export async function syncPendingEvents(): Promise<number> {
  const supabase = createClient()
  const pending = await getPendingEvents()

  if (pending.length === 0) return 0

  let synced = 0
  for (const event of pending) {
    const { error } = await supabase.from('events').insert({
      child_id: event.child_id,
      recorder_id: event.recorder_id,
      type: event.type,
      start_ts: event.start_ts,
      end_ts: event.end_ts,
      amount_ml: event.amount_ml,
      tags: event.tags,
      source: event.source,
    })

    if (!error) {
      await removePendingEvent(event.id)
      synced++
    }
  }

  return synced
}
