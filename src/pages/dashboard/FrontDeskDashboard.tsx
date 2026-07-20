import React, { useEffect, useState } from 'react'
import { invoiceRepo, patientRepo, priceRepo, sampleRepo } from '@/lib/repositories'
import { useNavigate } from 'react-router-dom'
import { Banknote, Search, UserPlus } from 'lucide-react'
import { formatNaira } from '@/lib/formatters'
import type { Invoice, Patient, PriceListItem, Sample } from '@/types'

// Throughput surface on the lab PC: three big actions, then the live queue.
// State reads from the chips; the per-row action follows the row's state.

const AV_CLASSES = ['avatar--a', 'avatar--b', 'avatar--c', 'avatar--d', 'avatar--e']

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
function avatarClass(seed: string): string {
  let h = 0
  for (const c of seed) h = (h + c.charCodeAt(0)) % AV_CLASSES.length
  return AV_CLASSES[h]
}
// +234 803 •• 4417 — country code, first three, then the last four.
function maskPhone(raw: string | null | undefined): string {
  let d = (raw ?? '').replace(/\D/g, '')
  if (!d) return '—'
  if (d.startsWith('0')) d = `234${d.slice(1)}`
  else if (!d.startsWith('234') && d.length === 10) d = `234${d}`
  const nat = d.startsWith('234') ? d.slice(3) : d
  if (nat.length < 7) return `+${d}`
  return `+234 ${nat.slice(0, 3)} •• ${nat.slice(-4)}`
}

const startOfDay = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Sample status → queue chip (design-tokens status→colour map).
const STATUS: Record<Sample['status'], { label: string; tone: string }> = {
  received: { label: 'Sample collected', tone: 'c-sky' },
  processing: { label: 'In progress', tone: 'c-amber' },
  awaiting_approval: { label: 'In progress', tone: 'c-amber' },
  ready: { label: 'Ready', tone: 'c-blue' },
  delivered: { label: 'Sent', tone: 'c-green' },
  rejected: { label: 'Rejected', tone: 'c-red' }
}

type Row = {
  id: string
  labid: string
  patient: string
  phone: string | null
  tests: string
  status: Sample['status']
  balance: number
}
interface FdData {
  count: number
  rows: Row[]
}

async function computeFdData(): Promise<FdData> {
  const [samples, invoices, patients, prices] = await Promise.all([
    sampleRepo.all() as Promise<Sample[]>,
    invoiceRepo.all() as Promise<Invoice[]>,
    patientRepo.all() as Promise<Patient[]>,
    priceRepo.all() as Promise<PriceListItem[]>
  ])
  const patientByLabid = new Map(patients.map((p) => [p.labid, p]))
  const testByCode = new Map(prices.map((p) => [p.test_code, p.test_name]))
  const invoiceBySample = new Map(invoices.filter((i) => i.sample_id).map((i) => [i.sample_id as string, i]))

  const sod = startOfDay()
  const today = samples.filter((s) => new Date(s.collected_at).getTime() >= sod)
  const rows: Row[] = [...today]
    .sort((a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime())
    .map((s) => {
      const inv = invoiceBySample.get(s.sample_id)
      return {
        id: s.id,
        labid: s.labid,
        patient: patientByLabid.get(s.labid)?.full_name ?? s.labid,
        phone: patientByLabid.get(s.labid)?.phone ?? null,
        tests: s.tests_ordered.map((c) => testByCode.get(c) ?? c).join(', '),
        status: s.status,
        balance: inv?.outstanding ?? 0
      }
    })

  return { count: today.length, rows }
}

export function FrontDeskDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<FdData | null>(null)

  useEffect(() => {
    let mounted = true
    void computeFdData().then((d) => {
      if (mounted) setData(d)
    })
    return () => {
      mounted = false
    }
  }, [])

  if (!data) return <div className="app-loading">Loading…</div>

  return (
    <div className="sci">
      <header className="sci__head">
        <div>
          <h1 className="sci__title">Front desk</h1>
          <p className="sci__subtitle">Register patients and track diagnostic progress.</p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn--primary" onClick={() => navigate('/app/patients/register')}>
          <UserPlus size={16} /> Register patient
        </button>
        <button className="btn btn--secondary" onClick={() => navigate('/app/patients')}>
          <Search size={16} /> Find patient
        </button>
        <button className="btn btn--secondary" onClick={() => navigate('/app/billing')}>
          <Banknote size={16} /> Today’s money
        </button>
      </div>

      <section className="owner-panel">
        <div className="owner-panel__head">
          <h3>Today’s queue</h3>
          <span className="owner-panel__meta">{data.count} patient{data.count === 1 ? '' : 's'}</span>
        </div>
        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>LABID</th>
                <th>Patient</th>
                <th>Tests</th>
                <th>Status</th>
                <th className="right">Balance</th>
                <th className="right"></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr><td colSpan={6} className="owner-table__empty">No patients yet today.</td></tr>
              ) : (
                data.rows.map((v) => {
                  const owing = v.balance > 0
                  const st = STATUS[v.status]
                  const action = owing ? 'Take payment' : v.status === 'delivered' ? 'View' : 'Resend'
                  return (
                    <tr key={v.id}>
                      <td><span className="table-id">{v.labid}</span></td>
                      <td>
                        <span className="patient-cell">
                          <span className={`avatar ${avatarClass(v.patient)}`}>{initials(v.patient)}</span>
                          <span>
                            <span className="owner-table__strong" style={{ display: 'block' }}>{v.patient}</span>
                            <span className="owner-table__muted num" style={{ fontSize: 11.5 }}>{maskPhone(v.phone)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="owner-table__muted">{v.tests}</td>
                      <td><span className={`chip ${st.tone}`}>{st.label}</span></td>
                      <td className="right num" style={{ fontWeight: 700, color: owing ? '#c0392b' : 'var(--color-status-success)' }}>
                        {owing ? formatNaira(v.balance) : 'Paid'}
                      </td>
                      <td className="right">
                        <button
                          className={`btn btn--sm ${owing ? 'btn--primary' : 'btn--secondary'}`}
                          onClick={() => navigate(`/app/patients/${v.labid}`)}
                        >
                          {action}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
