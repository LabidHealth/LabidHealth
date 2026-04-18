import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ToastProvider } from '@/components/ui'
import { AuthProvider, useAuthContext } from '@/context/AuthContext'

// ── Eagerly loaded (tiny, always needed on first paint) ──────────────────────
import { LoginPage } from '@/pages/login/LoginPage'

// ── Lazily loaded pages (split by route) ─────────────────────────────────────
const DashboardPage        = lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const PatientListPage      = lazy(() => import('@/pages/patients/PatientListPage').then((m) => ({ default: m.PatientListPage })))
const RegisterPatientPage  = lazy(() => import('@/pages/patients/RegisterPatientPage').then((m) => ({ default: m.RegisterPatientPage })))
const PatientDetailPage    = lazy(() => import('@/pages/patients/PatientDetailPage').then((m) => ({ default: m.PatientDetailPage })))
const SampleListPage       = lazy(() => import('@/pages/samples/SampleListPage').then((m) => ({ default: m.SampleListPage })))
const RegisterSamplePage   = lazy(() => import('@/pages/samples/RegisterSamplePage').then((m) => ({ default: m.RegisterSamplePage })))
const SampleDetailPage     = lazy(() => import('@/pages/samples/SampleDetailPage').then((m) => ({ default: m.SampleDetailPage })))
const ResultListPage       = lazy(() => import('@/pages/results/ResultListPage').then((m) => ({ default: m.ResultListPage })))
const ResultDetailPage     = lazy(() => import('@/pages/results/ResultDetailPage').then((m) => ({ default: m.ResultDetailPage })))
const ResultEntryPage      = lazy(() => import('@/pages/results/ResultEntryPage').then((m) => ({ default: m.ResultEntryPage })))
const ResultApprovalPage   = lazy(() => import('@/pages/results/ResultApprovalPage').then((m) => ({ default: m.ResultApprovalPage })))
const InvoiceListPage      = lazy(() => import('@/pages/billing/InvoiceListPage').then((m) => ({ default: m.InvoiceListPage })))
const InvoiceDetailPage    = lazy(() => import('@/pages/billing/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })))
const InventoryPage        = lazy(() => import('@/pages/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const ReportsPage          = lazy(() => import('@/pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage         = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const PriceListPage        = lazy(() => import('@/pages/settings/PriceListPage').then((m) => ({ default: m.PriceListPage })))
const TwoFactorSetupPage   = lazy(() => import('@/pages/login/TwoFactorSetupPage').then((m) => ({ default: m.TwoFactorSetupPage })))
const TwoFactorVerifyPage  = lazy(() => import('@/pages/login/TwoFactorVerifyPage').then((m) => ({ default: m.TwoFactorVerifyPage })))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240, color: 'var(--color-text-secondary)', fontSize: 14 }}>
      Loading…
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session, mfaState } = useAuthContext()
  if (loading) return <div className="app-loading">Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (mfaState === 'checking') return <div className="app-loading">Loading...</div>
  if (mfaState === 'setup_required') return <Navigate to="/2fa/setup" replace />
  if (mfaState === 'verify_required') return <Navigate to="/2fa/verify" replace />
  return <>{children}</>
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/2fa/setup" element={<Suspense fallback={<PageLoader />}><TwoFactorSetupPage /></Suspense>} />
            <Route path="/2fa/verify" element={<Suspense fallback={<PageLoader />}><TwoFactorVerifyPage /></Suspense>} />

            <Route
              path="/app/*"
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Dashboard */}
                      <Route path="dashboard" element={<DashboardPage />} />

                      {/* Patients */}
                      <Route path="patients" element={<PatientListPage />} />
                      <Route path="patients/register" element={<RegisterPatientPage />} />
                      <Route path="patients/:patientId" element={<PatientDetailPage />} />

                      {/* Samples */}
                      <Route path="samples" element={<SampleListPage />} />
                      <Route path="samples/register" element={<RegisterSamplePage />} />
                      <Route path="samples/:sampleId" element={<SampleDetailPage />} />

                      {/* Results */}
                      <Route path="results" element={<ResultListPage />} />
                      <Route path="results/:resultId" element={<ResultDetailPage />} />
                      <Route path="results/:resultId/entry" element={<ResultEntryPage />} />
                      <Route path="results/:resultId/approve" element={<ResultApprovalPage />} />

                      {/* Billing */}
                      <Route path="billing" element={<InvoiceListPage />} />
                      <Route path="billing/:invoiceId" element={<InvoiceDetailPage />} />

                      {/* Inventory */}
                      <Route path="inventory" element={<InventoryPage />} />

                      {/* Reports */}
                      <Route path="reports" element={<ReportsPage />} />

                      {/* Settings */}
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="settings/prices" element={<PriceListPage />} />

                      <Route index element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </Suspense>
                }
              />
            </Route>

            <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
