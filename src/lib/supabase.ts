import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True when real Supabase credentials are configured. When false the app runs
 * in offline dev mode — local login, no sync, seeded local data — so the whole
 * frontend can be built and used without a Supabase account. Set
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect a real backend.
 */
export const hasBackend = Boolean(supabaseUrl && supabaseAnonKey)

// In offline dev mode, reject network calls instantly so pages never hang
// waiting on a backend that isn't there — reads fall back to local Dexie data.
const offlineFetch: typeof fetch = () =>
  Promise.reject(new Error('Offline dev mode: no Supabase backend configured'))

export const supabase = createClient<Database>(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'offline-dev-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: hasBackend
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    ...(hasBackend ? {} : { global: { fetch: offlineFetch } })
  }
)
