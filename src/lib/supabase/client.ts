import { createBrowserClient } from '@supabase/ssr'

/**
 * SECURITY: Browser client uses only the ANON key (public).
 * NEVER use SUPABASE_SERVICE_ROLE_KEY in client-side code.
 * The service role key must only be used in server-side API routes
 * (e.g., /api/cron/*) that are protected by CRON_SECRET auth.
 */

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    )
  }
  return client
}
