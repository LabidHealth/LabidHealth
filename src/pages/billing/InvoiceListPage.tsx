import React, { useEffect, useMemo, useState } from 'react'
import { invoiceRepo, patientRepo } from '@/lib/repositories'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { formatNaira, formatDateTime } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import type { Invoice, Patient } from '@/types'

type TabFilter = 'all' | 'unpaid' | 'partial' | 'paid'

function invoiceStatusBadge(status: Invoice['status']): 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'INFO' {
  if (status === 'paid') return 'SUCCESS'
  if (status === 'partial') return 'WARNING'
  if (status === 'unpaid') return 'CRITICAL'
  return 'INFO'
}

async function syncBillingFromSupabase() {
  if (!navigator.onLine) return
  const [{ data: invoices }, { data: patients }] = await Promise.all([
    supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('patients').select('*')
  ])
  if (invoices) await invoiceRepo.bulkPut(invoices)
  if (patients) await patientRepo.bulkPut(patients)
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
    const load = async () => {
      const [localInvoices, localPatients] = await Promise.all([
        invoiceRepo.listRecent(),
        patientRepo.all()
      ])
      if (mounted) { setInvoices(localInvoices); setPatients(localPatients) }
      await syncBillingFromSupabase()
      const [fresh, freshP] = await Promise.all([
        invoiceRepo.listRecent(),
        patientRepo.all()
      ])
      if (mounted) { setInvoices(fresh); setPatients(freshP) }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const patientByLabid = useMemo(() => new Map(patients.map((p) => [p.labid, p])), [patients])

  // Daily reconciliation (today, owner only)
  const todayReconciliation = useMemo(() => {
    if (!isOwner) return null
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const todayInvoices = invoices.filter((inv) => new Date(inv.created_at) >= start)
    const totalCollected = todayInvoices.reduce((s, inv) => s + inv.amount_paid, 0)
    const totalOutstanding = todayInvoices.reduce((s, inv) => s + inv.outstanding, 0)
    return { totalCollected, totalOutstanding, count: todayInvoices.length }
  }, [invoices, isOwner])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter((inv) => {
      if (tab !== 'all' && inv.status !== tab) return false
      if (q) {
        const patient = patientByLabid.get(inv.labid)
        return (
          inv.invoice_id.toLowerCase().includes(q) ||
          inv.labid.toLowerCase().includes(q) ||
          (patient?.full_name.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [invoices, tab, search, patientByLabid])

  return (
    <section>
      <header className="list-header">
        <div>
          <h2>Billing</h2>
          <p className="list-subtitle">{filtered.length} invoices</p>
        </div>
        <div className="list-actions">
          <Input
            placeholder="Search invoice, patient, LABID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Owner reconciliation summary */}
      {isOwner && todayReconciliation ? (
        <div className="dashboard-row" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-card__label">Total Collected Today</div>
            <div className="stat-card__value">{formatNaira(todayReconciliation.totalCollected)}</div>
            <div className="stat-card__sub">{todayReconciliation.count} invoices</div>
          </div>
          <div className={`stat-card${todayReconciliation.totalOutstanding > 0 ? ' stat-card--warning' : ''}`}>
            <div className="stat-card__label">Outstanding Today</div>
            <div className="stat-card__value">{formatNaira(todayReconciliation.totalOutstanding)}</div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="filter-row">
        {(['all', 'unpaid', 'partial', 'paid'] as TabFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`filter-chip${tab === t ? ' filter-chip--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="-" headline={`No ${tab === 'all' ? '' : tab} invoices`} description="Invoices are created automatically on sample registration." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th>Invoice ID</th>
              <th>Patient</th>
              <th>Tests</th>
              <th>Total</th>
              <th>Outstanding</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map((inv) => {
              const patient = patientByLabid.get(inv.labid)
              const testNames = inv.line_items.slice(0, 2).map((l) => l.test_name).join(', ')
              const extra = inv.line_items.length > 2 ? ` +${inv.line_items.length - 2} more` : ''
              return (
                <TableRow key={inv.id} onClick={() => navigate(`/app/billing/${inv.id}`)}>
                  <TableCell className="table-id">#{inv.invoice_id}</TableCell>
                  <TableCell>{patient?.full_name ?? inv.labid}</TableCell>
                  <TableCell>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{testNames}{extra}</span>
                  </TableCell>
                  <TableCell>{formatNaira(inv.total)}</TableCell>
                  <TableCell>
                    <span style={{ color: inv.outstanding > 0 ? 'var(--color-status-danger)' : 'var(--color-status-success)', fontWeight: inv.outstanding > 0 ? 600 : 400 }}>
                      {inv.outstanding > 0 ? formatNaira(inv.outstanding) : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge status={invoiceStatusBadge(inv.status)}>{inv.status.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 12 }}>{formatDateTime(inv.created_at)}</span>
                  </TableCell>
                  <TableCell onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}>
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/app/billing/${inv.id}`)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
