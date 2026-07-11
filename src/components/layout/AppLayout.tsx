import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { OfflineBanner } from './OfflineBanner'
import { SyncProvider } from '@/context/SyncContext'

export function AppLayout() {
  const location = useLocation()
  const title = (() => {
    if (location.pathname.startsWith('/app/patients/register')) return 'Register Patient'
    if (location.pathname.startsWith('/app/patients/')) return 'Patient Details'
    if (location.pathname.startsWith('/app/patients')) return 'Patients'
    if (location.pathname.endsWith('/approve')) return 'Approve Result'
    if (location.pathname.endsWith('/entry')) return 'Enter Result'
    if (location.pathname.startsWith('/app/results/')) return 'Result Details'
    if (location.pathname.startsWith('/app/results')) return 'Results'
    if (location.pathname.startsWith('/app/samples')) return 'Sample Tracking'
    if (location.pathname.startsWith('/app/billing/')) return 'Invoice Detail'
    if (location.pathname.startsWith('/app/billing')) return 'Billing'
    if (location.pathname.startsWith('/app/reports')) return 'Reports'
    if (location.pathname.startsWith('/app/settings/prices')) return 'Price List'
    if (location.pathname.startsWith('/app/settings')) return 'Settings'
    return 'Dashboard'
  })()

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <SyncProvider>
          <Header title={title} />
          <OfflineBanner />
          <main className="app-main">
            <Outlet />
          </main>
        </SyncProvider>
      </div>
      <MobileNav />
    </div>
  )
}
