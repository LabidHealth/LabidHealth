import { db } from './db'
import { syncEngine } from './sync'
import { hasBackend } from './supabase'
import { logAuditEvent } from './auditLog'
import type { SyncQueueItem } from '@/types'

export async function writeRecord<T extends { id: string }>(
  table: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: T,
  oldValue?: Partial<T> | null
) {
  const dexieTable = db.table(table)

  if (operation === 'INSERT') {
    await dexieTable.add(payload)
  } else if (operation === 'UPDATE') {
    await dexieTable.update(payload.id, payload)
  } else {
    await dexieTable.delete(payload.id)
  }

  await logAuditEvent(
    operation,
    table,
    payload.id,
    (oldValue as Record<string, unknown> | null | undefined) ?? null,
    payload as Record<string, unknown>
  )

  // Offline dev mode (no backend): keep everything local, skip the sync queue.
  if (hasBackend) {
    await db.syncQueue.add({
      table,
      operation,
      recordId: payload.id,
      payload,
      timestamp: Date.now(),
      attempts: 0
    } as SyncQueueItem)

    if (navigator.onLine) {
      void syncEngine.push()
    }
  }

  return payload
}
