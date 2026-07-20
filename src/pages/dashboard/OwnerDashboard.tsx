import React, { useEffect, useState } from 'react'
import { invoiceRepo, notificationRepo, paymentRepo, resultRepo, sampleRepo } from '@/lib/repositories'
import { useNavigate } from 'react-router-dom'
import { syncEngine } from '@/lib/sync'
import { formatNaira } from '@/lib/formatters'
import type { Invoice, Notification, Payment, PaymentMethod, Result, Sample } from '@/types'

// The owner surface is phone-first (installed PWA): the two things checked first
// — collected today + undelivered results — then reconciliation, tests-this-week
// and sync health. Mirrors docs/design-tokens.md's approved owner mockup.

const METHOD_LABEL: Partial<Record<PaymentMethod, string>> = {
  cash: 'Cash',
  pos: 'POS',
  bank_transfer: 'Transfer'
}
const METHOD_DOT: Partial<Record<PaymentMethod, string>> = {
  cash: 'var(--color-status-success)',
  pos: 'var(--color-mint)',
  bank_transfer: 'var(--color-status-info)'
}
const DAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const startOfDay = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const endOfDay = (offset = 0) => startOfDay(offset) + 86_400_000 - 1
const within = (iso: string | null | undefined, s: number, e: number) => {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= s && t <= e
}

interface OwnerMetrics {
  collectedToday: number
  collectedTrendPct: number
  undelivered: number
  invoicedToday: number
  outstandingTotal: number
  outstandingCount: number
  byMethod: Array<{ method: PaymentMethod; amount: number }>
  testsToday: number
  avgTatHrs: number | null
  weekly: Array<{ label: string; count: number; today: boolean }>
  pending: number
  stuck: number
}

async function computeOwnerMetrics(): Promise<OwnerMetrics> {
  const [invoices, payments, samples, results, notifications, pending, stuck] = await Promise.all([
    invoiceRepo.all() as Promise<Invoice[]>,
    paymentRepo.all() as Promise<Payment[]>,
    sampleRepo.all() as Promise<Sample[]>,
    resultRepo.all() as Promise<Result[]>,
    notificationRepo.all() as Promise<Notification[]>,
    syncEngine.pendingCount(),
    syncEngine.stuckCount()
  ])
  const live = payments.filter((p) => !p.voided)
  const todayS = startOfDay()
  const todayE = endOfDay()

  const collectedToday = live.filter((p) => within(p.created_at, todayS, todayE)).reduce((a, p) => a + p.amount, 0)
  const collectedYesterday = live
    .filter((p) => within(p.created_at, startOfDay(-1), endOfDay(-1)))
    .reduce((a, p) => a + p.amount, 0)
  const collectedTrendPct = collectedYesterday > 0 ? Math.round(((collectedToday - collectedYesterday) / collectedYesterday) * 100) : 0

  const invoicedToday = invoices.filter((i) => within(i.created_at, todayS, todayE)).reduce((a, i) => a + i.total, 0)
  const outstandingInvoices = invoices.filter((i) => i.outstanding > 0)
  const outstandingTotal = outstandingInvoices.reduce((a, i) => a + i.outstanding, 0)

  // Undelivered = approved > 24h ago and the patient still has not opened it.
  const undelivered = results.filter((r) => {
    if (!r.approved_at) return false
    if (Date.now() - new Date(r.approved_at).getTime() < 24 * 3_600_000) return false
    return !notifications.some((n) => n.result_id === r.id && n.opened_at)
  }).length

  const methodMap = new Map<PaymentMethod, number>()
  for (const p of live.filter((pp) => within(pp.created_at, todayS, todayE))) {
    methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + p.amount)
  }
  const byMethod = [...methodMap.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount)

  const testsToday = samples.filter((s) => within(s.collected_at, todayS, todayE)).length

  const tatVals = results
    .filter((r) => within(r.approved_at, todayS, todayE))
    .map((r) => {
      const s = samples.find((sm) => sm.sample_id === r.sample_id)
      return s && r.approved_at ? new Date(r.approved_at).getTime() - new Date(s.collected_at).getTime() : null
    })
    .filter((v): v is number => v !== null)
  const avgTatHrs = tatVals.length ? tatVals.reduce((a, v) => a + v, 0) / tatVals.length / 3_600_000 : null

  const weekly = Array.from({ length: 7 }, (_, idx) => {
    const off = idx - 6
    const s = startOfDay(off)
    const e = endOfDay(off)
    return {
      label: DAY_INITIAL[new Date(s).getDay()],
      count: samples.filter((sm) => within(sm.collected_at, s, e)).length,
      today: off === 0
    }
  })

  return {
    collectedToday, collectedTrendPct, undelivered, invoicedToday, outstandingTotal,
    outstandingCount: outstandingInvoices.length, byMethod, testsToday, avgTatHrs, weekly, pending, stuck
  }
}

export function OwnerDashboard() {
  const navigate = useNavigate()
  const [m, setM] = useState<OwnerMetrics | null>(null)

  useEffect(() => {
    let mounted = true
    void computeOwnerMetrics().then((res) => {
      if (mounted) setM(res)
    })
    return () => {
      mounted = false
    }
  }, [])

  if (!m) return <div className="app-loading">Loading…</div>

  const maxCount = Math.max(1, ...m.weekly.map((w) => w.count))
  const synced = m.pending === 0 && m.stuck === 0

  return (
    <div className="ownerdash">
      <header className="ownerdash__head">
        <h1 className="ownerdash__title">Today</h1>
        <p className="ownerdash__sub">Your money surface, at a glance.</p>
      </header>

      {/* Two hero cards — the whole reason the owner opens the app. */}
      <div className="od-hero">
        <article className="od-hcard od-hcard--money">
          <div className="od-hcard__k">Collected today</div>
          <div className="od-hcard__v num">{formatNaira(m.collectedToday)}</div>
          <div className="od-hcard__s">
            {m.collectedTrendPct === 0 ? 'No change vs yesterday' : `${m.collectedTrendPct > 0 ? '↑' : '↓'} ${Math.abs(m.collectedTrendPct)}% vs yesterday`}
          </div>
        </article>
        <button className="od-hcard od-hcard--undel" onClick={() => navigate('/app/results')}>
          <div className="od-hcard__k">Undelivered</div>
          <div className="od-hcard__v num">{m.undelivered}</div>
          <div className="od-hcard__s">{m.undelivered > 0 ? 'Tap to chase →' : 'All delivered'}</div>
        </button>
      </div>

      {/* Reconciliation */}
      <section className="od-card">
        <h3>Today’s reconciliation <span className="od-card__link" onClick={() => navigate('/app/billing')}>Details</span></h3>
        {m.byMethod.length === 0 ? (
          <p className="od-recon-empty">No payments recorded today.</p>
        ) : (
          m.byMethod.map((r) => (
            <div className="od-recon-row" key={r.method}>
              <span className="od-recon-lbl">
                <i className="od-dot" style={{ background: METHOD_DOT[r.method] ?? 'var(--color-text-tertiary)' }} />
                {METHOD_LABEL[r.method] ?? r.method}
              </span>
              <span className="od-recon-amt num">{formatNaira(r.amount)}</span>
            </div>
          ))
        )}
        <div className="od-recon-total">
          <span className="od-recon-invoiced">Invoiced {formatNaira(m.invoicedToday)}</span>
          <span className="od-recon-out num">Outstanding {formatNaira(m.outstandingTotal)} · {m.outstandingCount}</span>
        </div>
      </section>

      {/* Tests this week sparkline */}
      <section className="od-card">
        <h3>Tests this week</h3>
        <div className="od-spark" aria-hidden="true">
          {m.weekly.map((w, i) => (
            <div className="od-spark-bar" key={i}>
              <i className={w.today ? 'is-today' : ''} style={{ height: `${Math.round((w.count / maxCount) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="od-spark-x">
          {m.weekly.map((w, i) => <span key={i}>{w.label}</span>)}
        </div>
      </section>

      {/* Mini stats */}
      <div className="od-mini">
        <div className="od-ms">
          <div className="od-ms__k">Tests today</div>
          <div className="od-ms__v num">{m.testsToday}</div>
        </div>
        <div className="od-ms">
          <div className="od-ms__k">Avg turnaround</div>
          <div className="od-ms__v num">{m.avgTatHrs != null ? `${m.avgTatHrs.toFixed(1)} h` : '—'}</div>
        </div>
      </div>

      {/* Sync health */}
      <button className={`od-synced${synced ? '' : ' od-synced--attention'}`} onClick={() => navigate('/app/settings')}>
        {synced ? (
          <><span>✓</span> <b>All synced</b> · 0 pending</>
        ) : (
          <><b>{m.pending} pending</b>{m.stuck > 0 ? ` · ${m.stuck} stuck — tap to review` : ''}</>
        )}
      </button>
    </div>
  )
}
