import React, { useEffect, useState } from 'react'
import { invoiceRepo, patientRepo, priceRepo, sampleEventRepo, sampleRepo } from '@/lib/repositories'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, Input, useToast } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import { offlineSuccessMessage } from '@/lib/offlineWrite'
import { friendlyError, supabaseQuery } from '@/lib/supabaseQuery'
import type { InvoiceLineItem, Patient, PriceListItem, Sample, SampleEvent } from '@/types'

type TestCategory = {
  name: string
  tests: Array<{ code: string; name: string }>
}

const TEST_CATEGORIES: TestCategory[] = [
  {
    name: 'Haematology',
    tests: [
      { code: 'FBC', name: 'Full Blood Count' },
      { code: 'DIFF', name: 'Differential Count' },
      { code: 'ESR', name: 'ESR' },
      { code: 'BGG', name: 'Blood Group & Genotype' },
      { code: 'MALRDT', name: 'Malaria RDT' },
      { code: 'MALMIC', name: 'Malaria Microscopy' }
    ]
  },
  {
    name: 'Biochemistry',
    tests: [
      { code: 'LFT', name: 'Liver Function Test' },
      { code: 'RFT', name: 'Renal Function Test' },
      { code: 'LIPID', name: 'Lipid Panel' },
      { code: 'FBG', name: 'Fasting Blood Glucose' },
      { code: 'HBA1C', name: 'HbA1c' }
    ]
  },
  {
    name: 'Microbiology',
    tests: [
      { code: 'CNS', name: 'Culture & Sensitivity' },
      { code: 'WIDAL', name: 'Widal Test' },
      { code: 'VDRL', name: 'VDRL/TPHA' },
      { code: 'HBSAG', name: 'HBsAg' },
      { code: 'HIV', name: 'HIV Screening' }
    ]
  },
  {
    name: 'Urinalysis',
    tests: [
      { code: 'URINAL', name: 'Urinalysis' },
      { code: 'URMIC', name: 'Urine Microscopy' }
    ]
  },
  {
    name: 'Hormones',
    tests: [
      { code: 'TSH', name: 'TSH' },
      { code: 'FT3', name: 'FT3' },
      { code: 'FT4', name: 'FT4' },
      { code: 'PSA', name: 'PSA' },
      { code: 'PREG', name: 'Pregnancy Test' }
    ]
  },
  {
    name: 'Other',
    tests: [{ code: 'STOOL', name: 'Stool Microscopy' }]
  }
]

function generateSampleId() {
  const randomPart = `${Math.floor(Math.random() * 9999) + 1}`.padStart(4, '0')
  return `LB-${randomPart}`
}

async function loadPriceList(labId: string | null) {
  if (!labId) return []
  const local = await priceRepo.listByLab(labId)
  if (local.length > 0 || !navigator.onLine) return local

  const { data } = await supabaseQuery<PriceListItem[]>(
    (await import('@/lib/supabase')).supabase
      .from('price_list' as never)
      .select('*')
      .eq('lab_id', labId)
  )

  if (data) {
    await priceRepo.bulkPut(data)
    return data
  }
  return local
}

export function RegisterSamplePage() {
  const [searchParams] = useSearchParams()
  const prefillLabid = searchParams.get('labid') ?? ''
  const navigate = useNavigate()
  const toast = useToast()
  const { labId, user } = useAuthContext()

  const [labid, setLabid] = useState(prefillLabid)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [tests, setTests] = useState<string[]>([])
  const [referringDoctor, setReferringDoctor] = useState('')
  const [collectedAt, setCollectedAt] = useState(() => new Date().toISOString())
  const [isStat, setIsStat] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!labid) {
      setPatient(null)
      return
    }
    let mounted = true
    void patientRepo.byLabid(labid).then((match) => {
      if (mounted) setPatient(match ?? null)
    })
    return () => {
      mounted = false
    }
  }, [labid])

  function toggleTest(code: string) {
    setTests((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]))
  }

  async function handleSubmit() {
    if (!labId) {
      toast.push('Lab context missing. Please sign in again.', 'error')
      return
    }
    if (!patient) {
      toast.push('Enter a valid LABID first.', 'error')
      return
    }
    if (tests.length === 0) {
      toast.push('Select at least one test.', 'error')
      return
    }

    setLoading(true)
    try {
      const now = new Date().toISOString()
      const sampleId = generateSampleId()
      const sample: Sample = {
        id: crypto.randomUUID(),
        sample_id: sampleId,
        labid: patient.labid,
        lab_id: labId,
        status: 'received',
        is_stat: isStat,
        tests_ordered: tests,
        referring_doctor: referringDoctor || null,
        collected_at: collectedAt || now,
        collected_by: user?.id ?? null,
        rejection_reason: null,
        notes: null,
        created_at: now,
        updated_at: now
      }

      await sampleRepo.create(sample)

      const event: SampleEvent = {
        id: crypto.randomUUID(),
        sample_id: sample.sample_id,
        event_type: 'received',
        performed_by: user?.id ?? null,
        station: 'reception',
        notes: null,
        created_at: now
      }
      await sampleEventRepo.create(event)

      const priceList = await loadPriceList(labId)
      const priceByCode = new Map(priceList.filter((item) => item.is_active).map((item) => [item.test_code, item.standard_price] as const))
      const nameByCode = new Map(priceList.filter((item) => item.is_active).map((item) => [item.test_code, item.test_name] as const))

      const lineItems: InvoiceLineItem[] = tests.map((code) => ({
        test_code: code,
        test_name: nameByCode.get(code) ?? code,
        price: priceByCode.get(code) ?? 0
      }))

      const subtotal = lineItems.reduce((sum, item) => sum + item.price, 0)
      await invoiceRepo.create({
        id: crypto.randomUUID(),
        invoice_id: `INV-${`${Math.floor(Math.random() * 9999) + 1}`.padStart(4, '0')}`,
        labid: patient.labid,
        lab_id: labId,
        sample_id: sample.sample_id,
        line_items: lineItems,
        subtotal,
        platform_fee: 0,
        total: subtotal,
        amount_paid: 0,
        outstanding: subtotal,
        status: 'unpaid',
        notes: null,
        created_by: user?.id ?? null,
        created_at: now,
        updated_at: now
      })

      toast.push(offlineSuccessMessage(`Sample registered - #${sample.sample_id}`))
      navigate(`/app/samples/${sample.id}`)
    } catch (error) {
      toast.push(friendlyError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="form-page">
      <header>
        <h2>Register Sample</h2>
      </header>

      <div className="detail-card">
        <h3>LABID lookup</h3>
        <div className="form-grid">
          <Input label="LABID" value={labid} placeholder="LB-2026-00001" onChange={(e) => setLabid(e.target.value)} />
        </div>

        {!labid ? (
          <EmptyState icon="-" headline="Enter a LABID" description="Type the patient's LABID to load their record." />
        ) : !patient ? (
          <EmptyState icon="?" headline="Patient not found" description="No matching patient record in local storage yet." />
        ) : (
          <div className="detail-list">
            <div><dt>Patient</dt><dd>{patient.full_name}</dd></div>
            <div><dt>LABID</dt><dd className="table-id">{patient.labid}</dd></div>
          </div>
        )}
      </div>

      <div className="detail-card">
        <h3>Tests ordered</h3>
        {TEST_CATEGORIES.map((category) => (
          <div key={category.name} style={{ marginBottom: 12 }}>
            <p className="list-subtitle">{category.name}</p>
            <div className="detail-timeline">
              {category.tests.map((test) => (
                <label key={test.code} className="form-label form-checkbox">
                  <input type="checkbox" checked={tests.includes(test.code)} onChange={() => toggleTest(test.code)} />
                  <span>{test.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="detail-card">
        <h3>Details</h3>
        <div className="form-grid">
          <Input label="Referring doctor" value={referringDoctor} onChange={(e) => setReferringDoctor(e.target.value)} />
          <Input label="Collection date/time" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} placeholder={new Date().toISOString()} />
          <label className="form-label form-checkbox">
            <input type="checkbox" checked={isStat} onChange={(e) => setIsStat(e.target.checked)} />
            <span>STAT (urgent)</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        <Button variant="primary" loading={loading} type="button" onClick={() => void handleSubmit()}>
          Register sample
        </Button>
        <span className="form-autosave">Saved locally first. Syncs automatically when online.</span>
      </div>
    </section>
  )
}
