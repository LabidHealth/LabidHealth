import React, { useEffect, useMemo, useState } from 'react'
import { invoiceRepo, patientRepo, resultRepo, visitRepo } from '@/lib/repositories'
import QRCode from 'qrcode'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Avatar, Badge, Button, EmptyState } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { formatDate, formatDateTime, formatNaira, formatPhone, formatTimeAgo } from '@/lib/formatters'
import { openAndPrintPdfBlob } from '@/lib/printPdf'
import { supabase } from '@/lib/supabase'
import type { Invoice, Patient, PatientVisit, Result } from '@/types'

interface ConsentHistoryEntry {
  id: string
  action: 'INSERT' | 'UPDATE'
  created_at: string
  user_role: string | null
  new_record: {
    consent: boolean
    consent_date: string | null
  } | null
}

export function PatientDetailPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { role } = useAuthContext()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [visits, setVisits] = useState<PatientVisit[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [consentHistory, setConsentHistory] = useState<ConsentHistoryEntry[]>([])
  const [activeTab, setActiveTab] = useState<'visits' | 'results' | 'invoices' | 'consent'>('visits')

  useEffect(() => {
    if (!patientId) return

    let mounted = true

    const load = async () => {
      const currentPatient = await patientRepo.get(patientId)
      if (!mounted || !currentPatient) return

      const [patientVisits, patientResults, patientInvoices] = await Promise.all([
        visitRepo.listByLabidRecent(currentPatient.labid),
        resultRepo.listByLabidRecent(currentPatient.labid),
        invoiceRepo.listByLabidRecent(currentPatient.labid)
      ])

      setPatient(currentPatient)
      setVisits(patientVisits)
      setResults(patientResults)
      setInvoices(patientInvoices)

      // Load consent history from audit_log
      if (role === 'owner') {
        try {
          const { data: consentLogs } = await supabase
            .from('audit_log')
            .select('*')
            .eq('table_name', 'patients')
            .eq('record_id', currentPatient.id)
            .in('action', ['INSERT', 'UPDATE'])
            .order('created_at', { ascending: true })
          setConsentHistory((consentLogs as ConsentHistoryEntry[]) || [])
        } catch {
          // Ignore audit log errors
        }
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [patientId, role])

  const latestVisit = useMemo(() => visits[visits.length - 1], [visits])

  if (!patient) {
    return (
      <EmptyState
        icon="?"
        headline="Patient not found"
        description="The patient record is not available in local storage yet."
        cta={
          <Button variant="secondary" onClick={() => navigate('/app/patients')}>
            Back to patients
          </Button>
        }
      />
    )
  }

  const currentPatient = patient
  const canEditPatient = role === 'front_desk' || role === 'manager'

  async function handlePrintLabidCard() {
    const qrDataUrl = await QRCode.toDataURL(currentPatient.labid, { margin: 1, width: 256 })
    const [{ pdf }, { LabidCardPDF }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/pdf/LabidCardPDF')
    ])
    const blob = await pdf(
      <LabidCardPDF patientName={currentPatient.full_name} labid={currentPatient.labid} qrDataUrl={qrDataUrl} />
    ).toBlob()
    await openAndPrintPdfBlob(blob)
  }

  return (
    <section className="patient-detail">
      <header className="patient-detail__header">
        <div className="patient-detail__identity">
          <Avatar name={currentPatient.full_name} src={currentPatient.photo_url} />
          <div>
            <h2>{currentPatient.full_name}</h2>
            <p className="table-id">{currentPatient.labid}</p>
          </div>
        </div>
        <div className="patient-detail__actions">
          {searchParams.get('mode') === 'edit' && <Badge status="info">Edit mode</Badge>}
          {canEditPatient ? (
            <Button variant="secondary" onClick={() => navigate(`/app/patients/${currentPatient.id}?mode=edit`)}>
              Edit
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => void handlePrintLabidCard()}>
            Print LABID card
          </Button>
          <Button variant="primary" onClick={() => navigate(`/app/samples/register?labid=${encodeURIComponent(currentPatient.labid)}`)}>
            New Visit / Register Sample
          </Button>
        </div>
      </header>

      <div className="patient-detail__grid">
        <article className="detail-card">
          <h3>Profile</h3>
          <dl className="detail-list">
            <div><dt>Phone</dt><dd>{formatPhone(patient.phone)}</dd></div>
            <div><dt>Date of birth</dt><dd>{patient.date_of_birth ? formatDate(patient.date_of_birth) : 'Not provided'}</dd></div>
            <div><dt>Gender</dt><dd>{patient.gender ?? 'Not provided'}</dd></div>
            <div><dt>Address</dt><dd>{patient.address ?? 'Not provided'}</dd></div>
            <div><dt>Consent</dt><dd>{patient.consent ? 'Granted' : 'Not granted'}</dd></div>
          </dl>
        </article>

        <article className="detail-card">
          <h3>Visit summary</h3>
          <dl className="detail-list">
            <div><dt>Total visits</dt><dd>{visits.length}</dd></div>
            <div><dt>Latest visit</dt><dd>{latestVisit ? formatTimeAgo(latestVisit.visited_at) : 'No visits yet'}</dd></div>
            <div><dt>Registered</dt><dd>{formatDate(patient.created_at)}</dd></div>
          </dl>
        </article>
      </div>

      <article className="detail-card">
        <div className="filter-row">
          <button
            type="button"
            className={`filter-chip${activeTab === 'visits' ? ' filter-chip--active' : ''}`}
            onClick={() => setActiveTab('visits')}
          >
            Visit History
          </button>
          <button
            type="button"
            className={`filter-chip${activeTab === 'results' ? ' filter-chip--active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            Results
          </button>
          <button
            type="button"
            className={`filter-chip${activeTab === 'invoices' ? ' filter-chip--active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices
          </button>
          {role === 'owner' ? (
            <button
              type="button"
              className={`filter-chip${activeTab === 'consent' ? ' filter-chip--active' : ''}`}
              onClick={() => setActiveTab('consent')}
            >
              Consent History
            </button>
          ) : null}
        </div>

        {activeTab === 'visits' ? (
          <>
            <h3>Visit history</h3>
            {visits.length === 0 ? (
              <EmptyState icon="-" headline="No visits yet" description="A visit will appear here after registration." />
            ) : (
              <div className="detail-timeline">
                {visits.map((visit) => (
                  <div key={visit.id} className="detail-timeline__row">
                    <strong>{formatDate(visit.visited_at)}</strong>
                    <span>{formatTimeAgo(visit.visited_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {activeTab === 'results' ? (
          <>
            <h3>Results</h3>
            {results.length === 0 ? (
              <EmptyState icon="-" headline="No results yet" description="Results will appear here after entry and approval." />
            ) : (
              <div className="pending-list">
                {results.map((result) => (
                  <div key={result.id} className="pending-row">
                    <div>
                      <p>{result.test_type}</p>
                      <small className="pending-row__meta">
                        <span className="table-id">{result.sample_id}</span>
                        <Badge status={result.status === 'approved' ? 'SUCCESS' : result.status === 'awaiting_approval' ? 'AWAITING APPROVAL' : 'INFO'}>
                          {result.status.replace(/_/g, ' ')}
                        </Badge>
                        <span>{formatTimeAgo(result.created_at)}</span>
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/app/results/${result.id}`)}>
                        View
                      </Button>
                      {result.pdf_url ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(result.pdf_url!, '_blank')}
                        >
                          Download PDF
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {activeTab === 'invoices' ? (
          <>
            <h3>Invoices</h3>
            {invoices.length === 0 ? (
              <EmptyState icon="-" headline="No invoices yet" description="Invoices will appear after sample registration." />
            ) : (
              <div className="pending-list">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="pending-row">
                    <div>
                      <p className="table-id">#{invoice.invoice_id}</p>
                      <small className="pending-row__meta">
                        <span>{formatDateTime(invoice.created_at)}</span>
                        <span>{invoice.status}</span>
                        <span>{formatNaira(invoice.total)}</span>
                      </small>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/app/billing')}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {activeTab === 'consent' ? (
          <>
            <h3>Consent History</h3>
            {consentHistory.length === 0 ? (
              <EmptyState icon="-" headline="No consent history" description="Consent changes will appear here." />
            ) : (
              <div className="detail-timeline">
                {consentHistory.map((entry) => (
                  <div key={entry.id} className="detail-timeline__row">
                    <div>
                      <strong>{formatDateTime(entry.created_at)}</strong>
                      <span style={{ fontSize: 12, color: '#4A4A4A' }}>
                        {entry.action === 'INSERT' ? 'Initial consent' : 'Consent updated'} by {entry.user_role || 'Unknown'}
                      </span>
                    </div>
                    <Badge status={entry.new_record?.consent ? 'SUCCESS' : 'WARNING'}>
                      {entry.new_record?.consent ? 'Granted' : 'Revoked'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </article>
    </section>
  )
}
