import { createClient } from '@supabase/supabase-js'

// Server-side only — uses service key for direct DB access
export function createServerSupabaseClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}
