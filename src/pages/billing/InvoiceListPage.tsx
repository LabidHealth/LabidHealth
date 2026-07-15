import React, { useEffect, useMemo, useState } from 'react'
import { invoiceRepo, patientRepo } from '@/lib/repositories'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { formatNaira, formatDateTime } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import type { Invoice, Patient } from '@/types'

type TabFilter = 'all' | 'unpaid' | 'partial' | 'paid'

const CHIP: Record<Invoice['status'], string> = {
  paid: 'c-green', partial: 'c-amber', unpaid: 'c-red', refunded: 'c-slate', void: 'c-slate'
}

async function syncBillingFromSupabase() {
  if (!navigator.onLine) return
  try {
    const [{ data: invoices }, { data: patients }] = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('patients').select('*')
    ])
    if (invoices) await invoiceRepo.bulkPut(invoices)
    if (patients) await patientRepo.bulkPut(patients)
  } catch {
    // No backend configured (offline dev) — local data only.
  }
}

export function InvoiceListPage() {
  const navigate = useNavigate()
  const { role } = useAuthContext()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [tab, setTab] = useState<TabFilter>('all')
  const [search, setSearch] = useState('')

  const isOwner = role === 'owner'

  useEffect(() => {
    let mounted = true
    void (async () => {
      const [localInvoices, localPatients] = await Promise.all([invoiceRepo.listRecent(), patientRepo.all()])
      if (mounted) { setInvoices(localInvoices); setPatients(localPatients) }
      await syncBillingFromSupabase()
      const [fresh, freshP] = await Promise.all([invoiceRepo.listRecent(), patientRepo.all()])
      if (mounted) { setInvoices(fresh); setPatients(freshP) }
    })()
    return () => { mounted = false }
  }, [])

  const patientByLabid = useMemo(() => new Map(patients.map((p) => [p.labid, p])), [patients])

  const todayReconciliation = useMemo(() => {
    if (!isOwner) return null
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const today = invoices.filter((inv) => new Date(inv.created_at) >= start)
    return {
      totalCollected: today.reduce((s, inv) => s + inv.amount_paid, 0),
      totalOutstanding: today.reduce((s, inv) => s + inv.outstanding, 0),
      count: today.length
    }
  }, [invoices, isOwner])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter((inv) => {
      if (tab !== 'all' && inv.status !== tab) return false
      if (!q) return true
      const patient = patientByLabid.get(inv.labid)
      return (
        inv.invoice_id.toLowerCase().includes(q) ||
        inv.labid.toLowerCase().includes(q) ||
        (patient?.full_name.toLowerCase().includes(q) ?? false)
      )
    })
  }, [invoices, tab, search, patientByLabid])

  return (
    <div className="listpage">
      <header className="listpage__head">
        <div>
          <h1 className="listpage__title">Billing</h1>
          <p className="listpage__sub">{filtered.length} invoices</p>
        </div>
        <div className="listpage__actions">
          <div className="listpage__search">
            <Search size={16} />
            <input value={search} placeholder="Search invoice, patient, LABID" onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </header>

      {isOwner && todayReconciliation ? (
        <div className="listpage__summary">
          <article className="hero-card hero-card--revenue">
            <div className="hero-card__top"><span className="hero-card__label">Collected today</span></div>
            <div className="hero-card__value">{formatNaira(todayReconciliation.totalCollected)}</div>
            <div className="hero-card__foot"><span>Invoices today</span><strong>{todayReconciliation.count}</strong></div>
          </article>
          <article className="hero-card hero-card--outstanding">
            <div className="hero-card__top"><span className="hero-card__label">Outstanding today</span></div>
            <div className="hero-card__value hero-card__value--red">{formatNaira(todayReconciliation.totalOutstanding)}</div>
            <div className="hero-card__foot"><span>Awaiting payment</span></div>
          </article>
        </div>
      ) : null}

      <div className="listpage__range">
        {(['all', 'unpaid', 'partial', 'paid'] as TabFilter[]).map((t) => (
          <button key={t} className={`chip-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <section className="owner-panel">
        <div className="owner-panel__head">
          <h3>Invoices</h3>
          <span className="owner-panel__meta">{tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="-" headline={`No ${tab === 'all' ? '' : tab} invoices`} description="Invoices are created automatically on sample registration." />
        ) : (
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Tests</th>
                  <th className="right">Total</th>
                  <th className="right">Outstanding</th>
                  <th>Status</th>
                  <th className="right">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const patient = patientByLabid.get(inv.labid)
                  const tests = inv.line_items.slice(0, 2).map((l) => l.test_name).join(', ') + (inv.line_items.length > 2 ? ` +${inv.line_items.length - 2}` : '')
                  return (
                    <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/app/billing/${inv.id}`)}>
                      <td><span className="table-id">#{inv.invoice_id}</span></td>
                      <td className="owner-table__strong">{patient?.full_name ?? inv.labid}</td>
                      <td className="owner-table__muted">{tests}</td>
                      <td className="right owner-table__strong">{formatNaira(inv.total)}</td>
                      <td className="right" style={{ color: inv.outstanding > 0 ? 'var(--color-status-danger)' : 'var(--color-status-success)', fontWeight: 700 }}>
                        {inv.outstanding > 0 ? formatNaira(inv.outstanding) : 'Paid'}
                      </td>
                      <td><span className={`chip ${CHIP[inv.status]}`}>{inv.status}</span></td>
                      <td className="right owner-table__muted">{formatDateTime(inv.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
