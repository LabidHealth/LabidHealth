import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, EmptyState, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { db } from '@/lib/db'
import { formatDateTime } from '@/lib/formatters'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError } from '@/lib/supabaseQuery'
import { writeRecord } from '@/lib/writeRecord'
import { evaluateNumeric, evaluateQualitative, getCatalogTest, refText } from '@/lib/catalog'
import { features } from '@/lib/features'
import type {
  CatalogParameter,
  CatalogResultType,
  CatalogTest,
  Patient,
  Result,
  ResultParameter,
  ResultParameterStatus
} from '@/types'

const isNumericShape = (t: CatalogResultType) => t === 'numeric' || t === 'panel'
const flagClass = (s: ResultParameterStatus) =>
  s === 'high' || s === 'critical_high' ? 'hi' : s === 'low' || s === 'critical_low' ? 'lo' : ''
const flagText = (s: ResultParameterStatus) =>
  s === 'critical_high' || s === 'critical_low' ? 'CRITICAL' : s === 'high' ? 'HIGH' : s === 'low' ? 'LOW' : ''
const arrow = (s: ResultParameterStatus) =>
  s === 'high' || s === 'critical_high' ? ' ↑' : s === 'low' || s === 'critical_low' ? ' ↓' : ''

export function ResultEntryPage() {
  const { resultId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthContext()

  const [result, setResult] = useState<Result | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [test, setTest] = useState<CatalogTest | null>(null)
  const [params, setParams] = useState<CatalogParameter[]>([])
  const [loaded, setLoaded] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [narrative, setNarrative] = useState('')
  const [comments, setComments] = useState('')
  const [criticalAck, setCriticalAck] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!resultId) return
    let mounted = true
    void (async () => {
      const record = await db.results.get(resultId)
      if (!mounted) return
      setResult(record ?? null)
      if (record) {
        const p = await db.patients.where('labid').equals(record.labid).first()
        const cat = await getCatalogTest(record.test_type)
        if (!mounted) return
        setPatient(p ?? null)
        setTest(cat?.test ?? null)
        setParams(cat?.params ?? [])
        setComments(record.comments ?? '')
        setCriticalAck(Boolean(record.critical_acknowledged))
        const v: Record<string, string> = {}
        for (const [k, par] of Object.entries(record.parameters ?? {})) v[k] = par.value
        setValues(v)
        if ((cat?.test.result_type ?? 'narrative') === 'narrative') {
          setNarrative(record.parameters?.findings?.value ?? '')
        }
      }
      setLoaded(true)
    })()
    return () => {
      mounted = false
    }
  }, [resultId])

  const shape: CatalogResultType = test?.result_type ?? 'narrative'

  const { parameters, hasCritical } = useMemo(() => {
    const out: Record<string, ResultParameter> = {}
    let crit = false
    if (shape === 'narrative') {
      out.findings = { value: narrative, unit: '', status: 'normal' }
    } else {
      for (const p of params) {
        const raw = values[p.key] ?? ''
        let status: ResultParameterStatus = 'normal'
        if (raw !== '') {
          if (isNumericShape(shape)) {
            const n = Number(raw)
            status = Number.isFinite(n) ? evaluateNumeric(p, n) : 'normal'
          } else if (shape === 'qualitative') {
            status = evaluateQualitative(raw)
          }
        }
        if (status === 'critical_low' || status === 'critical_high') crit = true
        out[p.key] = { value: raw, unit: p.unit ?? '', status }
      }
    }
    return { parameters: out, hasCritical: crit }
  }, [params, shape, values, narrative])

  async function persist(nextStatus: Result['status']) {
    if (!result) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      // Direct finalise (approvalStep off): the entering scientist signs the
      // result out. When approval is on it goes to 'awaiting_approval' with no
      // approver stamped, so a different user must approve it.
      const finalise = nextStatus === 'approved'
      const updated: Result = {
        ...result,
        parameters,
        comments: comments || null,
        status: nextStatus,
        entered_by: result.entered_by ?? user?.id ?? null,
        approved_by: finalise ? user?.id ?? null : result.approved_by ?? null,
        approved_at: finalise ? now : result.approved_at ?? null,
        critical_acknowledged: hasCritical ? criticalAck : false,
        critical_acknowledged_by: hasCritical && criticalAck ? user?.id ?? null : null,
        critical_acknowledged_at: hasCritical && criticalAck ? now : null,
        updated_at: now
      }
      await writeRecord('results', 'UPDATE', updated, result)
      setResult(updated)
      toast.push(
        offlineSuccessMessage(
          nextStatus === 'draft' ? 'Draft saved' : finalise ? 'Result finalised — ready to deliver' : 'Submitted for approval'
        )
      )
      navigate(`/app/results/${updated.id}`)
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loaded && !result) {
    return (
      <EmptyState
        icon="?"
        headline="Result not found"
        description="This result is not cached locally yet."
        cta={<Button variant="secondary" onClick={() => navigate('/app/results')}>Back to results</Button>}
      />
    )
  }
  if (!result) return <div className="app-loading">Loading…</div>

  const canSubmit = !hasCritical || criticalAck
  const setVal = (k: string, val: string) => setValues((prev) => ({ ...prev, [k]: val }))

  return (
    <div className="entry">
      <header className="entry__head">
        <div>
          <h1 className="entry__title">{test?.name ?? result.test_type}</h1>
          <p className="entry__subtitle">
            {patient?.full_name ?? 'Unknown'} · <span className="table-id">{result.labid}</span>
            {test ? ` · ${test.category} · ${test.specimen}` : ''}
          </p>
        </div>
        <span className={`chip ${result.status === 'draft' ? 'c-slate' : result.status === 'awaiting_approval' ? 'c-amber' : 'c-green'}`}>
          {result.status.replace('_', ' ')}
        </span>
      </header>

      <section className="owner-panel">
        <div className="owner-panel__head">
          <h3>{shape === 'narrative' ? 'Findings' : 'Parameters'}</h3>
          <span className="owner-panel__meta">{shape} · sample #{result.sample_id}</span>
        </div>

        {shape === 'narrative' ? (
          <div className="entry-narrative">
            <textarea
              className="entry-textarea"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Type the report / findings…"
            />
            <p className="entry-attach-note">Image / PDF attachment will be available once the backend is connected.</p>
          </div>
        ) : (
          <div className="entry-rows">
            {params.map((p) => {
              const status = parameters[p.key]?.status ?? 'normal'
              const fc = flagClass(status)
              return (
                <div className="entry-row" key={p.key}>
                  <div className="entry-row__label">
                    <strong>{p.name}</strong>
                    {shape !== 'descriptive' ? <span className="entry-row__ref">Ref: {refText(p)}</span> : null}
                  </div>
                  <div className="entry-row__field">
                    {shape === 'qualitative' && p.qualitative_options ? (
                      <select className="form-input entry-select" value={values[p.key] ?? ''} onChange={(e) => setVal(p.key, e.target.value)}>
                        <option value="">Select…</option>
                        {p.qualitative_options.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="form-input entry-input"
                        inputMode={isNumericShape(shape) ? 'decimal' : 'text'}
                        value={values[p.key] ?? ''}
                        onChange={(e) => setVal(p.key, e.target.value)}
                        placeholder={p.unit ?? ''}
                      />
                    )}
                    {p.unit && isNumericShape(shape) ? <span className="entry-unit">{p.unit}</span> : null}
                    {fc ? <span className={`entry-flag entry-flag--${fc}`}>{flagText(status)}{arrow(status)}</span> : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {hasCritical ? (
        <div className="entry-crit">
          <span className="entry-crit__msg"><AlertTriangle size={18} /> Critical value detected — acknowledge before submitting.</span>
          <label className="entry-crit__ack">
            <input type="checkbox" checked={criticalAck} onChange={(e) => setCriticalAck(e.target.checked)} />
            I acknowledge this critical value
          </label>
        </div>
      ) : null}

      <section className="owner-panel">
        <div className="owner-panel__head"><h3>Comments / interpretation</h3></div>
        <textarea className="entry-textarea entry-textarea--short" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Optional interpretation for the report…" />
      </section>

      <div className="entry-actions">
        <Button variant="secondary" loading={saving} type="button" onClick={() => void persist('draft')}>Save draft</Button>
        {features.approvalStep ? (
          <Button variant="primary" loading={saving} disabled={!canSubmit} type="button" onClick={() => void persist('awaiting_approval')}>Submit for approval</Button>
        ) : (
          <Button variant="primary" loading={saving} disabled={!canSubmit} type="button" onClick={() => void persist('approved')}>Save &amp; finalise</Button>
        )}
        <span className="entry-updated">Saved locally · {formatDateTime(result.updated_at)}</span>
      </div>
    </div>
  )
}
