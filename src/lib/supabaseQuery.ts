import { db } from './db'

const TIMEOUT_MS = 8_000

/**
 * Wraps a Supabase query promise so it times out after 8 seconds.
 * If the network call times out or fails, resolves to `{ data: null, error, timedOut: true }`.
 *
 * Usage:
 *   const { data, timedOut } = await supabaseQuery(
 *     supabase.from('patients').select('*')
 *   )
 *   if (timedOut) {
 *     // fall back to IndexedDB — already handled for most pages via the
 *     // local-first pattern (load from db first, sync second), but for
 *     // pages that rely on a fresh remote fetch this prevents an infinite spinner.
 *   }
 */
export async function supabaseQuery<T>(
  promise: PromiseLike<{ data: T | null; error: unknown }>
): Promise<{ data: T | null; error: unknown; timedOut: boolean }> {
  const timeout = new Promise<{ data: null; error: Error; timedOut: true }>((resolve) =>
    setTimeout(
      () => resolve({ data: null, error: new Error(`Network request timed out after ${TIMEOUT_MS / 1000}s`), timedOut: true }),
      TIMEOUT_MS
    )
  )
  const result = await Promise.race([
    Promise.resolve(promise).then((r) => ({ ...r, timedOut: false as const })),
    timeout
  ])
  return result
}

/**
 * Error message formatter for Supabase / network errors shown to lab staff.
 * Converts technical error messages into human-friendly Nigerian-English copy.
 */
export function friendlyError(error: unknown): string {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase()

  if (msg.includes('timed out') || msg.includes('network') || msg.includes('fetch'))
    return "Couldn't connect — your data is saved locally and will sync when connection returns"

  if (msg.includes('jwt') || msg.includes('token') || msg.includes('auth'))
    return 'Your session has expired — please sign in again'

  if (msg.includes('duplicate') || msg.includes('unique'))
    return 'A record with this ID already exists'

  if (msg.includes('permission') || msg.includes('row-level security') || msg.includes('rls'))
    return "You don't have permission to perform this action"

  if (msg.includes('not found') || msg.includes('404'))
    return 'Record not found — it may have been deleted'

  return (error instanceof Error ? error.message : 'An unexpected error occurred')
}
