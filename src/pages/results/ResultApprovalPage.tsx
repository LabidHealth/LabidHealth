import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { AlertTriangle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, Modal, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { db } from '@/lib/db'
import { formatDate, formatDateTime } from '@/lib/formatters'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError } from '@/lib/supabaseQuery'
import { supabase } from '@/lib/supabase'
import { writeRecord } from '@/lib/writeRecord'
import { getCatalogTest, refText } from '@/lib/catalog'
import type { CatalogParameter, CatalogTest, Lab, Notification, Patient, Result, ResultParameter, ResultParameterStatus, Sample, SampleEvent } from '@/types'

function isAbnormal(param: ResultParameter) {
  return param.status === 'high' || param.status === 'critical_high'
}

function isLow(param: ResultParameter) {
  return param.status === 'low' || param.status === 'critical_low'
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return 'Unknown'
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDelta = today.getMonth() - birthDate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age--
  return `${age} yrs`
}

export function ResultApprovalPage() {
  const { resultId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, role, labId } = useAuthContext()

  const [result, setResult] = useState<Result | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [sample, setSample] = useState<Sample | null>(null)
  const [lab, setLab] = useState<Lab | null>(null)
  const [catTest, setCatTest] = useState<CatalogTest | null>(null)
  const [catParams, setCatParams] = useState<CatalogParameter[]>([])
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (!resultId) return
    let mounted = true

    const load = async () => {
      const record = await db.results.get(resultId)
      if (!mounted || !record) return
      setResult(record)

      const [patientRecord, sampleRecord] = await Promise.all([
        db.patients.where('labid').equals(record.labid).first(),
        db.samples.where('sample_id').equals(record.sample_id).first()
      ])

      if (!mounted) return
      setPatient(patientRecord ?? null)
      setSample(sampleRecord ?? null)

      const cat = await getCatalogTest(record.test_type)
      if (mounted) {
        setCatTest(cat?.test ?? null)
        setCatParams(cat?.params ?? [])
      }

      if (record.lab_id) {
        const labRecord = await db.labs.get(record.lab_id)
        if (mounted) setLab(labRecord ?? null)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [resultId])

  async function handleApprove() {
    if (!result || !labId) return

    setApproving(true)
    try {
      const now = new Date().toISOString()
      const approved: Result = {
        ...result,
        status: 'approved',
        approved_by: user?.id ?? null,
        approved_at: now,
        updated_at: now
      }

      const verificationUrl = `${import.meta.env.VITE_SUPABASE_URL}/results/${result.id}`
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 256 })
      const reportId = `#RES-${result.id.slice(0, 6).toUpperCase()}`
      const [{ pdf }, { ResultPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/ResultPDF')
      ])
      const isNarrative = catTest?.result_type === 'narrative'
      const narrativeText = isNarrative ? result.parameters.findings?.value ?? '' : null
      const rows = isNarrative
        ? []
        : catParams.length
        ? catParams.map((p) => {
            const rp = result.parameters[p.key]
            return { name: p.name, value: rp?.value ?? '', unit: p.unit ?? '', ref: refText(p), status: (rp?.status ?? 'normal') as ResultParameterStatus }
          })
        : Object.entries(result.parameters).map(([k, rp]) => ({ name: k.replace(/_/g, ' '), value: rp.value, unit: rp.unit, ref: '—', status: rp.status }))
      const staff = user?.id ? await db.lab_staff.where('user_id').equals(user.id).first() : null
      const pdfBlob = await pdf(
        <ResultPDF
          testName={catTest?.name ?? result.test_type}
          patientName={patient?.full_name ?? 'UNKNOWN'}
          patientLabid={result.labid}
          patientAge={calcAge(patient?.date_of_birth)}
          patientGender={patient?.gender ?? ''}
          referringDoctor={sample?.referring_doctor ?? ''}
          collectionDate={sample?.collected_at ? formatDate(sample.collected_at) : '-'}
          resultDate={formatDateTime(now)}
          labName={lab?.name ?? 'Labid Health Laboratory'}
          labAddress={lab?.address ?? ''}
          labPhone={lab?.phone ?? ''}
          mlscnNo={lab?.mlscn_no ?? '-'}
          logoUrl={lab?.logo_url ?? null}
          qrDataUrl={qrDataUrl}
          reportId={reportId}
          rows={rows}
          narrativeText={narrativeText}
          comments={approved.comments}
          criticalAcknowledged={approved.critical_acknowledged}
          scientistName={staff?.full_name ?? null}
          scientistRa={null}
        />
      ).toBlob()

      let pdfUrl: string | null = null
      if (navigator.onLine) {
        try {
          const filePath = `${labId}/${result.id}.pdf`
          const { error: uploadError } = await supabase.storage
            .from('result-pdfs')
            .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true })
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('result-pdfs').getPublicUrl(filePath)
            pdfUrl = urlData?.publicUrl ?? null
          }
        } catch {
          // No backend configured (offline dev) — skip upload; PDF still generated on demand.
        }
      }

      const finalResult: Result = {
        ...approved,
        pdf_url: pdfUrl,
        pdf_generated_at: pdfUrl ? now : null
      }
      await writeRecord('results', 'UPDATE', finalResult, result)
      setResult(finalResult)

      const approvalEvent: SampleEvent = {
        id: crypto.randomUUID(),
        sample_id: result.sample_id,
        event_type: 'approved',
        performed_by: user?.id ?? null,
        station: 'approval',
        notes: null,
        created_at: now
      }
      await writeRecord('sample_events', 'INSERT', approvalEvent)

      const notification: Notification = {
        id: crypto.randomUUID(),
        labid: result.labid,
        result_id: result.id,
        lab_id: labId,
        channel: 'whatsapp',
        status: 'queued',
        recipient_phone: patient?.phone ?? null,
        secure_link: pdfUrl,
        link_token: null,
        link_expires_at: null,
        sent_at: null,
        delivered_at: null,
        opened_at: null,
        failure_reason: null,
        is_doctor_copy: false,
        doctor_name: null,
        superseded_by: null,
        created_at: now
      }
      await writeRecord('notifications', 'INSERT', notification)

      toast.push(offlineSuccessMessage('Result approved - PDF generated and patient notified'))
      navigate(`/app/results/${result.id}`)
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setApproving(false)
    }
  }

  async function handleReject() {
    if (!result || !rejectReason.trim()) {
      toast.push('Rejection reason is required', 'error')
      return
    }

    setRejecting(true)
    try {
      const now = new Date().toISOString()
      const rejected: Result = { ...result, status: 'draft', updated_at: now }
      await writeRecord('results', 'UPDATE', rejected, result)
      setResult(rejected)

      if (labId) {
        const notification: Notification = {
          id: crypto.randomUUID(),
          labid: result.labid,
          result_id: result.id,
          lab_id: labId,
          channel: 'email',
          status: 'queued',
          recipient_phone: null,
          secure_link: null,
          link_token: null,
          link_expires_at: null,
          sent_at: null,
          delivered_at: null,
          opened_at: null,
          failure_reason: rejectReason.trim(),
          is_doctor_copy: false,
          doctor_name: null,
          superseded_by: null,
          created_at: now
        }
        await writeRecord('notifications', 'INSERT', notification)
      }

      toast.push(offlineSuccessMessage('Result sent back for correction'), 'warning')
      setRejectModalOpen(false)
      navigate('/app/results')
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setRejecting(false)
    }
  }

  if (!result) {
    return (
      <EmptyState
        icon="?"
        headline="Result not found"
        description="This result is not cached locally."
        cta={<Button variant="secondary" onClick={() => navigate('/app/results')}>Back to results</Button>}
      />
    )
  }

  if (result.status !== 'awaiting_approval') {
    return (
      <EmptyState
        icon="OK"
        headline={`Result is ${result.status.replace(/_/g, ' ')}`}
        description="This result is not currently awaiting approval."
        cta={<Button variant="secondary" onClick={() => navigate(`/app/results/${result.id}`)}>View Result</Button>}
      />
    )
  }

  const isOwnResult = result.entered_by != null && result.entered_by === user?.id
  const canApprove = (role === 'manager' || role === 'owner') && !isOwnResult

  return (
    <section className="form-page">
      <header className="patient-detail__header">
        <div>
          <h2>Result Approval</h2>
          <p className="list-subtitle">{result.test_type} - <span className="table-id">{result.labid}</span></p>
        </div>
        <Badge status="AWAITING APPROVAL">Awaiting Approval</Badge>
      </header>

      {isOwnResult ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,184,0,0.12)', border: '1px solid var(--color-status-warning)', borderRadius: 10, marginBottom: 16, color: 'var(--color-status-warning)', fontSize: 13, fontWeight: 600 }}>
          <AlertTriangle size={16} />
          You entered this result - a different manager or owner must approve it.
        </div>
      ) : null}

      <div className="patient-detail__grid">
        <article className="detail-card">
          <h3>Patient</h3>
          <dl className="detail-list">
            <div><dt>Name</dt><dd>{patient?.full_name ?? '-'}</dd></div>
            <div><dt>LABID</dt><dd className="table-id">{result.labid}</dd></div>
            <div><dt>Age</dt><dd>{calcAge(patient?.date_of_birth)}</dd></div>
            <div><dt>Gender</dt><dd>{patient?.gender ?? '-'}</dd></div>
          </dl>
        </article>
        <article className="detail-card">
          <h3>Sample</h3>
          <dl className="detail-list">
            <div><dt>Sample ID</dt><dd className="table-id">{result.sample_id}</dd></div>
            <div><dt>Referring Doctor</dt><dd>{sample?.referring_doctor ?? '-'}</dd></div>
            <div><dt>Collected</dt><dd>{sample ? formatDate(sample.collected_at) : '-'}</dd></div>
            <div><dt>Entered at</dt><dd>{formatDateTime(result.created_at)}</dd></div>
          </dl>
        </article>
      </div>

      <article className="detail-card">
        <h3>{result.test_type} - Parameters</h3>
        <div className="detail-timeline">
          {Object.entries(result.parameters).map(([key, param]) => {
            const abnormal = isAbnormal(param)
            const low = isLow(param)

            return (
              <div key={key} className="result-parameter-row">
                <div>
                  <strong>{key.replace(/_/g, ' ')}</strong>
                  <div className="list-subtitle">{param.unit}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 600,
                      fontSize: 14,
                      background: abnormal ? 'rgba(255,77,77,0.15)' : low ? 'rgba(255,184,0,0.15)' : 'transparent',
                      color: abnormal ? 'var(--color-status-danger)' : low ? 'var(--color-status-warning)' : 'var(--color-text-primary)'
                    }}
                  >
                    {param.value} {abnormal ? '↑' : low ? '↓' : ''}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{param.unit}</span>
                </div>
              </div>
            )
          })}
        </div>

        {result.comments ? (
          <div style={{ marginTop: 16, borderLeft: '3px solid var(--color-status-danger)', paddingLeft: 12 }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, textTransform: 'uppercase', marginBottom: 4 }}>Comments</p>
            <p>{result.comments}</p>
          </div>
        ) : null}

        {result.critical_acknowledged ? (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-status-warning)' }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: 13 }}>
              Critical value acknowledged by scientist at {result.critical_acknowledged_at ? formatDateTime(result.critical_acknowledged_at) : '-'}
            </span>
          </div>
        ) : null}
      </article>

      {canApprove ? (
        <div className="form-actions">
          <Button variant="danger" onClick={() => setRejectModalOpen(true)}>
            Reject - Send back for correction
          </Button>
          <Button variant="primary" loading={approving} onClick={() => void handleApprove()}>
            Approve &amp; Generate PDF
          </Button>
        </div>
      ) : (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          {isOwnResult
            ? 'Approval blocked because you entered this result yourself.'
            : 'Only managers and owners can approve results.'}
        </p>
      )}

      <Modal
        open={rejectModalOpen}
        title="Reject result"
        onClose={() => setRejectModalOpen(false)}
        footer={
          <>
            <Button variant="text" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={rejecting} onClick={() => void handleReject()}>
              Reject &amp; Notify Scientist
            </Button>
          </>
        }
      >
        <p style={{ marginBottom: 12, color: 'var(--color-text-secondary)' }}>
          Provide a reason. The scientist will be notified to correct the result.
        </p>
        <Input
          label="Rejection reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="E.g. Haemoglobin value appears inconsistent with PCV"
        />
      </Modal>
    </section>
  )
}
