import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '@/lib/db'
import type { Patient, PriceListItem, Result, ResultParameter, Sample } from '@/types'

const ABBR: Record<string, string> = {
  haemoglobin: 'Hb', packed_cell_volume: 'PCV', wbc_total: 'WBC', platelets: 'PLT', neutrophils: 'NEU',
  total_cholesterol: 'CHOL', hdl_cholesterol: 'HDL', ldl_cholesterol: 'LDL', triglycerides: 'TRIG'
}
const abbr = (k: string) => ABBR[k] ?? k.replace(/_/g, ' ').slice(0, 4).toUpperCase()

const QUEUE_STATUSES = new Set(['received', 'processing', 'awaiting_approval'])

type Row = {
  sampleRowId: string
  sampleId: string
  labid: string
  patient: string
  test: string
  status: Sample['status']
  isStat: boolean
  waitMs: number
  preview: Array<{ key: string; value: string; status: ResultParameter['status'] }>
  flagged: boolean
  action: 'enter' | 'review'
}

interface SciData {
  inProgress: number
  readyForReview: number
  statAlerts: number
  tat: string
  rows: Row[]
}

const fmtWait = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}

async function computeSciData(): Promise<SciData> {
  const [samples, results, patients, prices] = await Promise.all([
    db.samples.toArray() as Promise<Sample[]>,
    db.results.toArray() as Promise<Result[]>,
    db.patients.toArray() as Promise<Patient[]>,
    db.price_list.toArray() as Promise<PriceListItem[]>
  ])
  const nameByLabid = new Map(patients.map((p) => [p.labid, p.full_name]))
  const testByCode = new Map(prices.map((p) => [p.test_code, p.test_name]))
  const resultBySample = new Map(results.map((r) => [r.sample_id, r]))

  const queue = samples.filter((s) => QUEUE_STATUSES.has(s.status))
  const rows: Row[] = queue
    .map((s) => {
      const r = resultBySample.get(s.sample_id)
      const params = r ? Object.entries(r.parameters) : []
      const flaggedFirst = [...params].sort((a, b) => Number(b[1].status !== 'normal') - Number(a[1].status !== 'normal'))
      const preview = flaggedFirst.slice(0, 2).map(([key, p]) => ({ key, value: p.value, status: p.status }))
      const flagged = params.some(([, p]) => p.status !== 'normal')
      const test = r?.test_type ?? testByCode.get(s.tests_ordered[0]) ?? s.tests_ordered[0]
      return {
        sampleRowId: s.id,
        sampleId: s.sample_id,
        labid: s.labid,
        patient: nameByLabid.get(s.labid) ?? s.labid,
        test,
        status: s.status,
        isStat: s.is_stat,
        waitMs: Date.now() - new Date(s.collected_at).getTime(),
        preview,
        flagged,
        action: (s.status === 'awaiting_approval' ? 'review' : 'enter') as Row['action']
      }
    })
    .sort((a, b) => Number(b.isStat) - Number(a.isStat) || b.waitMs - a.waitMs)

  const inProgress = samples.filter((s) => s.status === 'received' || s.status === 'processing').length
  const readyForReview = results.filter((r) => r.status === 'awaiting_approval').length
  const statAlerts = samples.filter((s) => s.is_stat && s.status !== 'delivered' && s.status !== 'ready').length

  const tatVals = results
    .filter((r) => r.approved_at)
    .map((r) => {
      const s = samples.find((sm) => sm.sample_id === r.sample_id)
      return s && r.approved_at ? new Date(r.approved_at).getTime() - new Date(s.collected_at).getTime() : null
    })
    .filter((v): v is number => v !== null)
  const tat = tatVals.length ? `${(tatVals.reduce((a, v) => a + v, 0) / tatVals.length / 3_600_000).toFixed(1)} hrs` : '—'

  return { inProgress, readyForReview, statAlerts, tat, rows }
}

const STATUS_LABEL: Record<Sample['status'], string> = {
  received: 'Received', processing: 'In progress', awaiting_approval: 'Ready',
  ready: 'Ready', delivered: 'Delivered', rejected: 'Rejected'
}
const STATUS_TONE: Partial<Record<Sample['status'], string>> = {
  received: 'c-slate', processing: 'c-amber', awaiting_approval: 'c-blue'
}

export function ScientistDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<SciData | null>(null)
  const [tab, setTab] = useState<'all' | 'stat' | 'flagged'>('all')

  useEffect(() => {
    let mounted = true
    void computeSciData().then((d) => {
      if (mounted) setData(d)
    })
    return () => {
      mounted = false
    }
  }, [])

  const rows = useMemo(() => {
    if (!data) return []
    if (tab === 'stat') return data.rows.filter((r) => r.isStat)
    if (tab === 'flagged') return data.rows.filter((r) => r.flagged)
    return data.rows
  }, [data, tab])

  if (!data) return <div className="app-loading">Loading…</div>

  return (
    <div className="sci">
      <header className="sci__head">
        <div>
          <h1 className="sci__title">Scientist workbench</h1>
          <p className="sci__subtitle">Manage active pipelines and finalize medical results.</p>
        </div>
        <div className="sci__tabs" role="tablist">
          {(['all', 'stat', 'flagged'] as const).map((t) => (
            <button key={t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
              {t === 'all' ? 'All tests' : t === 'stat' ? 'STAT only' : 'Flagged'}
            </button>
          ))}
        </div>
      </header>

      <div className="sci__stats">
        <div className="sci-stat sci-stat--blue"><span className="sci-stat__label">In progress</span><span className="sci-stat__value">{data.inProgress}</span></div>
        <div className="sci-stat"><span className="sci-stat__label">Ready for review</span><span className="sci-stat__value">{data.readyForReview}</span></div>
        <div className="sci-stat sci-stat--red"><span className="sci-stat__label">STAT alerts</span><span className="sci-stat__value">{data.statAlerts}</span></div>
        <div className="sci-stat"><span className="sci-stat__label">TAT average</span><span className="sci-stat__value">{data.tat}</span></div>
      </div>

      <section className="owner-panel">
        <div className="owner-panel__head">
          <h3>Result queue</h3>
          <span className="owner-panel__meta">STAT pinned · oldest first</span>
        </div>
        <div className="owner-table-wrap">
          <table className="owner-table sci-table">
            <thead>
              <tr>
                <th>Lab ID</th>
                <th>Test</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Result preview</th>
                <th className="right">Waiting</th>
                <th className="right"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="owner-table__empty">Nothing in the queue.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.sampleRowId} className={r.isStat ? 'sci-row--stat' : ''}>
                    <td><span className="table-id">#{r.sampleId}</span></td>
                    <td className="owner-table__strong">{r.test}{r.isStat ? <span className="sci-stat-tag">STAT</span> : null}</td>
                    <td>{r.patient}</td>
                    <td><span className={`chip ${STATUS_TONE[r.status] ?? 'c-slate'}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td>
                      <span className="sci-chip-row">
                        {r.preview.length === 0 ? <span className="owner-table__muted">—</span> : r.preview.map((p) => (
                          <span key={p.key} className={`sci-chip ${p.status === 'high' || p.status === 'critical_high' ? 'sci-chip--hi' : p.status === 'low' || p.status === 'critical_low' ? 'sci-chip--lo' : 'sci-chip--ok'}`}>
                            {abbr(p.key)} {p.value}{p.status === 'high' || p.status === 'critical_high' ? ' ↑' : p.status === 'low' || p.status === 'critical_low' ? ' ↓' : ''}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="right"><span className="sci-wait">{fmtWait(r.waitMs)}</span></td>
                    <td className="right">
                      <button
                        className={`btn btn--sm ${r.action === 'review' ? 'btn--secondary' : 'btn--primary'}`}
                        onClick={() => navigate(`/app/samples/${r.sampleRowId}`)}
                      >
                        {r.action === 'review' ? 'Review final' : 'Enter results'}
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
