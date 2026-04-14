import { supabase } from './supabase'
import { db } from './db'
import type { SyncQueueItem } from '@/types'

type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'conflict'

type Listener = (state: SyncState) => void

class SyncEngine {
  private isSyncing = false
  private listeners = new Set<Listener>()
  private state: SyncState = navigator.onLine ? 'pending' : 'offline'

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
    return () => this.listeners.delete(listener)
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
      for (const item of queue) {
        try {
          await this.processItem(item)
          await db.syncQueue.delete(item.id!)
        } catch (error) {
          const attempts = (item.attempts ?? 0) + 1
          if (attempts >= 5) {
            await db.syncQueue.delete(item.id!)
          } else {
            await db.syncQueue.update(item.id!, { attempts, lastError: (error as Error).message })
          }
          throw error
        }
      }
      this.updateState('synced')
    } catch (error) {
      this.updateState('conflict')
      console.error('Sync failure', error)
    } finally {
      this.isSyncing = false
    }
  }

  private async processItem(item: SyncQueueItem) {
    const { table, operation, payload } = item
    if (operation === 'INSERT') {
      const { error } = await supabase.from(table).insert(payload)
      if (error) throw error
    }
    if (operation === 'UPDATE') {
      const { error } = await supabase.from(table).update(payload).eq('id', item.recordId)
      if (error) throw error
    }
    if (operation === 'DELETE') {
      const { error } = await supabase.from(table).delete().eq('id', item.recordId)
      if (error) throw error
    }
  }
}

export const syncEngine = new SyncEngine()
