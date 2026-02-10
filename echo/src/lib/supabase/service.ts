import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service role client for admin operations (e.g. creating auth users).
 * NEVER expose this to the browser — server-side only.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
