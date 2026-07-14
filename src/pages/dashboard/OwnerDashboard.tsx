import React, { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Banknote, Clock, Download, ReceiptText } from 'lucide-react'
import { db } from '@/lib/db'
import { syncEngine } from '@/lib/sync'
import { formatNaira } from '@/lib/formatters'
import type { Invoice, Patient, Payment, PaymentMethod, Result, Sample } from '@/types'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  pos: 'POS',
  bank_transfer: 'Transfer',
  opay: 'OPay',
  palmpay: 'PalmPay'
}
const METHOD_DOT: Partial<Record<PaymentMethod, string>> = {
  cash: 'var(--color-status-success)',
  pos: 'var(--color-mint)',
  bank_transfer: 'var(--color-status-info)'
}

const startOfDay = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const endOfDay = (offset = 0) => startOfDay(offset) + 86_400_000 - 1
const isToday = (iso: string) => {
  const t = new Date(iso).getTime()
  return t >= startOfDay() && t <= endOfDay()
}
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface OwnerMetrics {
  collectedToday: number
  collectedTrendPct: number
  invoicedToday: number
  outstandingTotal: number
  outstandingCount: number
  agingTotal: number
  averageTatHrs: number | null
  byMethod: Array<{ method: PaymentMethod; amount: number }>
  weekly: Array<{ day: string; amount: number }>
  pending: number
  stuck: number
  syncedRecords: number
  activity: Array<{ id: string; patient: string; service: string; amount: number; method: PaymentMethod; time: string }>
}

async function computeOwnerMetrics(): Promise<OwnerMetrics> {
  const [invoices, payments, samples, results, patients, pending, stuck] = await Promise.all([
    db.invoices.toArray() as Promise<Invoice[]>,
    db.payments.toArray() as Promise<Payment[]>,
    db.samples.toArray() as Promise<Sample[]>,
    db.results.toArray() as Promise<Result[]>,
    db.patients.toArray() as Promise<Patient[]>,
    syncEngine.pendingCount(),
    syncEngine.stuckCount()
  ])
  const live = payments.filter((p) => !p.voided)
  const nameByLabid = new Map(patients.map((p) => [p.labid, p.full_name]))
  const invoiceById = new Map(invoices.map((i) => [i.invoice_id, i]))

  const collectedToday = live.filter((p) => isToday(p.created_at)).reduce((a, p) => a + p.amount, 0)
  const collectedYesterday = live
    .filter((p) => new Date(p.created_at).getTime() >= startOfDay(-1) && new Date(p.created_at).getTime() <= endOfDay(-1))
    .reduce((a, p) => a + p.amount, 0)
  const collectedTrendPct = collectedYesterday > 0 ? Math.round(((collectedToday - collectedYesterday) / collectedYesterday) * 100) : 0

  const invoicedToday = invoices.filter((i) => isToday(i.created_at)).reduce((a, i) => a + i.total, 0)

  const outstandingInvoices = invoices.filter((i) => i.outstanding > 0)
  const outstandingTotal = outstandingInvoices.reduce((a, i) => a + i.outstanding, 0)
  const agingTotal = outstandingInvoices
    .filter((i) => Date.now() - new Date(i.created_at).getTime() > 30 * 86_400_000)
    .reduce((a, i) => a + i.outstanding, 0)

  const tatVals = results
    .filter((r) => r.approved_at && isToday(r.approved_at))
    .map((r) => {
      const s = samples.find((sm) => sm.sample_id === r.sample_id)
      return s && r.approved_at ? new Date(r.approved_at).getTime() - new Date(s.collected_at).getTime() : null
    })
    .filter((v): v is number => v !== null)
  const averageTatHrs = tatVals.length ? tatVals.reduce((a, v) => a + v, 0) / tatVals.length / 3_600_000 : null

  const methodMap = new Map<PaymentMethod, number>()
  for (const p of live.filter((pp) => isToday(pp.created_at))) {
    methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + p.amount)
  }
  const byMethod = [...methodMap.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount)

  const weekly = Array.from({ length: 7 }, (_, idx) => {
    const off = idx - 6
    const s = startOfDay(off)
    const e = endOfDay(off)
    const amount = live
      .filter((p) => new Date(p.created_at).getTime() >= s && new Date(p.created_at).getTime() <= e)
      .reduce((a, p) => a + p.amount, 0)
    return { day: DAY_NAMES[new Date(s).getDay()], amount: amount / 100 }
  })

  const activity = [...live]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)
    .map((p) => {
      const inv = invoiceById.get(p.invoice_id)
      const service = inv ? inv.line_items.map((li) => li.test_name).join(', ') : '—'
      return {
        id: p.id,
        patient: inv ? nameByLabid.get(inv.labid) ?? inv.labid : '—',
        service,
        amount: p.amount,
        method: p.method,
        time: timeLabel(p.created_at)
      }
    })

  return {
    collectedToday, collectedTrendPct, invoicedToday, outstandingTotal, outstandingCount: outstandingInvoices.length,
    agingTotal, averageTatHrs, byMethod, weekly, pending, stuck, syncedRecords: invoices.length + payments.length + results.length,
    activity
  }
}

export function OwnerDashboard() {
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

  return (
    <div className="owner">
      <header className="owner__head">
        <div>
          <h1 className="owner__title">Owner dashboard</h1>
          <p className="owner__subtitle">Real-time clinical performance and financial reconciliation.</p>
        </div>
        <div className="owner__head-actions">
          <span className="owner__chip">Last 7 days</span>
          <button className="btn btn--primary btn--sm">
            <Download size={15} /> Export report
          </button>
        </div>
      </header>

      {/* Hero cards */}
      <div className="owner__hero">
        <article className="hero-card hero-card--revenue">
          <div className="hero-card__top">
            <span className="hero-card__label">Today’s revenue</span>
            <span className="hero-card__icon hero-card__icon--green"><Banknote size={18} /></span>
          </div>
          <div className="hero-card__value">
            {formatNaira(m.collectedToday)}
            {m.collectedTrendPct !== 0 ? (
              <span className="hero-card__trend">{m.collectedTrendPct > 0 ? '+' : ''}{m.collectedTrendPct}%</span>
            ) : null}
          </div>
          <div className="hero-card__foot">
            <span>Invoiced today</span>
            <strong>{formatNaira(m.invoicedToday)}</strong>
          </div>
        </article>

        <article className="hero-card hero-card--outstanding">
          <div className="hero-card__top">
            <span className="hero-card__label">Outstanding balances</span>
            <span className="hero-card__icon hero-card__icon--red"><ReceiptText size={18} /></span>
          </div>
          <div className="hero-card__value hero-card__value--red">
            {formatNaira(m.outstandingTotal)}
            <span className="hero-card__sub-inline">{m.outstandingCount} invoices</span>
          </div>
          <div className="hero-card__foot">
            <span>Aging (&gt;30 days)</span>
            <strong className="owner__danger">{formatNaira(m.agingTotal)}</strong>
          </div>
        </article>

        <article className="hero-card hero-card--tat">
          <div className="hero-card__top">
            <span className="hero-card__label">Turnaround time</span>
            <span className="hero-card__icon hero-card__icon--blue"><Clock size={18} /></span>
          </div>
          <div className="hero-card__value hero-card__value--blue">
            {m.averageTatHrs != null ? `${m.averageTatHrs.toFixed(1)} hrs` : '—'}
          </div>
          <div className="hero-card__foot">
            <span>Lab target</span>
            <strong>6.0 hrs</strong>
          </div>
        </article>
      </div>

      {/* Chart + right column */}
      <div className="owner__mid">
        <section className="owner-panel">
          <div className="owner-panel__head">
            <h3>Weekly revenue trend</h3>
          </div>
          <div className="owner__chart">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={m.weekly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [formatNaira(Math.round(v) * 100), 'Collected']}
                  contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 13 }}
                />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="owner__side">
          <section className="owner-sync">
            <span className="owner-sync__label">Sync health</span>
            <span className="owner-sync__status">{m.stuck > 0 ? 'Needs attention' : 'System synced'}</span>
            <span className="owner-sync__meta">Synced records</span>
            <span className="owner-sync__count">{m.syncedRecords.toLocaleString()}</span>
            <span className="owner-sync__pending">{m.pending} pending{m.stuck > 0 ? ` · ${m.stuck} stuck` : ''}</span>
          </section>

          <section className="owner-panel">
            <div className="owner-panel__head">
              <h3>Reconciliation</h3>
              <span className="owner-panel__meta">Collected today</span>
            </div>
            <div className="owner-recon">
              {m.byMethod.length === 0 ? (
                <p className="owner-recon__empty">No payments recorded today.</p>
              ) : (
                m.byMethod.map((r) => (
                  <div className="owner-recon__row" key={r.method}>
                    <span className="owner-recon__label">
                      <i className="owner-recon__dot" style={{ background: METHOD_DOT[r.method] ?? 'var(--color-text-tertiary)' }} />
                      {METHOD_LABEL[r.method]}
                    </span>
                    <span className="owner-recon__amt">{formatNaira(r.amount)}</span>
                  </div>
                ))
              )}
              <div className="owner-recon__total">
                <span>Total collected</span>
                <strong>{formatNaira(m.collectedToday)}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Financial activity log */}
      <section className="owner-panel">
        <div className="owner-panel__head">
          <h3>Financial activity log</h3>
          <span className="owner-panel__link">View all transactions</span>
        </div>
        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Service</th>
                <th className="right">Amount</th>
                <th>Method</th>
                <th className="right">Time</th>
              </tr>
            </thead>
            <tbody>
              {m.activity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="owner-table__empty">No transactions yet today.</td>
                </tr>
              ) : (
                m.activity.map((a) => (
                  <tr key={a.id}>
                    <td className="owner-table__strong">{a.patient}</td>
                    <td className="owner-table__muted">{a.service}</td>
                    <td className="right owner-table__strong">{formatNaira(a.amount)}</td>
                    <td>
                      <span className="owner-pill">{METHOD_LABEL[a.method]}</span>
                    </td>
                    <td className="right owner-table__muted">{a.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
