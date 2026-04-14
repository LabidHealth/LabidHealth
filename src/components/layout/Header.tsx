import React from 'react'
import { Bell, UserCircle } from 'lucide-react'
import { useSyncContext } from '@/context/SyncContext'

export function Header({ title }: { title: string }) {
  const { syncState, syncQueueCount } = useSyncContext()

  const syncText = {
    synced: 'SYNCED',
    syncing: 'SYNCING...',
    pending: `${syncQueueCount} CHANGES PENDING`,
    offline: 'WORKING OFFLINE',
    conflict: 'SYNC CONFLICT'
  }[syncState]

  const dotColor = {
    synced: 'var(--color-status-success)',
    syncing: 'var(--color-status-success)',
    pending: 'var(--color-status-warning)',
    offline: 'var(--color-status-warning)',
    conflict: 'var(--color-status-danger)'
  }[syncState]

  return (
    <header className="app-header">
      <div className="header-title">
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <span className="sync-indicator">
          <span className="sync-dot" style={{ backgroundColor: dotColor }} />
          <span className="sync-text">{syncText}</span>
        </span>
        <Bell className="header-icon" />
        <UserCircle className="header-icon" />
      </div>
    </header>
  )
}
