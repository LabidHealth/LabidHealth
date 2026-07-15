import React, { useEffect, useMemo, useState } from 'react'
import { patientRepo, sampleEventRepo, sampleRepo } from '@/lib/repositories'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, Modal, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { formatDateTime, formatTimeAgo } from '@/lib/formatters'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError } from '@/lib/supabaseQuery'
import type { Patient, Sample, SampleEvent, SampleStatus } from '@/types'

const STATUS_FLOW: SampleStatus[] = ['received', 'processing', 'awaiting_approval', 'ready', 'delivered']

function nextStatus(current: SampleStatus): SampleStatus {
  const idx = STATUS_FLOW.indexOf(current)
  if (idx === -1) return current
  return STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)]
}

export function SampleDetailPage() {
  const { sampleId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthContext()

  const [sample, setSample] = useState<Sample | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [events, setEvents] = useState<SampleEvent[]>([])
  const [loading, setLoading] = useState(false)

  const [statusOpen, setStatusOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (!sampleId) return
    let mounted = true
    const load = async () => {
      const record = await sampleRepo.get(sampleId)
      if (!mounted) return
      setSample(record ?? null)
      if (record) {
        const [patientRecord, sampleEvents] = await Promise.all([
          patientRepo.byLabid(record.labid),
          sampleEventRepo.listBySampleSorted(record.sample_id)
        ])
        if (!mounted) return
        setPatient(patientRecord ?? null)
        setEvents(sampleEvents)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [sampleId])


  const currentStatusBadge = useMemo(() => {
    if (!sample) return 'INFO'
    if (sample.status === 'awaiting_approval') return 'AWAITING APPROVAL'
    if (sample.status === 'rejected') return 'WARNING'
    return sample.status.toUpperCase() as 'RECEIVED' | 'PROCESSING' | 'READY' | 'DELIVERED'
  }, [sample])

  async function handleAdvanceStatus() {
    if (!sample) return
    const from = sample.status
    const to = nextStatus(from)
    if (from === to) return

    setLoading(true)
    try {
      const now = new Date().toISOString()
      const updated: Sample = { ...sample, status: to, updated_at: now }
      await sampleRepo.update(updated, sample)
      setSample(updated)

      const event: SampleEvent = {
        id: crypto.randomUUID(),
        sample_id: sample.sample_id,
        event_type: 'status_updated',
        performed_by: user?.id ?? null,
        station: 'workstation',
        notes: `${from} -> ${to}`,
        created_at: now
      }
      await sampleEventRepo.create(event)
      setEvents((prev) => [...prev, event])
      toast.push(offlineSuccessMessage(`Status updated to ${to.replace(/_/g, ' ')}`))
      setStatusOpen(false)
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!sample) return
    if (!rejectReason.trim()) {
      toast.push('Rejection reason is required.', 'error')
      return
    }

    setLoading(true)
    try {
      const now = new Date().toISOString()
      const updated: Sample = {
        ...sample,
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
        updated_at: now
      }
      await sampleRepo.update(updated, sample)
      setSample(updated)

      const event: SampleEvent = {
        id: crypto.randomUUID(),
        sample_id: sample.sample_id,
        event_type: 'rejected',
        performed_by: user?.id ?? null,
        station: 'reception',
        notes: rejectReason.trim(),
        created_at: now
      }
      await sampleEventRepo.create(event)
      setEvents((prev) => [...prev, event])
      toast.push(offlineSuccessMessage('Sample rejected'), 'warning')
      setRejectOpen(false)
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!sample) {
    return (
      <EmptyState
        icon="?"
        headline="Sample not found"
        description="This sample is not cached locally yet."
        cta={
          <Button variant="secondary" onClick={() => navigate('/app/samples')}>
            Back to samples
          </Button>
        }
      />
    )
  }

  return (
    <section className="patient-detail">
      {/* Page header */}
      <header className="patient-detail__header">
        <div>
          <h2 className="table-id">#{sample.sample_id}</h2>
          <p className="list-subtitle">{patient ? `${patient.full_name} · ${patient.labid}` : sample.labid}</p>
        </div>
        <div className="patient-detail__actions">
          <Badge status={currentStatusBadge}>{sample.status.replace(/_/g, ' ')}</Badge>
          {sample.is_stat ? <Badge status="STAT" /> : null}
        </div>
      </header>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 380px)', gap: 24, alignItems: 'start' }}
           className="sample-detail-columns">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Patient card */}
          <article className="detail-card">
            <h3>Patient</h3>
            <dl className="detail-list">
              <div><dt>Name</dt><dd>{patient?.full_name ?? '-'}</dd></div>
              <div><dt>LABID</dt><dd className="table-id">{sample.labid}</dd></div>
              <div><dt>Phone</dt><dd>{patient?.phone ?? '-'}</dd></div>
            </dl>
          </article>

          {/* Sample info */}
          <article className="detail-card">
            <h3>Sample</h3>
            <dl className="detail-list">
              <div><dt>Status</dt><dd>{sample.status.replace(/_/g, ' ')}</dd></div>
              <div><dt>Collected</dt><dd>{formatDateTime(sample.collected_at)}</dd></div>
              <div><dt>Elapsed</dt><dd>{formatTimeAgo(sample.collected_at)}</dd></div>
              <div><dt>Referring doctor</dt><dd>{sample.referring_doctor ?? '-'}</dd></div>
              {sample.rejection_reason ? <div><dt>Rejection reason</dt><dd>{sample.rejection_reason}</dd></div> : null}
            </dl>
          </article>

          {/* Tests ordered */}
          <article className="detail-card">
            <h3>Tests ordered</h3>
            <div className="detail-timeline">
              {sample.tests_ordered.map((test) => (
                <div key={test} className="detail-timeline__row">
                  <strong>{test}</strong>
                  <Badge status={currentStatusBadge}>{sample.status.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
          </article>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={() => setStatusOpen(true)}>
              Update Status
            </Button>
            <Button variant="danger" onClick={() => setRejectOpen(true)}>
              Reject Sample
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Chain of custody timeline */}
          <article className="detail-card">
            <h3>Chain of custody</h3>
            {events.length === 0 ? (
              <EmptyState icon="-" headline="No events yet" description="Events appear as the sample moves through the lab." />
            ) : (
              <div className="detail-timeline" style={{ position: 'relative', paddingLeft: 20 }}>
                {events.map((event, idx) => {
                  const isLatest = idx === events.length - 1
                  const dotColor = isLatest
                    ? 'var(--color-status-warning)'
                    : 'var(--color-mint)'
                  return (
                    <div key={event.id} className="detail-timeline__row" style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: -18,
                          top: 4,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: dotColor,
                          flexShrink: 0
                        }}
                      />
                      <div>
                        <strong>{event.event_type.replace(/_/g, ' ')}</strong>
                        {event.performed_by ? (
                          <span style={{ color: 'var(--color-text-secondary)', marginLeft: 8, fontSize: 12 }}>
                            by {event.performed_by.slice(0, 8)}…
                          </span>
                        ) : null}
                      </div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{event.station ?? '-'}</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{formatDateTime(event.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </article>

        </div>
      </div>

      {/* Update status modal */}
      <Modal
        open={statusOpen}
        title="Update status"
        onClose={() => setStatusOpen(false)}
        footer={
          <>
            <Button variant="text" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={loading} onClick={() => void handleAdvanceStatus()}>
              Move to next stage
            </Button>
          </>
        }
      >
        <p>Current: <strong>{sample.status.replace(/_/g, ' ')}</strong></p>
        <p>Next: <strong>{nextStatus(sample.status).replace(/_/g, ' ')}</strong></p>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        title="Reject sample"
        onClose={() => setRejectOpen(false)}
        footer={
          <>
            <Button variant="text" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={loading} onClick={() => void handleReject()}>
              Reject
            </Button>
          </>
        }
      >
        <Input
          label="Reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="E.g. insufficient sample volume"
        />
      </Modal>
    </section>
  )
}
