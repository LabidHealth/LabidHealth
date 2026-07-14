import React, { useEffect, useState } from 'react'
import { MessageSquare, Phone, AlertTriangle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState, useToast } from '@/components/ui'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { useAuthContext } from '@/context/AuthContext'
import { db } from '@/lib/db'
import { formatDateTime, formatTimeAgo } from '@/lib/formatters'
import { getDeliveryStatus, resendNotification } from '@/lib/notifications'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError } from '@/lib/supabaseQuery'
import { supabase } from '@/lib/supabase'
import { getCatalogTest, refText } from '@/lib/catalog'
import type { CatalogParameter, CatalogTest, Notification, Patient, Result, ResultParameterStatus, Sample } from '@/types'

function DeliveryStatusSection({
  resultId,
  pdfUrl
}: {
  resultId: string
  pdfUrl: string | null
}) {
  const toast = useToast()
  const [notification, setNotification] = useState<Notification | null>(null)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    let mounted = true

    // Initial load
    void getDeliveryStatus(resultId).then((n) => {
      if (mounted) setNotification(n ?? null)
    })

    // Subscribe to notification changes via Supabase Realtime
    const channel = supabase
      .channel(`notification-${resultId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `result_id=eq.${resultId}`
        },
        async () => {
          if (!mounted) return
          // Refresh from IndexedDB when Supabase syncs
          const fresh = await getDeliveryStatus(resultId)
          setNotification(fresh ?? null)
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [resultId])

  if (!notification) return null

  const hoursOld = notification.sent_at
    ? (Date.now() - new Date(notification.sent_at).getTime()) / 3_600_000
    : null

  const notOpened =
    notification.sent_at !== null &&
    notification.opened_at === null &&
    hoursOld !== null &&
    hoursOld > 24

  const canResend =
    notification.status === 'failed' ||
    (notification.sent_at !== null && hoursOld !== null && hoursOld > 24)

  async function handleResend() {
    if (!notification) return
    setResending(true)
    try {
      const fresh = await resendNotification(notification, pdfUrl)
      setNotification(fresh)
      toast.push(offlineSuccessMessage('Notification resent'))
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setResending(false)
    }
  }

  function statusBadge(status: Notification['status']) {
    const map: Record<Notification['status'], 'SUCCESS' | 'INFO' | 'WARNING' | 'CRITICAL'> = {
      queued: 'INFO',
      sent: 'INFO',
      delivered: 'SUCCESS',
      opened: 'SUCCESS',
      failed: 'CRITICAL'
    }
    return map[status] ?? 'INFO'
  }

  return (
    <article className="detail-card">
      <h3>Delivery Status</h3>
      {notOpened ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-status-warning)', marginBottom: 12 }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: 13 }}>Patient has not opened result (sent {formatTimeAgo(notification.sent_at!)})</span>
        </div>
      ) : null}
      <dl className="detail-list">
        <div>
          <dt>Channel</dt>
          <dd style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {notification.channel === 'whatsapp' ? <MessageSquare size={14} /> : <Phone size={14} />}
            {notification.channel.toUpperCase()}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><Badge status={statusBadge(notification.status)}>{notification.status}</Badge></dd>
        </div>
        {notification.sent_at ? (
          <div><dt>Sent at</dt><dd>{formatDateTime(notification.sent_at)}</dd></div>
        ) : null}
        {notification.delivered_at ? (
          <div><dt>Delivered at</dt><dd>{formatDateTime(notification.delivered_at)}</dd></div>
        ) : null}
        {notification.opened_at ? (
          <div><dt>Opened at</dt><dd>{formatDateTime(notification.opened_at)}</dd></div>
        ) : null}
        {notification.failure_reason ? (
          <div><dt>Failure reason</dt><dd style={{ color: 'var(--color-status-danger)' }}>{notification.failure_reason}</dd></div>
        ) : null}
      </dl>
      {canResend ? (
        <Button variant="secondary" size="sm" loading={resending} onClick={() => void handleResend()}>
          Resend to Patient
        </Button>
      ) : null}
    </article>
  )
}

export function ResultDetailPage() {
  const { resultId } = useParams()
  const navigate = useNavigate()
  const { role } = useAuthContext()
  const toast = useToast()

  const [result, setResult] = useState<Result | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [sample, setSample] = useState<Sample | null>(null)
  const [catTest, setCatTest] = useState<CatalogTest | null>(null)
  const [catParams, setCatParams] = useState<CatalogParameter[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!resultId) return
    let mounted = true
    const load = async () => {
      const record = await db.results.get(resultId)
      if (!mounted || !record) return
      setResult(record)
      const [patientRecord, sampleRecord, cat] = await Promise.all([
        db.patients.where('labid').equals(record.labid).first(),
        db.samples.where('sample_id').equals(record.sample_id).first(),
        getCatalogTest(record.test_type)
      ])
      if (!mounted) return
      setPatient(patientRecord ?? null)
      setSample(sampleRecord ?? null)
      setCatTest(cat?.test ?? null)
      setCatParams(cat?.params ?? [])
    }
    void load()
    return () => { mounted = false }
  }, [resultId])

  if (!result) {
    return (
      <EmptyState
        icon="?"
        headline="Result not found"
        description="This result is not cached locally yet."
        cta={<Button variant="secondary" onClick={() => navigate('/app/results')}>Back to results</Button>}
      />
    )
  }

  function resultStatusBadge() {
    if (result!.status === 'approved') return 'SUCCESS' as const
    if (result!.status === 'awaiting_approval') return 'AWAITING APPROVAL' as const
    if (result!.status === 'amended') return 'WARNING' as const
    return 'INFO' as const
  }

  const isNarrative = catTest?.result_type === 'narrative'
  const narrativeText = isNarrative ? result.parameters.findings?.value ?? '' : null
  const rows = isNarrative
    ? []
    : catParams.length
    ? catParams.map((p) => {
        const rp = result.parameters[p.key]
        return { name: p.name, value: rp?.value ?? '', unit: p.unit ?? '', ref: refText(p), status: (rp?.status ?? 'normal') as ResultParameterStatus }
      })
    : Object.entries(result.parameters).map(([k, rp]) => ({
        name: k.replace(/_/g, ' '), value: rp.value, unit: rp.unit, ref: '—', status: rp.status
      }))

  async function handleGeneratePdf() {
    if (!result || !patient) return
    setGenerating(true)
    try {
      const lab = await db.labs.get(result.lab_id)
      const staffId = result.approved_by ?? result.entered_by
      const staff = staffId ? await db.lab_staff.where('user_id').equals(staffId).first() : null
      const QRCode = (await import('qrcode')).default
      const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/verify/${result.id}`, { margin: 1, width: 256 })
      const [{ pdf }, { ResultPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/ResultPDF')
      ])
      const age = patient.date_of_birth
        ? `${Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 86_400_000))} yrs`
        : '—'
      const blob = await pdf(
        <ResultPDF
          testName={catTest?.name ?? result.test_type}
          patientName={patient.full_name}
          patientLabid={result.labid}
          patientAge={age}
          patientGender={patient.gender ?? '—'}
          referringDoctor={sample?.referring_doctor ?? ''}
          collectionDate={sample ? formatDateTime(sample.collected_at) : '—'}
          resultDate={formatDateTime(result.approved_at ?? result.updated_at)}
          labName={lab?.name ?? 'Labid Health Laboratory'}
          labAddress={lab?.address ?? ''}
          labPhone={lab?.phone ?? ''}
          mlscnNo={lab?.mlscn_no ?? '—'}
          logoUrl={`${window.location.origin}/labid-mark.png`}
          qrDataUrl={qrDataUrl}
          reportId={`#${result.sample_id}`}
          rows={rows}
          narrativeText={narrativeText}
          comments={result.comments}
          criticalAcknowledged={result.critical_acknowledged}
          scientistName={staff?.full_name ?? null}
          scientistRa={null}
        />
      ).toBlob()
      window.open(URL.createObjectURL(blob), '_blank')
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section className="patient-detail">
      <header className="patient-detail__header">
        <div>
          <h2>{result.test_type}</h2>
          <p className="list-subtitle">
            <span className="table-id">{result.labid}</span>
            {patient ? ` · ${patient.full_name}` : ''}
          </p>
        </div>
        <div className="patient-detail__actions">
          <Badge status={resultStatusBadge()}>{result.status.replace(/_/g, ' ')}</Badge>
          <Button variant="secondary" loading={generating} onClick={() => void handleGeneratePdf()}>
            Generate report
          </Button>
        </div>
      </header>

      {/* Context */}
      <div className="patient-detail__grid">
        <article className="detail-card">
          <h3>Details</h3>
          <dl className="detail-list">
            <div><dt>Sample ID</dt><dd className="table-id">{result.sample_id}</dd></div>
            <div><dt>Referring doctor</dt><dd>{sample?.referring_doctor ?? '—'}</dd></div>
            <div><dt>Collected</dt><dd>{sample ? formatDateTime(sample.collected_at) : '—'}</dd></div>
            <div><dt>Entered</dt><dd>{formatDateTime(result.created_at)}</dd></div>
            {result.approved_at ? <div><dt>Approved</dt><dd>{formatDateTime(result.approved_at)}</dd></div> : null}
          </dl>
        </article>
        <article className="detail-card">
          <h3>Patient</h3>
          <dl className="detail-list">
            <div><dt>Name</dt><dd>{patient?.full_name ?? '—'}</dd></div>
            <div><dt>Phone</dt><dd>{patient?.phone ?? '—'}</dd></div>
            <div><dt>Consent</dt><dd>{patient?.consent ? 'Granted' : 'Not granted'}</dd></div>
          </dl>
        </article>
      </div>

      {/* Parameters — read-only with out-of-range highlighting */}
      <article className="detail-card">
        <h3>Parameters</h3>
        <div className="detail-timeline">
          {isNarrative ? (
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{narrativeText || '—'}</p>
          ) : (
            rows.map((r, i) => {
              const hi = r.status === 'high' || r.status === 'critical_high'
              const lo = r.status === 'low' || r.status === 'critical_low'
              return (
                <div key={i} className="result-parameter-row">
                  <div>
                    <strong>{r.name}</strong>
                    {r.ref !== '—' ? <div className="list-subtitle">Ref: {r.ref}</div> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: hi || lo ? 600 : 400,
                        background: hi ? 'var(--color-status-danger-bg)' : lo ? 'var(--color-status-warning-bg)' : 'transparent',
                        color: hi ? 'var(--color-status-danger)' : lo ? 'var(--color-status-warning)' : 'var(--color-text-primary)'
                      }}
                    >
                      {r.value || '—'} {hi ? '↑' : lo ? '↓' : ''}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{r.unit}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {result.comments ? (
          <div style={{ marginTop: 16, borderLeft: '3px solid var(--color-status-danger)', paddingLeft: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Comments</p>
            <p>{result.comments}</p>
          </div>
        ) : null}

        {result.critical_acknowledged ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-status-warning)' }}>
            <AlertTriangle size={14} />
            <span style={{ fontSize: 12 }}>Critical value acknowledged</span>
          </div>
        ) : null}
      </article>

      {/* Delivery status (only for approved results) */}
      {result.status === 'approved' ? (
        <DeliveryStatusSection resultId={result.id} pdfUrl={result.pdf_url ?? null} />
      ) : null}

      {/* Action buttons */}
      <div className="form-actions">
        {role !== 'front_desk' && result.status === 'draft' ? (
          <Button variant="secondary" onClick={() => navigate(`/app/results/${result.id}/entry`)}>
            Enter / Edit Result
          </Button>
        ) : null}
        <RoleGuard allow={['manager', 'owner']}>
          {result.status === 'awaiting_approval' ? (
            <Button variant="primary" onClick={() => navigate(`/app/results/${result.id}/approve`)}>
              Review &amp; Approve
            </Button>
          ) : null}
        </RoleGuard>
      </div>
    </section>
  )
}
