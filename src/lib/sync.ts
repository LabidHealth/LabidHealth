import { supabase } from './supabase'
import { db } from './db'
import type { SyncQueueItem } from '@/types'

type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'conflict'

type Listener = (state: SyncState) => void

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
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase call timed out after ${ms}ms`)), ms)
    )
  ])
}

/** Returns the next retry delay using exponential back-off (max 64 s). */
function backoffMs(attempts: number): number {
  return Math.min(1_000 * 2 ** attempts, 64_000)
}

class SyncEngine {
  private isSyncing = false
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
    for (const listener of this.listeners) {
      listener(next)
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async push() {
    if (this.isSyncing) return
    if (!navigator.onLine) {
      this.updateState('offline')
      return
    }

    const queue = await db.syncQueue.orderBy('timestamp').toArray()
    if (queue.length === 0) {
      this.updateState('synced')
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
          if (attempts >= 5) {
            // Give up after 5 attempts — drop the item to avoid infinite loops
            await db.syncQueue.delete(item.id!)
          } else {
            await db.syncQueue.update(item.id!, { attempts, lastError: (error as Error).message })
            // Schedule a retry with exponential back-off
            if (this.retryTimer) clearTimeout(this.retryTimer)
            this.retryTimer = setTimeout(() => void this.push(), backoffMs(attempts))
          }
        }
      }

      const remaining = await db.syncQueue.count()
      if (remaining === 0 && !sawFailure) {
        this.updateState('synced')
      } else if (!navigator.onLine) {
        this.updateState('offline')
      } else if (sawConflict) {
        this.updateState('conflict')
      } else {
        this.updateState('pending')
      }
    } finally {
      this.isSyncing = false
    }
  }

  private async processItem(item: SyncQueueItem) {
    const { table, operation, payload } = item
    if (operation === 'INSERT') {
      const result = await withTimeout(supabase.from(table as never).insert(payload as never))
      const { error } = result as { error: unknown }
      if (error) throw error
    }
    if (operation === 'UPDATE') {
      const result = await withTimeout(
        supabase.from(table as never).update(payload as never).eq('id', item.recordId)
      )
      const { error } = result as { error: unknown }
      if (error) throw error
    }
    if (operation === 'DELETE') {
      const result = await withTimeout(
        supabase.from(table as never).delete().eq('id', item.recordId)
      )
      const { error } = result as { error: unknown }
      if (error) throw error
    }
  }
}

export const syncEngine = new SyncEngine()
