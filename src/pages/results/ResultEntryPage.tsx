import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { db } from '@/lib/db'
import { formatDateTime } from '@/lib/formatters'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError } from '@/lib/supabaseQuery'
import { writeRecord } from '@/lib/writeRecord'
import { getReferenceRange, getParameterStatus } from '@/lib/referenceRanges'
import type { Patient, Result, ResultParameter, ResultParameterStatus } from '@/types'

function toNumber(raw: string) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

const TEST_DEFS: Record<
  string,
  {
    title: string
    fields: Array<{ key: string; label: string; parameterName: string }>
    selectFields?: Array<{ key: string; label: string; options: string[] }>
  }
> = {
  FBC: {
    title: 'Full Blood Count (FBC)',
    fields: [
      { key: 'haemoglobin', label: 'Haemoglobin', parameterName: 'haemoglobin' },
      { key: 'rbc_count', label: 'RBC Count', parameterName: 'rbc_count' },
      { key: 'wbc', label: 'WBC', parameterName: 'wbc_count' },
      { key: 'platelets', label: 'Platelets', parameterName: 'platelet_count' },
      { key: 'pcv', label: 'PCV/Haematocrit', parameterName: 'haematocrit' },
      { key: 'mcv', label: 'MCV', parameterName: 'mcv' },
      { key: 'mch', label: 'MCH', parameterName: 'mch' },
      { key: 'mchc', label: 'MCHC', parameterName: 'mchc' }
    ]
  },
  FBG: {
    title: 'Fasting Blood Glucose',
    fields: [{ key: 'glucose', label: 'Glucose', parameterName: 'fasting_glucose' }]
  },
  LFT: {
    title: 'Liver Function Test (LFT)',
    fields: [
      { key: 'total_bilirubin', label: 'Total Bilirubin', parameterName: 'total_bilirubin' },
      { key: 'direct_bilirubin', label: 'Direct Bilirubin', parameterName: 'direct_bilirubin' },
      { key: 'alt', label: 'ALT', parameterName: 'alt' },
      { key: 'ast', label: 'AST', parameterName: 'ast' },
      { key: 'alp', label: 'ALP', parameterName: 'alp' },
      { key: 'ggt', label: 'GGT', parameterName: 'ggt' },
      { key: 'total_protein', label: 'Total Protein', parameterName: 'total_protein' },
      { key: 'albumin', label: 'Albumin', parameterName: 'albumin' }
    ]
  },
  RFT: {
    title: 'Renal Function Test (RFT)',
    fields: [
      { key: 'urea', label: 'Urea', parameterName: 'urea' },
      { key: 'creatinine', label: 'Creatinine', parameterName: 'creatinine' },
      { key: 'egfr', label: 'eGFR', parameterName: 'egfr' },
      { key: 'sodium', label: 'Sodium', parameterName: 'sodium' },
      { key: 'potassium', label: 'Potassium', parameterName: 'potassium' },
      { key: 'chloride', label: 'Chloride', parameterName: 'chloride' },
      { key: 'bicarbonate', label: 'Bicarbonate', parameterName: 'bicarbonate' }
    ]
  },
  MALRDT: {
    title: 'Malaria RDT',
    fields: [],
    selectFields: [
      { key: 'result', label: 'Result', options: ['Negative', 'Positive'] },
      { key: 'species', label: 'Species (if positive)', options: ['P. falciparum', 'P. vivax', 'Mixed', 'Not determined'] }
    ]
  }
}

function statusLabel(status: ResultParameterStatus) {
  if (status === 'critical_low' || status === 'critical_high') return 'CRITICAL'
  if (status === 'high') return 'HIGH'
  if (status === 'low') return 'LOW'
  return 'NORMAL'
}

export function ResultEntryPage() {
  const { resultId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthContext()

  const [result, setResult] = useState<Result | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [selectValues, setSelectValues] = useState<Record<string, string>>({})
  const [comments, setComments] = useState('')
  const [criticalAck, setCriticalAck] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!resultId) return
    let mounted = true

    const load = async () => {
      const record = await db.results.get(resultId)
      if (!mounted) return
      setResult(record ?? null)

      if (record) {
        const patientRecord = await db.patients.where('lapid').equals(record.lapid).first()
        if (!mounted) return

        setPatient(patientRecord ?? null)
        setComments(record.comments ?? '')
        setCriticalAck(Boolean(record.critical_acknowledged))

        const numericValues: Record<string, string> = {}
        const currentSelect: Record<string, string> = {}
        for (const [key, param] of Object.entries(record.parameters ?? {})) {
          numericValues[key] = param.value
          currentSelect[key] = param.value
        }
        setValues(numericValues)
        setSelectValues(currentSelect)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [resultId])

  const testDef = useMemo(() => (result ? TEST_DEFS[result.test_type] : null), [result])

  const computedParameters = useMemo(() => {
    if (!result || !testDef) return { parameters: {} as Record<string, ResultParameter>, hasCritical: false }
    const parameters: Record<string, ResultParameter> = {}
    let hasCritical = false

    for (const field of testDef.fields) {
      const raw = values[field.key] ?? ''
      const numeric = toNumber(raw)

      const patientAge = patient?.date_of_birth
        ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 30
      const patientGender = (patient?.gender === 'male' || patient?.gender === 'female') ? patient.gender : 'male'

      const range = getReferenceRange(result.test_type, field.parameterName, patientAge, patientGender, false)
      const unit = range?.unit ?? ''
      const status = numeric === null || !range ? 'normal' : getParameterStatus(numeric, range)
      if (status === 'critical_low' || status === 'critical_high') hasCritical = true
      parameters[field.key] = { value: raw, unit, status }
    }

    for (const selectField of testDef.selectFields ?? []) {
      const raw = selectValues[selectField.key] ?? ''
      parameters[selectField.key] = { value: raw, unit: '', status: 'normal' }
    }

    return { parameters, hasCritical }
  }, [patient, result, selectValues, testDef, values])

  async function persist(nextStatus: Result['status']) {
    if (!result || !testDef) return

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const updated: Result = {
        ...result,
        parameters: computedParameters.parameters,
        comments: comments || null,
        status: nextStatus,
        entered_by: result.entered_by ?? (user?.id ?? null),
        critical_acknowledged: computedParameters.hasCritical ? criticalAck : false,
        critical_acknowledged_by: computedParameters.hasCritical && criticalAck ? (user?.id ?? null) : null,
        critical_acknowledged_at: computedParameters.hasCritical && criticalAck ? now : null,
        updated_at: now
      }

      await writeRecord('results', 'UPDATE', updated, result)
      setResult(updated)

      if (nextStatus === 'awaiting_approval') {
        await writeRecord('notifications', 'INSERT', {
          id: crypto.randomUUID(),
          lapid: result.lapid,
          result_id: result.id,
          lab_id: result.lab_id,
          channel: 'email',
          status: 'queued',
          recipient_phone: null,
          secure_link: null,
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
        })
      }

      toast.push(
        nextStatus === 'draft'
          ? offlineSuccessMessage('Draft saved')
          : offlineSuccessMessage('Submitted for approval - manager notified')
      )
      navigate(`/app/results/${updated.id}`)
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setSaving(false)
    }
  }

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

  if (!testDef) {
    return (
      <EmptyState
        icon="?"
        headline="Unsupported test type"
        description="This test type is not configured for structured entry yet."
        cta={<Button variant="secondary" onClick={() => navigate(`/app/results/${result.id}`)}>Back</Button>}
      />
    )
  }

  const canSubmit = !computedParameters.hasCritical || criticalAck

  return (
    <section className="form-page">
      <header className="patient-detail__header">
        <div>
          <h2>Result Entry</h2>
          <p className="list-subtitle">{testDef.title}</p>
        </div>
        <Badge status={result.status === 'draft' ? 'INFO' : result.status === 'awaiting_approval' ? 'AWAITING APPROVAL' : 'SUCCESS'}>
          {result.status.replace('_', ' ')}
        </Badge>
      </header>

      <div className="detail-card">
        <h3>Sample and patient</h3>
        <dl className="detail-list">
          <div><dt>Sample ID</dt><dd className="table-id">{result.sample_id}</dd></div>
          <div><dt>LAPID</dt><dd className="table-id">{result.lapid}</dd></div>
          <div><dt>Patient</dt><dd>{patient?.full_name ?? 'Unknown'}</dd></div>
          <div><dt>Created</dt><dd>{formatDateTime(result.created_at)}</dd></div>
        </dl>
      </div>

      <div className="detail-card">
        <h3>Parameters</h3>
        <div className="detail-timeline">
          {testDef.fields.map((field) => {
            const patientAge = patient?.date_of_birth
              ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : 30
            const patientGender = (patient?.gender === 'male' || patient?.gender === 'female') ? patient.gender : 'male'
            const range = getReferenceRange(result.test_type, field.parameterName, patientAge, patientGender, false)
            const status = computedParameters.parameters[field.key]?.status ?? 'normal'
            const isHigh = status === 'high' || status === 'critical_high'
            const isLow = status === 'low' || status === 'critical_low'
            const display = computedParameters.parameters[field.key]

            return (
              <div key={field.key} className="result-parameter-row">
                <div>
                  <strong>{field.label}</strong>
                  <div className="list-subtitle">Ref: {range ? `${range.low}-${range.high} ${range.unit}` : 'N/A'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={range?.unit ?? ''}
                  />
                  {isHigh || isLow ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 600,
                        fontSize: 12,
                        background: isHigh
                          ? status === 'critical_high'
                            ? 'rgba(255,77,77,0.25)'
                            : 'rgba(255,77,77,0.15)'
                          : status === 'critical_low'
                          ? 'rgba(255,184,0,0.25)'
                          : 'rgba(255,184,0,0.15)',
                        color: isHigh ? 'var(--color-status-danger)' : 'var(--color-status-warning)'
                      }}
                    >
                      {isHigh ? '↑' : '↓'} {statusLabel(status)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{display?.unit ?? range?.unit ?? ''}</span>
                  )}
                  {isHigh || isLow ? (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{display?.unit ?? range?.unit ?? ''}</span>
                  ) : null}
                </div>
              </div>
            )
          })}

          {(testDef.selectFields ?? []).map((field) => (
            <div key={field.key} className="result-parameter-row">
              <div>
                <strong>{field.label}</strong>
              </div>
              <select
                className="form-input"
                value={selectValues[field.key] ?? ''}
                onChange={(e) => setSelectValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              >
                <option value="">Select...</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {computedParameters.hasCritical ? (
        <div className="detail-card">
          <div className="offline-banner" style={{ borderRadius: 8, border: '1px solid rgba(255,184,0,0.3)' }}>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={18} />
              Critical value detected - acknowledgment required before submission
            </span>
            <label className="form-label form-checkbox" style={{ margin: 0 }}>
              <input type="checkbox" checked={criticalAck} onChange={(e) => setCriticalAck(e.target.checked)} />
              <span>I acknowledge this critical value</span>
            </label>
          </div>
        </div>
      ) : null}

      <div className="detail-card">
        <h3>Comments / interpretation</h3>
        <Input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Optional comments" />
      </div>

      <div className="form-actions">
        <Button variant="secondary" loading={saving} type="button" onClick={() => void persist('draft')}>
          Save Draft
        </Button>
        <Button variant="primary" loading={saving} disabled={!canSubmit} type="button" onClick={() => void persist('awaiting_approval')}>
          Submit for Approval
        </Button>
        <span className="form-autosave">* All changes autosaved locally</span>
      </div>
    </section>
  )
}
