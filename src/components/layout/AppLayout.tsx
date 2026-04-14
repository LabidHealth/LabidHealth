import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { OfflineBanner } from './OfflineBanner'
import { SyncProvider } from '@/context/SyncContext'

export function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <SyncProvider>
          <Header title="Labora AI" />
          <OfflineBanner />
          <main className="app-main">
            <Outlet />
          </main>
        </SyncProvider>
      </div>
    </div>
  )
}
