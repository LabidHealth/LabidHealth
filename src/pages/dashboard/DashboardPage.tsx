import React, { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis
} from 'recharts'
import { db } from '@/lib/db'
import { formatNaira, formatTimeAgo } from '@/lib/formatters'
import { StatCard, EmptyState, Button } from '@/components/ui'
import { useNavigate } from 'react-router-dom'

interface WeeklyData {
  day: string
  count: number
}

export function DashboardPage() {
  const [testsToday, setTestsToday] = useState(0)
  const [revenueToday, setRevenueToday] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [undelivered, setUndelivered] = useState(0)
  const [averageTAT, setAverageTAT] = useState('—')
  const [lowStock, setLowStock] = useState(0)
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [topTests, setTopTests] = useState<Record<string, number>>({})
  const [pendingResults, setPendingResults] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(todayStart)
      todayEnd.setHours(23, 59, 59, 999)

      const [samples, results, invoices, notifications, inventory] = await Promise.all([
        db.samples.where('collected_at').between(todayStart.toISOString(), todayEnd.toISOString(), true, true).toArray(),
        db.results.toArray(),
        db.invoices.where('created_at').between(todayStart.toISOString(), todayEnd.toISOString(), true, true).toArray(),
        db.notifications.toArray(),
        db.inventory.toArray()
      ])

      if (!mounted) return

      setTestsToday(samples.length)
      setRevenueToday(invoices.reduce((sum, invoice) => sum + invoice.total, 0))
      setPendingApprovals(results.filter((result) => result.status === 'awaiting_approval').length)
      setUndelivered(
        notifications.filter((notification) => notification.opened_at == null && notification.sent_at).length
      )
      const tatValues = results
        .filter((result) => result.approved_at)
        .map((result) => {
          const sample = samples.find((s) => s.sample_id === result.sample_id)
          if (!sample) return null
          return new Date(result.approved_at).getTime() - new Date(sample.collected_at).getTime()
        })
        .filter((value): value is number => typeof value === 'number')
      if (tatValues.length > 0) {
        const avgHit = Math.round(tatValues.reduce((sum, value) => sum + value, 0) / tatValues.length / 3600000)
        setAverageTAT(`${avgHit} hrs`)
      }
      setLowStock(inventory.filter((item) => Number(item.current_stock) < Number(item.minimum_level)).length)

      const week: WeeklyData[] = []
      for (let i = 6; i >= 0; i -= 1) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)
        const count = await db.samples
          .where('collected_at')
          .between(start.toISOString(), end.toISOString(), true, true)
          .count()
        week.push({ day: format(date, 'EEE'), count })
      }
      setWeeklyData(week)

      const testCounts: Record<string, number> = {}
      samples.forEach((sample) => {
        sample.tests_ordered.forEach((test) => {
          testCounts[test] = (testCounts[test] ?? 0) + 1
        })
      })
      setTopTests(testCounts)

      const pending = await db.results.where('status').equals('awaiting_approval').toArray()
      setPendingResults(pending)
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const topTestEntries = useMemo(() => Object.entries(topTests).sort((a, b) => b[1] - a[1]).slice(0, 5), [topTests])

  return (
    <div className="dashboard-grid">
      <div className="dashboard-row">
        <StatCard label="Tests Today" value={`${testsToday}`} sub="vs yesterday" />
        <StatCard
          label="Revenue Today"
          value={formatNaira(revenueToday)}
          sub="Owner only"
        />
        <StatCard
          label="Pending Approvals"
          value={`${pendingApprovals}`}
          status={pendingApprovals > 0 ? 'warning' : undefined}
        />
        <StatCard
          label="Undelivered Results"
          value={`${undelivered}`}
          status={undelivered > 0 ? 'danger' : undefined}
        />
      </div>
      <div className="dashboard-row">
        <StatCard label="Average TAT" value={averageTAT} />
        <StatCard
          label="Low Stock Items"
          value={`${lowStock}`}
          status={lowStock > 0 ? 'warning' : undefined}
        />
      </div>
      <section className="chart-card">
        <h3>Tests This Week</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weeklyData} margin={{ top: 20, right: 16, left: 16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" stroke="var(--color-text-secondary)" />
            <Tooltip contentStyle={{ borderRadius: 12 }} />
            <Bar dataKey="count" fill="var(--color-mint)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
      <section className="top-tests">
        <h3>Top 5 Tests This Month</h3>
        <div className="top-tests__list">
          {topTestEntries.map(([test, count]) => (
            <div key={test} className="top-test-row">
              <span>{test}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="pending-queue">
        <header>
          <h3>Pending Approvals</h3>
          <Button variant="secondary" onClick={() => navigate('/app/results')}>
            View all
          </Button>
        </header>
        {pendingResults.length === 0 ? (
          <EmptyState
            icon="⚪"
            headline="Nothing waiting for approval"
            description="All results are current."
          />
        ) : (
          <div className="pending-list">
            {pendingResults.map((result) => (
              <div key={result.id} className="pending-row">
                <div>
                  <p>{result.test_type}</p>
                  <small>{formatTimeAgo(result.created_at)}</small>
                </div>
                <Button variant="primary" size="sm" onClick={() => navigate(`/app/results/${result.id}`)}>
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
