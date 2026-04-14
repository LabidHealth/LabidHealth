import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { syncEngine } from '@/lib/sync'

type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'conflict'

interface SyncContextValue {
  syncState: SyncState
  syncQueueCount: number
  isOnline: boolean
  forceSync: () => void
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useOnlineStatus()
  const syncQueueCount = useSyncQueue()
  const [syncState, setSyncState] = useState<SyncState>('offline')

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => setSyncState(state))
    return () => unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      isOnline,
      syncQueueCount,
      syncState,
      forceSync: () => syncEngine.push()
    }),
    [isOnline, syncQueueCount, syncState]
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSyncContext() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSyncContext must be used within SyncProvider')
  }
  return context
}
