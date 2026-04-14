import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthProvider, useAuthContext } from '@/context/AuthContext'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { LoginPage } from '@/pages/login/LoginPage'
import { PatientListPage } from '@/pages/patients/PatientListPage'
import { RegisterPatientPage } from '@/pages/patients/RegisterPatientPage'
import { ToastProvider } from '@/components/ui'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuthContext()
  if (loading) {
    return <div className="app-loading">Loading…</div>
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          <Route
            path="/app/*"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="patients" element={<PatientListPage />} />
            <Route path="patients/register" element={<RegisterPatientPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
            <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
