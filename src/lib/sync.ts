import { supabase, hasBackend } from './supabase'
import { db } from './db'
import type { SyncQueueItem } from '@/types'

type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'conflict'
type Listener = (state: SyncState) => void

// After this many failed attempts an op is parked as "stuck" and surfaced for
// manual retry — it is never dropped, so a payment/result can't be lost.
const MAX_ATTEMPTS = 8

function isConflictError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const maybe = error as { code?: string; status?: number; message?: string; details?: string; hint?: string }
  const message = `${maybe.message ?? ''} ${maybe.details ?? ''} ${maybe.hint ?? ''}`.toLowerCase()
  return (
    maybe.status === 409 ||
    maybe.code === '23505' ||
    message.includes('duplicate key') ||
    message.includes('row-level security') ||
    message.includes('violates row-level security') ||
    message.includes('permission denied')
  )
}

/** Reject a promise after `ms` milliseconds with a TimeoutError. */
function withTimeout<T>(thenable: PromiseLike<T>, ms = 8_000): Promise<T> {
  return Promise.race([
    Promise.resolve(thenable),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Supabase call timed out after ${ms}ms`)), ms))
  ])
}

/** Returns the next retry delay using exponential back-off (max 64 s). */
function backoffMs(attempts: number): number {
  return Math.min(1_000 * 2 ** attempts, 64_000)
}

class SyncEngine {
  private isSyncing = false
  // Set when a push() is requested while one is already running (e.g. a second
  // record is written mid-sync). Without it, that trigger is dropped and the new
  // record waits for the 30s interval — which is why a visit written right after
  // its patient would not sync promptly. The re-run drains it immediately.
  private rerunRequested = false
  private listeners = new Set<Listener>()
  private state: SyncState = navigator.onLine ? 'pending' : 'offline'
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    window.addEventListener('online', () => this.push())
    window.addEventListener('offline', () => this.updateState('offline'))
    setInterval(() => this.push(), 30_000)
    this.push()
  }

  private updateState(next: SyncState) {
    this.state = next
    for (const listener of this.listeners) listener(next)
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Ops still waiting to sync (excludes parked/stuck ops). */
  pendingCount(): Promise<number> {
    return db.syncQueue.filter((i) => !i.stuck).count()
  }

  /** Ops parked after repeated failures — need manual attention. */
  stuckCount(): Promise<number> {
    return db.syncQueue.filter((i) => i.stuck === true).count()
  }

  /** Un-park stuck ops and try again (Sync Health "retry" action). */
  async retryStuck() {
    const stuck = await db.syncQueue.filter((i) => i.stuck === true).toArray()
    for (const item of stuck) {
      await db.syncQueue.update(item.id!, { stuck: false, attempts: 0, lastError: null })
    }
    await this.push()
  }

  async push() {
    // A write arrived while a sync was in flight — remember to drain again once
    // it finishes, rather than dropping this trigger.
    if (this.isSyncing) {
      this.rerunRequested = true
      return
    }
    // Offline dev mode: no backend to push to; everything lives locally.
    if (!hasBackend) {
      this.updateState('synced')
      return
    }
    if (!navigator.onLine) {
      this.updateState('offline')
      return
    }

    const all = await db.syncQueue.orderBy('timestamp').toArray()
    const queue = all.filter((i) => !i.stuck)
    const hasStuck = all.length > queue.length
    if (queue.length === 0) {
      this.updateState(hasStuck ? 'conflict' : 'synced')
      return
    }

    this.updateState('syncing')
    this.isSyncing = true

    try {
      let sawConflict = false
      let sawFailure = false

      for (const item of queue) {
        try {
          await this.processItem(item)
          await db.syncQueue.delete(item.id!)
        } catch (error) {
          sawFailure = true
          if (isConflictError(error)) sawConflict = true
          const attempts = (item.attempts ?? 0) + 1
          const lastError = (error as Error).message
          if (attempts >= MAX_ATTEMPTS) {
            // NEVER drop — park as stuck so it can be retried, never lost.
            await db.syncQueue.update(item.id!, { attempts, stuck: true, lastError })
          } else {
            await db.syncQueue.update(item.id!, { attempts, lastError })
            if (this.retryTimer) clearTimeout(this.retryTimer)
            this.retryTimer = setTimeout(() => void this.push(), backoffMs(attempts))
          }
        }
      }

      const stuck = await this.stuckCount()
      const remaining = await this.pendingCount()
      if (stuck > 0) this.updateState('conflict')
      else if (remaining === 0 && !sawFailure) this.updateState('synced')
      else if (!navigator.onLine) this.updateState('offline')
      else if (sawConflict) this.updateState('conflict')
      else this.updateState('pending')
    } finally {
      this.isSyncing = false
      // Drain anything queued while we were syncing (e.g. the visit written
      // right after its patient) instead of waiting for the next interval.
      if (this.rerunRequested) {
        this.rerunRequested = false
        void this.push()
      }
    }
  }

  private async processItem(item: SyncQueueItem) {
    const { table, operation, payload } = item
    if (operation === 'INSERT') {
      // Plain INSERT, deliberately NOT an upsert. Postgres makes INSERT ... ON
      // CONFLICT (in any form) also satisfy the SELECT policy so it can read the
      // row for conflict handling — but a just-registered patient is not yet
      // SELECT-visible under the visit-scoped policy (their first visit has not
      // synced), so an upsert would reject every registration. A plain insert
      // only checks the INSERT policy.
      //
      // Idempotency is preserved by the client-generated UUID id: replaying an
      // insert whose response was lost hits the PRIMARY KEY and is treated as
      // already-synced (success). A duplicate on any OTHER unique key — a LABID,
      // sample_id or invoice_id minted twice while two devices were offline — is
      // a real collision and is rethrown, so it parks as stuck rather than being
      // silently dropped.
      const res = await withTimeout(supabase.from(table as never).insert(payload as never))
      const error = (res as { error: { code?: string; message?: string; details?: string } | null }).error
      if (error) {
        const detail = `${error.message ?? ''} ${error.details ?? ''}`
        const isPrimaryKeyReplay = error.code === '23505' && detail.includes(`${table}_pkey`)
        if (!isPrimaryKeyReplay) throw error
      }
    } else if (operation === 'UPDATE') {
      // Real update: apply it. onConflict:id keeps it idempotent, and upsert
      // semantics recover if the original INSERT op has not landed yet.
      const res = await withTimeout(supabase.from(table as never).upsert(payload as never, { onConflict: 'id' }))
      const { error } = res as { error: unknown }
      if (error) throw error
    } else if (operation === 'DELETE') {
      const res = await withTimeout(supabase.from(table as never).delete().eq('id', item.recordId))
      const { error } = res as { error: unknown }
      if (error) throw error
    }
  }
}

export const syncEngine = new SyncEngine()
