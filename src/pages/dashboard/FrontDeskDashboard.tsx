import React, { useEffect, useState } from 'react'
import { invoiceRepo, patientRepo, priceRepo, sampleRepo } from '@/lib/repositories'
import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import type { Invoice, InvoiceStatus, Patient, PriceListItem, Sample } from '@/types'

const startOfDay = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })

const PAY_LABEL: Record<InvoiceStatus, string> = {
  paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid', refunded: 'Refunded', void: 'Void'
}
const PAY_TONE: Record<InvoiceStatus, string> = {
  paid: 'c-green', partial: 'c-amber', unpaid: 'c-red', refunded: 'c-slate', void: 'c-slate'
}

type Visit = {
  id: string
  patient: string
  labid: string
  tests: string
  arrival: string
  payStatus: InvoiceStatus
  owing: boolean
}
interface FdData {
  todayPatients: number
  pendingResults: number
  awaitingPayment: number
  visits: Visit[]
}

async function computeFdData(): Promise<FdData> {
  const [samples, invoices, patients, prices] = await Promise.all([
    sampleRepo.all() as Promise<Sample[]>,
    invoiceRepo.all() as Promise<Invoice[]>,
    patientRepo.all() as Promise<Patient[]>,
    priceRepo.all() as Promise<PriceListItem[]>
  ])
  const nameByLabid = new Map(patients.map((p) => [p.labid, p.full_name]))
  const testByCode = new Map(prices.map((p) => [p.test_code, p.test_name]))
  const invoiceBySample = new Map(invoices.filter((i) => i.sample_id).map((i) => [i.sample_id as string, i]))

  const sod = startOfDay()
  const todayPatients = samples.filter((s) => new Date(s.collected_at).getTime() >= sod).length
  const pendingResults = samples.filter((s) => s.status !== 'delivered').length
  const awaitingPayment = invoices.filter((i) => i.outstanding > 0).length

  const visits: Visit[] = [...samples]
    .sort((a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime())
    .slice(0, 8)
    .map((s) => {
      const inv = invoiceBySample.get(s.sample_id)
      const status: InvoiceStatus = inv?.status ?? 'unpaid'
      return {
        id: s.id,
        patient: nameByLabid.get(s.labid) ?? s.labid,
        labid: s.labid,
        tests: s.tests_ordered.map((c) => testByCode.get(c) ?? c).join(', '),
        arrival: timeLabel(s.collected_at),
        payStatus: status,
        owing: (inv?.outstanding ?? 0) > 0
      }
    })

  return { todayPatients, pendingResults, awaitingPayment, visits }
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
        <button className="btn btn--primary" onClick={() => navigate('/app/patients/register')}>
          <UserPlus size={16} /> New patient registration
        </button>
      </header>

      <div className="fd__stats">
        <div className="sci-stat sci-stat--blue"><span className="sci-stat__label">Patients today</span><span className="sci-stat__value">{data.todayPatients}</span></div>
        <div className="sci-stat"><span className="sci-stat__label">Pending results</span><span className="sci-stat__value">{data.pendingResults}</span></div>
        <div className="sci-stat"><span className="sci-stat__label">Awaiting payment</span><span className="sci-stat__value">{data.awaitingPayment}</span></div>
      </div>

      <section className="owner-panel">
        <div className="owner-panel__head">
          <h3>Today’s queue</h3>
          <span className="owner-panel__meta">Most recent first</span>
        </div>
        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>LABID</th>
                <th>Tests</th>
                <th className="right">Arrival</th>
                <th>Payment</th>
                <th className="right"></th>
              </tr>
            </thead>
            <tbody>
              {data.visits.length === 0 ? (
                <tr><td colSpan={6} className="owner-table__empty">No patients yet today.</td></tr>
              ) : (
                data.visits.map((v) => (
                  <tr key={v.id}>
                    <td className="owner-table__strong">{v.patient}</td>
                    <td><span className="table-id">{v.labid}</span></td>
                    <td className="owner-table__muted">{v.tests}</td>
                    <td className="right owner-table__muted">{v.arrival}</td>
                    <td><span className={`chip ${PAY_TONE[v.payStatus]}`}>{PAY_LABEL[v.payStatus]}</span></td>
                    <td className="right">
                      <button
                        className={`btn btn--sm ${v.owing ? 'btn--primary' : 'btn--secondary'}`}
                        onClick={() => navigate(`/app/patients/${v.labid}`)}
                      >
                        {v.owing ? 'Take payment' : 'View'}
                      </button>
                    </td>
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
