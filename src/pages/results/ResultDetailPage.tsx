import React, { useEffect, useState } from 'react'
import { invoiceRepo, labRepo, patientRepo, resultRepo, sampleRepo, staffRepo } from '@/lib/repositories'
import { MessageSquare, AlertTriangle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState, useToast } from '@/components/ui'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { useAuthContext } from '@/context/AuthContext'
import { formatDateTime, formatNaira, formatTimeAgo } from '@/lib/formatters'
import { getDeliveryStatus } from '@/lib/notifications'
import { deliverViaSms, deliverViaWhatsApp, isDeliveryHeld } from '@/lib/delivery'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError } from '@/lib/supabaseQuery'
import { pull } from '@/lib/pull'
import { getCatalogTest, refText } from '@/lib/catalog'
import type { CatalogParameter, CatalogTest, Invoice, Lab, Notification, Patient, Result, ResultParameterStatus, Sample } from '@/types'

const CHANNEL_LABEL: Record<Notification['channel'], string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email'
}

// Delivery progression from the signals we actually have: the row is created
// once Sent; the patient opening the secure link (result-view) proves receipt,
// so an open lights up both Delivered and Opened. A carrier-confirmed Delivered
// ahead of the open would need a provider delivery receipt (not available with
// wa.me click-to-send), and populates delivered_at when it is.
function DeliveryTimeline({ notification }: { notification: Notification }) {
  const deliveredAt = notification.delivered_at ?? notification.opened_at
  const steps: Array<{ label: string; at: string | null | undefined }> = [
    { label: 'Sent', at: notification.sent_at },
    { label: 'Delivered', at: deliveredAt },
    { label: 'Opened', at: notification.opened_at }
  ]
  return (
    <div style={{ display: 'flex', gap: 4, margin: '4px 0 14px' }}>
      {steps.map((step, i) => {
        const done = Boolean(step.at)
        const color = done ? 'var(--color-status-success)' : 'var(--color-text-secondary)'
        return (
          <div key={step.label} style={{ flex: 1, textAlign: 'center', opacity: done ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <div style={{ flex: 1, height: 2, background: i === 0 ? 'transparent' : color }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, height: 2, background: i === steps.length - 1 ? 'transparent' : (steps[i + 1].at ? 'var(--color-status-success)' : 'var(--color-text-secondary)') }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color }}>{step.label}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{step.at ? formatTimeAgo(step.at) : '—'}</div>
          </div>
        )
      })}
    </div>
  )
}

function DeliverySection({
  result,
  patient,
  invoice,
  testName,
  labName
}: {
  result: Result
  patient: Patient | null
  invoice: Invoice | null
  testName: string
  labName: string
}) {
  const toast = useToast()
  // undefined = still loading; null = none yet; Notification = already delivered.
  const [notification, setNotification] = useState<Notification | null | undefined>(undefined)
  const [sending, setSending] = useState(false)
  const [smsSending, setSmsSending] = useState(false)

  useEffect(() => {
    let mounted = true
    void (async () => {
      if (navigator.onLine) await pull.notifications()
      const n = await getDeliveryStatus(result.id)
      if (mounted) setNotification(n ?? null)
    })()
    return () => {
      mounted = false
    }
  }, [result.id])

  const held = isDeliveryHeld(invoice)

  // Both the first send and a resend mint a fresh secure link and open WhatsApp.
  async function handleDeliver() {
    if (!patient) {
      toast.push('Patient record is missing.', 'error')
      return
    }
    if (held) return
    setSending(true)
    try {
      const { notification: n, waUrl } = await deliverViaWhatsApp({ result, patient, testName, labName })
      setNotification(n)
      window.open(waUrl, '_blank', 'noopener')
      toast.push(offlineSuccessMessage('WhatsApp opened with the result link'))
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setSending(false)
    }
  }

  // SMS fallback (Termii). Sends server-side; dormant until configured.
  async function handleSms() {
    if (!patient) {
      toast.push('Patient record is missing.', 'error')
      return
    }
    if (held) return
    setSmsSending(true)
    try {
      const outcome = await deliverViaSms({ result, patient, testName })
      if (outcome.status === 'sent') {
        setNotification(outcome.notification)
        toast.push(offlineSuccessMessage('SMS sent to patient'))
      } else {
        toast.push(outcome.message, outcome.status === 'failed' ? 'error' : undefined)
      }
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setSmsSending(false)
    }
  }

  if (notification === undefined) return null

  // Not yet delivered → payment gate banner or the Send action.
  if (!notification) {
    return (
      <article className="detail-card">
        <h3>Deliver to patient</h3>
        {held ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--color-status-warning)' }}>
            <AlertTriangle size={16} />
            <div style={{ fontSize: 13 }}>
              Delivery is held until payment is settled. Outstanding:{' '}
              <strong>{formatNaira(invoice!.outstanding)}</strong>. Record the payment on the invoice to release it.
            </div>
          </div>
        ) : (
          <>
            <p className="list-subtitle" style={{ marginTop: 0 }}>
              Opens WhatsApp with a secure result link pre-filled to {patient?.phone ?? 'the patient'}.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="primary" icon={<MessageSquare size={16} />} loading={sending} disabled={!patient} onClick={() => void handleDeliver()}>
                Send via WhatsApp
              </Button>
              <Button variant="secondary" loading={smsSending} disabled={!patient} onClick={() => void handleSms()}>
                Send via SMS
              </Button>
            </div>
          </>
        )}
      </article>
    )
  }

  // Already delivered → timeline + resend.
  const hoursOld = notification.sent_at ? (Date.now() - new Date(notification.sent_at).getTime()) / 3_600_000 : null
  const notOpened = notification.sent_at !== null && notification.opened_at === null && hoursOld !== null && hoursOld > 24

  return (
    <article className="detail-card">
      <h3>Delivery status</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
        <MessageSquare size={14} /> Sent via {CHANNEL_LABEL[notification.channel]}
      </div>
      <DeliveryTimeline notification={notification} />
      {notOpened ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-status-warning)', marginBottom: 12 }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: 13 }}>Patient has not opened the result (sent {formatTimeAgo(notification.sent_at!)})</span>
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" loading={sending} onClick={() => void handleDeliver()}>
          Resend via WhatsApp
        </Button>
        <Button variant="secondary" size="sm" loading={smsSending} onClick={() => void handleSms()}>
          Send via SMS
        </Button>
      </div>
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
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lab, setLab] = useState<Lab | null>(null)
  const [catTest, setCatTest] = useState<CatalogTest | null>(null)
  const [catParams, setCatParams] = useState<CatalogParameter[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!resultId) return
    let mounted = true
    const load = async () => {
      const record = await resultRepo.get(resultId)
      if (!mounted || !record) return
      setResult(record)
      const [patientRecord, sampleRecord, cat] = await Promise.all([
        patientRepo.byLabid(record.labid),
        sampleRepo.bySampleId(record.sample_id),
        getCatalogTest(record.test_type)
      ])
      if (!mounted) return
      setPatient(patientRecord ?? null)
      setSample(sampleRecord ?? null)
      setCatTest(cat?.test ?? null)
      setCatParams(cat?.params ?? [])
      // Lab (for the WhatsApp message + report). Pull if not cached locally.
      let labRecord = await labRepo.get(record.lab_id)
      if (!labRecord && navigator.onLine) {
        await pull.labs()
        labRecord = await labRepo.get(record.lab_id)
      }
      if (mounted) setLab(labRecord ?? null)

      // The payment gate needs the invoice for this sample. Pull so a fresh
      // device sees the current balance, then match by sample_id.
      const findInvoice = async () => {
        const invoices = await invoiceRepo.listByLabidRecent(record.labid)
        return invoices.find((inv) => inv.sample_id === record.sample_id) ?? null
      }
      if (mounted) setInvoice(await findInvoice())
      if (navigator.onLine) {
        await pull.invoices()
        if (mounted) setInvoice(await findInvoice())
      }
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
      const lab = await labRepo.get(result.lab_id)
      const staffId = result.approved_by ?? result.entered_by
      const staff = staffId ? await staffRepo.byUser(staffId) : null
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
      {result.status === 'approved' || result.status === 'amended' ? (
        <DeliverySection
          result={result}
          patient={patient}
          invoice={invoice}
          testName={catTest?.name ?? result.test_type}
          labName={lab?.name ?? ''}
        />
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
