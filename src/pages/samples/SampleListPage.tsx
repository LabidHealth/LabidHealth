import React, { useEffect, useMemo, useState } from 'react'
import { patientRepo, sampleRepo } from '@/lib/repositories'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState } from '@/components/ui'
import { formatTimeAgo } from '@/lib/formatters'
import type { Patient, Sample } from '@/types'

type StatusFilter = 'received' | 'processing' | 'awaiting_approval' | 'ready' | 'delivered'

const PIPELINE: Array<{ status: StatusFilter; label: string; warn?: boolean }> = [
  { status: 'received', label: 'Received' },
  { status: 'processing', label: 'In progress' },
  { status: 'awaiting_approval', label: 'Awaiting approval', warn: true },
  { status: 'ready', label: 'Ready' },
  { status: 'delivered', label: 'Delivered' }
]
const CHIP: Record<string, string> = {
  received: 'c-slate', processing: 'c-amber', awaiting_approval: 'c-blue', ready: 'c-blue', delivered: 'c-green', rejected: 'c-red'
}
const LABEL: Record<string, string> = {
  received: 'Received', processing: 'In progress', awaiting_approval: 'Awaiting approval', ready: 'Ready', delivered: 'Delivered', rejected: 'Rejected'
}

export function SampleListPage() {
  const navigate = useNavigate()
  const [samples, setSamples] = useState<Sample[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [filter, setFilter] = useState<StatusFilter>('received')
  const [range, setRange] = useState<'today' | 'week'>('today')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    void (async () => {
      const [localSamples, localPatients] = await Promise.all([sampleRepo.all(), patientRepo.all()])
      if (!mounted) return
      setSamples(localSamples)
      setPatients(localPatients)
    })()
    return () => {
      mounted = false
    }
  }, [])

  const counts = useMemo(() => {
    const map: Record<StatusFilter, number> = { received: 0, processing: 0, awaiting_approval: 0, ready: 0, delivered: 0 }
    for (const s of samples) if (s.status in map) map[s.status as StatusFilter] += 1
    return map
  }, [samples])

  const patientByLabid = useMemo(() => new Map(patients.map((p) => [p.labid, p])), [patients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const start = new Date(); start.setHours(0, 0, 0, 0)
    if (range === 'week') start.setDate(start.getDate() - 7)
    return samples
      .filter((s) => s.status === filter)
      .filter((s) => new Date(s.collected_at).getTime() >= start.getTime())
      .filter((s) => {
        if (!q) return true
        const name = patientByLabid.get(s.labid)?.full_name?.toLowerCase() ?? ''
        return s.sample_id.toLowerCase().includes(q) || s.labid.toLowerCase().includes(q) || name.includes(q)
      })
  }, [filter, patientByLabid, range, samples, search])

  return (
    <div className="listpage">
      <header className="listpage__head">
        <div>
          <h1 className="listpage__title">Sample tracking</h1>
          <p className="listpage__sub">{filtered.length} samples in view</p>
        </div>
        <div className="listpage__actions">
          <div className="listpage__search">
            <Search size={16} />
            <input value={search} placeholder="Search sample ID or patient" onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="primary" onClick={() => navigate('/app/samples/register')}>Register sample</Button>
        </div>
      </header>

      <div className="pipe-row">
        {PIPELINE.map((stage) => (
          <button
            key={stage.status}
            type="button"
            className={`pipe-card${filter === stage.status ? ' is-active' : ''}${stage.warn ? ' is-warn' : ''}`}
            onClick={() => setFilter(stage.status)}
          >
            <div className="pipe-card__label">{stage.label}</div>
            <div className="pipe-card__value">{counts[stage.status]}</div>
          </button>
        ))}
      </div>

      <div className="listpage__range">
        <button className={`chip-tab${range === 'today' ? ' is-active' : ''}`} onClick={() => setRange('today')}>Today</button>
        <button className={`chip-tab${range === 'week' ? ' is-active' : ''}`} onClick={() => setRange('week')}>This week</button>
      </div>

      <section className="owner-panel">
        <div className="owner-panel__head">
          <h3>{LABEL[filter]} samples</h3>
          <span className="owner-panel__meta">{range === 'today' ? 'Today' : 'This week'}</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="-" headline={`No ${LABEL[filter].toLowerCase()} samples`} description="Samples appear here after registration." />
        ) : (
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Sample ID</th>
                  <th>Patient</th>
                  <th>Tests</th>
                  <th>Status</th>
                  <th>Doctor</th>
                  <th className="right">Elapsed</th>
                  <th className="right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const patient = patientByLabid.get(s.labid)
                  const tests = s.tests_ordered.length > 3
                    ? `${s.tests_ordered.slice(0, 2).join(', ')} +${s.tests_ordered.length - 2}`
                    : s.tests_ordered.join(', ')
                  return (
                    <tr key={s.id} className={s.is_stat ? 'sci-row--stat' : ''} style={{ cursor: 'pointer' }} onClick={() => navigate(`/app/samples/${s.id}`)}>
                      <td><span className="table-id">#{s.sample_id}</span></td>
                      <td className="owner-table__strong">
                        {patient?.full_name ?? s.labid}
                        {s.is_stat ? <span className="sci-stat-tag">STAT</span> : null}
                      </td>
                      <td className="owner-table__muted">{tests}</td>
                      <td><span className={`chip ${CHIP[s.status] ?? 'c-slate'}`}>{LABEL[s.status] ?? s.status}</span></td>
                      <td className="owner-table__muted">{s.referring_doctor ?? '—'}</td>
                      <td className="right owner-table__muted">{formatTimeAgo(s.collected_at)}</td>
                      <td className="right">
                        <button className="btn btn--sm btn--secondary" onClick={(e) => { e.stopPropagation(); navigate(`/app/samples/${s.id}`) }}>View</button>
                      </td>
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
