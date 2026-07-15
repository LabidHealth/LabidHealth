import React, { useEffect, useState } from 'react'
import { amendmentRepo, patientRepo, resultRepo } from '@/lib/repositories'
import { CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, EmptyState, Input, Modal, Table, TableBody, TableCell, TableHead, TableRow, useToast } from '@/components/ui'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { useAuthContext } from '@/context/AuthContext'
import { formatTimeAgo, formatDateTime } from '@/lib/formatters'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError } from '@/lib/supabaseQuery'
import { supabase } from '@/lib/supabase'
import type { Patient, Result, ResultAmendment } from '@/types'

type Tab = 'pending' | 'all'
type StatusFilter = 'all' | 'draft' | 'awaiting_approval' | 'approved' | 'amended'

interface ResultRow {
  result: Result
  patient: Patient | undefined
}

async function syncResultsFromSupabase() {
  if (!navigator.onLine) return
  const [{ data: results }, { data: patients }] = await Promise.all([
    supabase.from('results').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('patients').select('*')
  ])
  if (results) await resultRepo.bulkPut(results)
  if (patients) await patientRepo.bulkPut(patients)
}

export function ResultListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { role } = useAuthContext()

  const [tab, setTab] = useState<Tab>('pending')
  const [results, setResults] = useState<Result[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  // Amendment modal
  const [amendTarget, setAmendTarget] = useState<Result | null>(null)
  const [amendReason, setAmendReason] = useState('')
  const [amending, setAmending] = useState(false)

  const canApprove = role === 'manager' || role === 'owner'

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [localResults, localPatients] = await Promise.all([
        resultRepo.listRecent(),
        patientRepo.all()
      ])
      if (mounted) {
        setResults(localResults)
        setPatients(localPatients)
      }
      await syncResultsFromSupabase()
      const [freshResults, freshPatients] = await Promise.all([
        resultRepo.listRecent(),
        patientRepo.all()
      ])
      if (mounted) {
        setResults(freshResults)
        setPatients(freshPatients)
      }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const patientByLabid = new Map(patients.map((p) => [p.labid, p]))

  const pendingRows: ResultRow[] = results
    .filter((r) => r.status === 'awaiting_approval')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) // oldest first
    .map((r) => ({ result: r, patient: patientByLabid.get(r.labid) }))

  const allRows: ResultRow[] = results
    .filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const patient = patientByLabid.get(r.labid)
        return (
          r.labid.toLowerCase().includes(q) ||
          r.test_type.toLowerCase().includes(q) ||
          (patient?.full_name.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
    .map((r) => ({ result: r, patient: patientByLabid.get(r.labid) }))

  async function handleAmend() {
    if (!amendTarget || !amendReason.trim()) {
      toast.push('Amendment reason is required', 'error')
      return
    }
    setAmending(true)
    try {
      const now = new Date().toISOString()

      // Save current state to result_amendments
      const amendment: ResultAmendment = {
        id: crypto.randomUUID(),
        result_id: amendTarget.id,
        previous_parameters: amendTarget.parameters,
        previous_comments: amendTarget.comments ?? null,
        amendment_reason: amendReason.trim(),
        amended_by: null,
        amended_at: now
      }
      await amendmentRepo.create(amendment)

      // Reopen result for editing
      const reopened: Result = {
        ...amendTarget,
        status: 'draft',
        approved_by: null,
        approved_at: null,
        updated_at: now
      }
      await resultRepo.update(reopened, amendTarget)
      setResults((prev) => prev.map((r) => (r.id === reopened.id ? reopened : r)))

      toast.push(offlineSuccessMessage('Result reopened for amendment'))
      setAmendTarget(null)
      setAmendReason('')
      navigate(`/app/results/${amendTarget.id}/entry`)
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setAmending(false)
    }
  }

  function statusBadgeStatus(status: Result['status']) {
    if (status === 'approved') return 'SUCCESS' as const
    if (status === 'awaiting_approval') return 'AWAITING APPROVAL' as const
    if (status === 'amended') return 'WARNING' as const
    if (status === 'draft') return 'INFO' as const
    return 'INFO' as const
  }

  return (
    <section>
      {/* Page header */}
      <header className="list-header">
        <div>
          <h2>Results</h2>
          <p className="list-subtitle">{results.length} results total</p>
        </div>
      </header>

      {/* Tab selector */}
      <div className="filter-row">
        <button
          type="button"
          className={`filter-chip${tab === 'pending' ? ' filter-chip--active' : ''}`}
          onClick={() => setTab('pending')}
        >
          Pending Approval {pendingRows.length > 0 ? `(${pendingRows.length})` : ''}
        </button>
        <button
          type="button"
          className={`filter-chip${tab === 'all' ? ' filter-chip--active' : ''}`}
          onClick={() => setTab('all')}
        >
          All Results
        </button>
      </div>

      {/* ── Pending Approval Tab ──────────────────────────────────────── */}
      {tab === 'pending' ? (
        pendingRows.length === 0 ? (
          <EmptyState
            icon={<CheckCircle size={40} />}
            headline="No results awaiting approval"
            description="All results are up to date."
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <th>Patient</th>
                <th>LABID</th>
                <th>Test Type</th>
                <th>Scientist</th>
                <th>Time Since Entry</th>
                {canApprove ? <th>Actions</th> : null}
              </tr>
            </TableHead>
            <TableBody>
              {pendingRows.map(({ result, patient }) => (
                <TableRow key={result.id} onClick={() => navigate(`/app/results/${result.id}`)}>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={patient?.full_name ?? '?'} />
                      <span>{patient?.full_name ?? 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="table-id">{result.labid}</TableCell>
                  <TableCell>{result.test_type}</TableCell>
                  <TableCell>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      {result.entered_by ? result.entered_by.slice(0, 8) + '…' : '—'}
                    </span>
                  </TableCell>
                  <TableCell>{formatTimeAgo(result.created_at)}</TableCell>
                  {canApprove ? (
                    <TableCell onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/app/results/${result.id}/approve`)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : null}

      {/* ── All Results Tab ───────────────────────────────────────────── */}
      {tab === 'all' ? (
        <>
          {/* Filters */}
          <div className="filter-row" style={{ marginBottom: 8 }}>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={{ width: 160 }}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="approved">Approved</option>
              <option value="amended">Amended</option>
            </select>
            <Input
              placeholder="Search patient, LABID, test…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {allRows.length === 0 ? (
            <EmptyState icon="-" headline="No results found" description="Try adjusting your search or filters." />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <th>Patient</th>
                  <th>LABID</th>
                  <th>Test Type</th>
                  <th>Status</th>
                  <th>Approved By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </TableHead>
              <TableBody>
                {allRows.map(({ result, patient }) => (
                  <TableRow key={result.id} onClick={() => navigate(`/app/results/${result.id}`)}>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={patient?.full_name ?? '?'} />
                        <span>{patient?.full_name ?? 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="table-id">{result.labid}</TableCell>
                    <TableCell>
                      {result.test_type}
                      {result.status === 'amended' ? (
                        <Badge status="WARNING" style={{ marginLeft: 6 }}>AMENDED</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge status={statusBadgeStatus(result.status)}>
                        {result.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        {result.approved_by ? result.approved_by.slice(0, 8) + '…' : '—'}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(result.created_at)}</TableCell>
                    <TableCell onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/app/results/${result.id}`)}>
                          View
                        </Button>
                        {result.pdf_url ? (
                          <Button variant="secondary" size="sm" onClick={() => window.open(result.pdf_url!, '_blank')}>
                            PDF
                          </Button>
                        ) : null}
                        <RoleGuard allow={['manager', 'owner']}>
                          {result.status === 'approved' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => { setAmendTarget(result); setAmendReason('') }}
                            >
                              Amend
                            </Button>
                          ) : null}
                        </RoleGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      ) : null}

      {/* Amendment modal */}
      <Modal
        open={Boolean(amendTarget)}
        title="Amend result"
        onClose={() => { setAmendTarget(null); setAmendReason('') }}
        footer={
          <>
            <Button variant="text" onClick={() => { setAmendTarget(null); setAmendReason('') }}>Cancel</Button>
            <Button variant="primary" loading={amending} onClick={() => void handleAmend()}>
              Amend &amp; Reopen
            </Button>
          </>
        }
      >
        <p style={{ marginBottom: 12, color: 'var(--color-text-secondary)' }}>
          The current result will be archived and reopened for editing. Provide a reason for the amendment.
        </p>
        <Input
          label="Amendment reason"
          value={amendReason}
          onChange={(e) => setAmendReason(e.target.value)}
          placeholder="E.g. Transcription error on Haemoglobin value"
        />
      </Modal>
    </section>
  )
}
