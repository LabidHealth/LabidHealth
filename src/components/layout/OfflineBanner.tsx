import React from 'react'
import { useSyncContext } from '@/context/SyncContext'

export function OfflineBanner() {
  const { isOnline, syncQueueCount, forceSync } = useSyncContext()
  if (isOnline) return null

  return (
    <div className="offline-banner" role="status">
      <span>WORKING OFFLINE - {syncQueueCount} CHANGES PENDING SYNC</span>
      <button type="button" onClick={forceSync} className="banner-action">
        Force upload
      </button>
    </div>
  )
}
