import React, { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui'
import { db } from '@/lib/db'
import { formatTimeAgo } from '@/lib/formatters'
import type { Patient, Sample } from '@/types'

type StatusFilter = 'received' | 'processing' | 'awaiting_approval' | 'ready' | 'delivered'

const PIPELINE: Array<{ status: StatusFilter; label: string }> = [
  { status: 'received', label: 'RECEIVED' },
  { status: 'processing', label: 'PROCESSING' },
  { status: 'awaiting_approval', label: 'AWAITING APPROVAL' },
  { status: 'ready', label: 'READY' },
  { status: 'delivered', label: 'DELIVERED' }
]

export function SampleListPage() {
  const navigate = useNavigate()
  const [samples, setSamples] = useState<Sample[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [filter, setFilter] = useState<StatusFilter>('received')
  const [range, setRange] = useState<'today' | 'week'>('today')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [localSamples, localPatients] = await Promise.all([db.samples.toArray(), db.patients.toArray()])
      if (!mounted) return
      setSamples(localSamples)
      setPatients(localPatients)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const counts = useMemo(() => {
    const map: Record<StatusFilter, number> = {
      received: 0,
      processing: 0,
      awaiting_approval: 0,
      ready: 0,
      delivered: 0
    }
    for (const sample of samples) {
      if (sample.status in map) map[sample.status as StatusFilter] += 1
    }
    return map
  }, [samples])

  const filtered = useMemo(() => {
    const lowered = search.trim().toLowerCase()
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    if (range === 'week') start.setDate(now.getDate() - 7)

    const patientByLabid = new Map(patients.map((p) => [p.labid, p]))

    return samples
      .filter((sample) => sample.status === filter)
      .filter((sample) => new Date(sample.collected_at).getTime() >= start.getTime())
      .filter((sample) => {
        if (!lowered) return true
        const patient = patientByLabid.get(sample.labid)
        const patientName = patient?.full_name?.toLowerCase() ?? ''
        return (
          sample.sample_id.toLowerCase().includes(lowered) ||
          sample.labid.toLowerCase().includes(lowered) ||
          patientName.includes(lowered)
        )
      })
  }, [filter, patients, range, samples, search])

  const patientByLabid = useMemo(() => new Map(patients.map((p) => [p.labid, p])), [patients])

  return (
    <section>
      <header className="list-header">
        <div>
          <h2>Sample Tracking</h2>
          <p className="list-subtitle">{filtered.length} samples in view</p>
        </div>
        <div className="list-actions">
          <div className="search-field">
            <Search className="header-icon" />
            <Input className="search-input" value={search} placeholder="Search Sample ID or patient" onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="primary" onClick={() => navigate('/app/samples/register')}>
            Register sample
          </Button>
        </div>
      </header>

      <div className="dashboard-row">
        {PIPELINE.map((stage) => {
          const isActive = filter === stage.status
          const isAwaiting = stage.status === 'awaiting_approval'
          const cardClass = `stat-card${isActive && !isAwaiting ? ' stat-card--active' : ''}${isAwaiting ? ' stat-card--warning' : ''}`
          return (
            <button
              key={stage.status}
              type="button"
              className={cardClass}
              onClick={() => setFilter(stage.status)}
              style={{ textAlign: 'left' }}
            >
              <div className="stat-card__label">{stage.label}</div>
              <div className="stat-card__value">{counts[stage.status]}</div>
            </button>
          )
        })}
      </div>

      <div className="filter-row" style={{ marginTop: 12 }}>
        <button type="button" className={`filter-chip${range === 'today' ? ' filter-chip--active' : ''}`} onClick={() => setRange('today')}>
          Today
        </button>
        <button type="button" className={`filter-chip${range === 'week' ? ' filter-chip--active' : ''}`} onClick={() => setRange('week')}>
          This Week
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="-" headline={`No samples ${filter.replace('_', ' ')}`} description="Samples will appear here after registration." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th>Sample ID</th>
              <th>Patient</th>
              <th>Tests</th>
              <th>Status</th>
              <th>Referring Doctor</th>
              <th>Elapsed</th>
              <th>Actions</th>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map((sample) => {
              const patient = patientByLabid.get(sample.labid)
              const testsLabel =
                sample.tests_ordered.length > 3
                  ? `${sample.tests_ordered.slice(0, 2).join(', ')} +${sample.tests_ordered.length - 2} more`
                  : sample.tests_ordered.join(', ')
              return (
                <TableRow
                  key={sample.id}
                  className={sample.is_stat ? 'stat-row' : ''}
                  onClick={() => navigate(`/app/samples/${sample.id}`)}
                >
                  <TableCell className="table-id">#{sample.sample_id}</TableCell>
                  <TableCell>{patient ? `${patient.full_name} (${patient.labid})` : sample.labid}</TableCell>
                  <TableCell>{testsLabel}</TableCell>
                  <TableCell>
                    <Badge status={sample.status === 'awaiting_approval' ? 'AWAITING APPROVAL' : (sample.status.toUpperCase() as 'RECEIVED' | 'PROCESSING' | 'READY' | 'DELIVERED')}>
                      {sample.status.replace('_', ' ')}
                    </Badge>
                    {sample.is_stat ? <span style={{ marginLeft: 8 }}><Badge status="STAT" /></span> : null}
                  </TableCell>
                  <TableCell>{sample.referring_doctor ?? '-'}</TableCell>
                  <TableCell>{formatTimeAgo(sample.collected_at)}</TableCell>
                  <TableCell className="table-actions">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/app/samples/${sample.id}`)}>
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

