import React, { useEffect, useMemo, useState } from 'react'
import { invoiceRepo, notificationRepo, patientRepo, resultRepo, sampleRepo, staffRepo, visitRepo } from '@/lib/repositories'
import { format, subDays } from 'date-fns'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, StatCard } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { formatNaira, formatTimeAgo } from '@/lib/formatters'
import { resendNotification } from '@/lib/notifications'
import { pullDashboard } from '@/lib/pull'
import type { Invoice, LabStaff, Notification, Patient, PatientVisit, Result, Sample } from '@/types'
import { OwnerDashboard } from './OwnerDashboard'
import { ScientistDashboard } from './ScientistDashboard'
import { FrontDeskDashboard } from './FrontDeskDashboard'

interface WeeklyData {
  day: string
  count: number
}

interface RevenueDayData {
  date: string
  revenue: number
}

interface PendingApprovalRow {
  id: string
  patientName: string
  labid: string
  testType: string
  createdAt: string
}

interface UndeliveredRow {
  resultId: string
  patientName: string
  labid: string
  testType: string
  approvedAt: string
  notification: Notification | undefined
}

interface StaffProductivityRow {
  staffId: string
  name: string
  role: string
  testsEntered: number
  approved: number
}

interface DashboardMetrics {
  testsToday: number
  testsTrend: 'up' | 'down' | 'neutral'
  testsSub: string
  revenueToday: number
  revenueTrend: 'up' | 'down' | 'neutral'
  revenueSub: string
  pendingApprovals: number
  undelivered: number
  averageTAT: string
  weeklyData: WeeklyData[]
  revenueData: RevenueDayData[]
  topTests: Array<[string, number]>
  pendingRows: PendingApprovalRow[]
  undeliveredRows: UndeliveredRow[]
  staffRows: StaffProductivityRow[]
  newPatients: number
  returningPatients: number
}

const placeholderWeeklyData: WeeklyData[] = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (6 - i))
  return { day: format(d, 'EEE'), count: 0 }
})

function getTrend(today: number, yesterday: number): 'up' | 'down' | 'neutral' {
  if (today > yesterday) return 'up'
  if (today < yesterday) return 'down'
  return 'neutral'
}

function getTrendLabel(today: number, yesterday: number, formatter?: (v: number) => string) {
  if (today === yesterday) return 'No change vs yesterday'
  const diff = Math.abs(today - yesterday)
  const rendered = formatter ? formatter(diff) : `${diff}`
  return `${today > yesterday ? '+' : '-'}${rendered} vs yesterday`
}

function isBetween(ds: string | null | undefined, start: Date, end: Date) {
  if (!ds) return false
  const v = new Date(ds).getTime()
  return v >= start.getTime() && v <= end.getTime()
}

function sod(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(0, 0, 0, 0); return d
}

function eod(offset = 0) {
  const d = sod(offset); d.setHours(23, 59, 59, 999); return d
}

function buildMetrics(
  samples: Sample[], results: Result[], invoices: Invoice[],
  notifications: Notification[],
  patients: Patient[], visits: PatientVisit[], staff: LabStaff[]
): DashboardMetrics {
  const todayStart = sod(); const todayEnd = eod()
  const ydStart = sod(-1); const ydEnd = eod(-1)
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  const testsToday = samples.filter((s) => isBetween(s.collected_at, todayStart, todayEnd)).length
  const testsYd = samples.filter((s) => isBetween(s.collected_at, ydStart, ydEnd)).length

  const revenueToday = invoices.filter((i) => isBetween(i.created_at, todayStart, todayEnd)).reduce((a, i) => a + i.total, 0)
  const revenueYd = invoices.filter((i) => isBetween(i.created_at, ydStart, ydEnd)).reduce((a, i) => a + i.total, 0)

  const pendingResults = results.filter((r) => r.status === 'awaiting_approval')

  const undeliveredRows: UndeliveredRow[] = results.filter((r) => {
    if (!r.approved_at) return false
    const age = Date.now() - new Date(r.approved_at).getTime()
    if (age < 24 * 3_600_000) return false
    return !notifications.some((n) => n.result_id === r.id && n.opened_at)
  }).map((r) => {
    const p = patients.find((pt) => pt.labid === r.labid)
    const notif = notifications.filter((n) => n.result_id === r.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    return {
      resultId: r.id,
      patientName: p?.full_name ?? r.labid,
      labid: r.labid,
      testType: r.test_type,
      approvedAt: r.approved_at ?? '',
      notification: notif
    }
  }).slice(0, 10)

  const tatVals = results
    .filter((r) => isBetween(r.approved_at, todayStart, todayEnd))
    .map((r) => {
      const s = samples.find((sm) => sm.sample_id === r.sample_id)
      if (!s || !r.approved_at) return null
      return new Date(r.approved_at).getTime() - new Date(s.collected_at).getTime()
    }).filter((v): v is number => v !== null)

  const averageTAT = tatVals.length
    ? `${Math.max(1, Math.round(tatVals.reduce((a, v) => a + v, 0) / tatVals.length / 3_600_000))} hrs`
    : '-'

  const weeklyData = placeholderWeeklyData.map((e, idx) => ({
    day: e.day,
    count: samples.filter((s) => isBetween(s.collected_at, sod(idx - 6), eod(idx - 6))).length
  }))

  // Revenue last 30 days (owner)
  const revenueData: RevenueDayData[] = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i)
    const ds = sod(-(29 - i))
    const de = eod(-(29 - i))
    return {
      date: format(d, 'MM/dd'),
      revenue: invoices.filter((inv) => isBetween(inv.created_at, ds, de)).reduce((a, inv) => a + inv.total, 0) / 100
    }
  })

  const testCounts = new Map<string, number>()
  for (const s of samples.filter((sm) => new Date(sm.collected_at) >= monthStart)) {
    for (const t of s.tests_ordered) testCounts.set(t, (testCounts.get(t) ?? 0) + 1)
  }
  const topTests = Array.from(testCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const patientMap = new Map(patients.map((p) => [p.labid, p.full_name]))

  const pendingRows = pendingResults.map((r) => ({
    id: r.id,
    patientName: patientMap.get(r.labid) ?? 'Unknown',
    labid: r.labid,
    testType: r.test_type,
    createdAt: r.created_at
  }))

  // New vs Returning: patients who had >1 visit before today are returning
  const visitCountByLabid = new Map<string, number>()
  for (const v of visits) {
    visitCountByLabid.set(v.labid, (visitCountByLabid.get(v.labid) ?? 0) + 1)
  }
  const todaySampleLabids = new Set(samples.filter((s) => isBetween(s.collected_at, todayStart, todayEnd)).map((s) => s.labid))
  let newPatients = 0; let returningPatients = 0
  for (const labid of todaySampleLabids) {
    const count = visitCountByLabid.get(labid) ?? 0
    if (count <= 1) newPatients++; else returningPatients++
  }

  // Staff productivity (this month)
  const staffRows: StaffProductivityRow[] = staff.map((s) => ({
    staffId: s.user_id,
    name: s.full_name,
    role: s.role,
    testsEntered: results.filter((r) => r.entered_by === s.user_id && new Date(r.created_at) >= monthStart).length,
    approved: results.filter((r) => r.approved_by === s.user_id && new Date(r.created_at) >= monthStart).length
  })).filter((r) => r.testsEntered + r.approved > 0).sort((a, b) => b.testsEntered - a.testsEntered).slice(0, 10)

  return {
    testsToday, testsTrend: getTrend(testsToday, testsYd), testsSub: getTrendLabel(testsToday, testsYd),
    revenueToday, revenueTrend: getTrend(revenueToday, revenueYd), revenueSub: getTrendLabel(revenueToday, revenueYd, formatNaira),
    pendingApprovals: pendingResults.length,
    undelivered: undeliveredRows.length,
    averageTAT,
    weeklyData: weeklyData.some((e) => e.count > 0) ? weeklyData : placeholderWeeklyData,
    revenueData,
    topTests, pendingRows, undeliveredRows, staffRows,
    newPatients, returningPatients
  }
}

export function DashboardPage() {
  const { role } = useAuthContext()
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<DashboardMetrics>(() => buildMetrics([], [], [], [], [], [], []))
  const [resendingId, setResendingId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const refresh = async () => {
        const [samples, results, invoices, notifications, patients, visits, staff] = await Promise.all([
          sampleRepo.all(), resultRepo.all(), invoiceRepo.all(),
          notificationRepo.all(), patientRepo.all(),
          visitRepo.all(), staffRepo.all()
        ])
        if (!mounted) return
        setMetrics(buildMetrics(samples, results, invoices, notifications, patients, visits, staff))
      }
      await refresh()
      if (navigator.onLine) { await pullDashboard(); await refresh() }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const topTests = useMemo(() => metrics.topTests, [metrics.topTests])
  const showRevenue = role === 'owner'
  const canSeeStaff = role === 'owner' || role === 'manager'

  const donutData = [
    { name: 'New', value: metrics.newPatients, color: 'var(--color-mint)' },
    { name: 'Returning', value: metrics.returningPatients, color: 'var(--color-forest)' }
  ]
  const totalPatients = metrics.newPatients + metrics.returningPatients

  async function handleResend(row: UndeliveredRow) {
    if (!row.notification) return
    setResendingId(row.resultId)
    try {
      await resendNotification(row.notification, null)
    } finally {
      setResendingId(null)
    }
  }

  if (role === 'owner') return <OwnerDashboard />
  if (role === 'scientist') return <ScientistDashboard />
  if (role === 'front_desk') return <FrontDeskDashboard />

  return (
    <div className="dashboard-grid">
      {/* Stat cards */}
      <div className={`dashboard-row${showRevenue ? '' : ' dashboard-row--compact'}`}>
        <StatCard label="Tests Today" value={`${metrics.testsToday}`} sub={metrics.testsSub} trend={metrics.testsTrend} />
        {showRevenue ? (
          <StatCard label="Revenue Today" value={formatNaira(metrics.revenueToday)} sub={metrics.revenueSub} trend={metrics.revenueTrend} />
        ) : null}
        <StatCard label="Pending Approvals" value={`${metrics.pendingApprovals}`} status={metrics.pendingApprovals > 0 ? 'warning' : undefined} />
        <StatCard label="Undelivered Results" value={`${metrics.undelivered}`} status={metrics.undelivered > 0 ? 'danger' : undefined} />
      </div>

      <div className="dashboard-row dashboard-row--secondary">
        <StatCard label="Average TAT" value={metrics.averageTAT} />
      </div>

      {/* Charts row */}
      <div className="dashboard-row" style={{ gap: 16, alignItems: 'stretch' }}>
        {/* Tests this week bar chart */}
        <section className="chart-card" style={{ flex: 2 }}>
          <h3>Tests This Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metrics.weeklyData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-text-secondary)" />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Bar dataKey="count" fill="var(--color-mint)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* New vs Returning donut */}
        <section className="chart-card" style={{ flex: 1, minWidth: 200 }}>
          <h3>Today&apos;s Patients</h3>
          {totalPatients === 0 ? (
            <EmptyState icon="-" headline="No patients today" description="" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12, marginTop: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-mint)', display: 'inline-block' }} />
                  New ({metrics.newPatients})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-forest)', display: 'inline-block' }} />
                  Returning ({metrics.returningPatients})
                </span>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Revenue trend (owner only) */}
      {showRevenue ? (
        <section className="chart-card">
          <h3>Revenue — Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.revenueData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} interval={4} />
              <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₦${v.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-mint)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      ) : null}

      {/* Undelivered Results */}
      {metrics.undeliveredRows.length > 0 ? (
        <section className="pending-queue">
          <header>
            <h3>Undelivered Results</h3>
            <Button variant="secondary" onClick={() => navigate('/app/results')}>View all</Button>
          </header>
          <div className="pending-list">
            {metrics.undeliveredRows.map((row) => (
              <div key={row.resultId} className="pending-row">
                <div>
                  <p>{row.patientName}</p>
                  <small className="pending-row__meta">
                    <span className="table-id">{row.labid}</span>
                    <span>{row.testType}</span>
                    <span style={{ color: 'var(--color-status-danger)' }}>
                      Approved {formatTimeAgo(row.approvedAt)} — not opened
                    </span>
                  </small>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/app/results/${row.resultId}`)}>
                    View
                  </Button>
                  {row.notification ? (
                    <Button
                      variant="primary" size="sm"
                      loading={resendingId === row.resultId}
                      onClick={() => void handleResend(row)}
                    >
                      Resend
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Top tests */}
      <div className="dashboard-row" style={{ gap: 16, alignItems: 'stretch' }}>
        <section className="top-tests" style={{ flex: 1 }}>
          <h3>Top 5 Tests This Month</h3>
          {topTests.length === 0 ? (
            <EmptyState icon="-" headline="No tests yet" description="Top test volume will appear after the first samples land." />
          ) : (
            <div className="top-tests__list">
              {topTests.map(([test, count]) => (
                <div key={test} className="top-test-row">
                  <span>{test}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Staff productivity (manager/owner) */}
      {canSeeStaff && metrics.staffRows.length > 0 ? (
        <section className="chart-card">
          <h3>Staff Productivity — This Month</h3>
          <table className="data-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Role</th>
                <th>Results Entered</th>
                <th>Results Approved</th>
              </tr>
            </thead>
            <tbody>
              {metrics.staffRows.map((s) => (
                <tr key={s.staffId}>
                  <td>{s.name}</td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--color-text-secondary)', fontSize: 12 }}>{s.role.replace('_', ' ')}</td>
                  <td><strong>{s.testsEntered}</strong></td>
                  <td><strong>{s.approved}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Pending approvals queue */}
      <section className="pending-queue">
        <header>
          <h3>Pending Approvals</h3>
          <Button variant="secondary" onClick={() => navigate('/app/results')}>View all</Button>
        </header>
        {metrics.pendingRows.length === 0 ? (
          <EmptyState icon="-" headline="Nothing waiting for approval" description="All results are current." />
        ) : (
          <div className="pending-list">
            {metrics.pendingRows.map((r) => (
              <div key={r.id} className="pending-row">
                <div>
                  <p>{r.patientName}</p>
                  <small className="pending-row__meta">
                    <span className="table-id">{r.labid}</span>
                    <span>{r.testType}</span>
                    <span>{formatTimeAgo(r.createdAt)}</span>
                  </small>
                </div>
                <Button variant="primary" size="sm" onClick={() => navigate(`/app/results/${r.id}`)}>
                  Approve
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
