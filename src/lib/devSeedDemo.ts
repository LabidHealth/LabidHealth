import { db } from './db'
import { DEV_LAB_ID, DEV_USERS } from './devMode'
import type {
  Invoice,
  Notification,
  Patient,
  PatientVisit,
  Payment,
  PaymentMethod,
  Result,
  ResultParameter,
  ResultStatus,
  Sample,
  SampleStatus
} from '@/types'

const LAB = DEV_LAB_ID
const SCI = DEV_USERS.scientist.userId
const FD = DEV_USERS.front_desk.userId

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()
const hrs = (h: number) => h * 3_600_000
const days = (d: number) => d * 86_400_000

type TestRef = { code: string; name: string; price: number } // price in kobo

const T: Record<string, TestRef> = {
  FBC: { code: 'FBC', name: 'Full Blood Count', price: 350000 },
  MAL: { code: 'MALRDT', name: 'Malaria RDT', price: 150000 },
  EU: { code: 'RFT', name: 'Electrolytes & Urea (E&U)', price: 500000 },
  LFT: { code: 'LFT', name: 'Liver Function Test', price: 500000 },
  WIDAL: { code: 'WIDAL', name: 'Widal Test', price: 200000 },
  HBA1C: { code: 'HBA1C', name: 'HbA1c', price: 400000 },
  URIN: { code: 'URINAL', name: 'Urinalysis', price: 150000 },
  LIPID: { code: 'LIPID', name: 'Lipid Profile', price: 450000 },
  FBG: { code: 'FBG', name: 'Fasting Blood Glucose', price: 120000 }
}

const fbcParams: Record<string, ResultParameter> = {
  hb: { value: '10.4', unit: 'g/dl', status: 'low' },
  pcv: { value: '38', unit: '%', status: 'normal' },
  wbc: { value: '14.2', unit: 'x10^9/L', status: 'high' },
  plt: { value: '266', unit: 'x10^9/L', status: 'normal' },
  neut: { value: '71', unit: '%', status: 'normal' }
}

const lipidParams: Record<string, ResultParameter> = {
  chol: { value: '6.8', unit: 'mmol/L', status: 'high' },
  hdl: { value: '0.9', unit: 'mmol/L', status: 'low' },
  ldl: { value: '4.6', unit: 'mmol/L', status: 'high' },
  trig: { value: '2.1', unit: 'mmol/L', status: 'high' }
}

type Entry = {
  labid: string
  name: string
  phone: string
  sex: 'male' | 'female'
  dob: string
  tests: TestRef[]
  sampleStatus: SampleStatus
  stat?: boolean
  collectedMsAgo: number
  payment?: { method: PaymentMethod; amount: number } // amount in kobo (< total ⇒ partial)
  result?: {
    status: ResultStatus
    approvedMsAgo?: number
    params?: Record<string, ResultParameter>
    comments?: string
  }
  notification?: { status: 'delivered' | 'sent' | 'opened'; sentMsAgo: number; openedMsAgo?: number }
}

const ENTRIES: Entry[] = [
  {
    labid: 'LB-2026-00412', name: 'Chioma Okafor', phone: '2348034412201', sex: 'female', dob: '1994-03-11',
    tests: [T.FBC, T.MAL], sampleStatus: 'delivered', collectedMsAgo: hrs(5),
    payment: { method: 'pos', amount: 500000 },
    result: { status: 'approved', approvedMsAgo: hrs(2), params: fbcParams, comments: 'Mild anaemia with leucocytosis; suggest clinical correlation.' },
    notification: { status: 'opened', sentMsAgo: hrs(2), openedMsAgo: hrs(1) }
  },
  {
    labid: 'LB-2026-00411', name: 'Emeka Nwosu', phone: '2348059021447', sex: 'male', dob: '1987-09-02',
    tests: [T.EU, T.LFT], sampleStatus: 'processing', collectedMsAgo: hrs(1),
    payment: { method: 'pos', amount: 500000 } // partial (total 1,000,000)
  },
  {
    labid: 'LB-2026-00410', name: 'Ngozi Ade', phone: '2348073355910', sex: 'female', dob: '1979-12-20',
    tests: [T.WIDAL, T.HBA1C], sampleStatus: 'ready', collectedMsAgo: days(2) + hrs(3),
    payment: { method: 'bank_transfer', amount: 600000 },
    result: { status: 'approved', approvedMsAgo: days(2) },
    notification: { status: 'sent', sentMsAgo: days(2) } // not opened → undelivered
  },
  {
    labid: 'LB-2026-00409', name: 'Musa Umar', phone: '2348137788201', sex: 'male', dob: '2001-06-14',
    tests: [T.URIN], sampleStatus: 'received', collectedMsAgo: hrs(1),
    result: { status: 'draft' }
  },
  {
    labid: 'LB-2026-00408', name: 'Blessing Eze', phone: '2348021120774', sex: 'female', dob: '1990-01-28',
    tests: [T.LIPID, T.FBG], sampleStatus: 'awaiting_approval', collectedMsAgo: hrs(3),
    payment: { method: 'cash', amount: 570000 },
    result: { status: 'awaiting_approval', params: lipidParams }
  },
  {
    labid: 'LB-2026-00415', name: 'Uche Obi', phone: '2348090011882', sex: 'male', dob: '1996-11-05',
    tests: [T.FBC], sampleStatus: 'processing', stat: true, collectedMsAgo: hrs(0.3),
    payment: { method: 'pos', amount: 350000 },
    result: { status: 'draft', params: fbcParams }
  }
]

export async function seedDemoData(): Promise<void> {
  const patients: Patient[] = []
  const visits: PatientVisit[] = []
  const samples: Sample[] = []
  const invoices: Invoice[] = []
  const payments: Payment[] = []
  const results: Result[] = []
  const notifications: Notification[] = []

  ENTRIES.forEach((e, i) => {
    const collectedAt = iso(e.collectedMsAgo)
    const sampleId = `LB-${4200 + i}`
    const total = e.tests.reduce((a, t) => a + t.price, 0)
    const paid = e.payment ? Math.min(e.payment.amount, total) : 0
    const status = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

    patients.push({
      id: `dev-p-${i}`, labid: e.labid, full_name: e.name, date_of_birth: e.dob, gender: e.sex,
      phone: e.phone, address: null, next_of_kin: null, next_of_kin_phone: null, photo_url: null,
      consent: true, consent_date: collectedAt, created_at: collectedAt, updated_at: collectedAt
    })
    visits.push({ id: `dev-v-${i}`, labid: e.labid, lab_id: LAB, visited_at: collectedAt, created_by: FD })
    samples.push({
      id: `dev-s-${i}`, sample_id: sampleId, labid: e.labid, lab_id: LAB, status: e.sampleStatus,
      is_stat: Boolean(e.stat), tests_ordered: e.tests.map((t) => t.code), referring_doctor: null,
      collected_at: collectedAt, collected_by: FD, rejection_reason: null, notes: null,
      created_at: collectedAt, updated_at: collectedAt
    })
    invoices.push({
      id: `dev-i-${i}`, invoice_id: `INV-${9000 + i}`, labid: e.labid, lab_id: LAB, sample_id: sampleId,
      line_items: e.tests.map((t) => ({ test_code: t.code, test_name: t.name, price: t.price })),
      subtotal: total, platform_fee: 0, total, amount_paid: paid, outstanding: total - paid,
      status, notes: null, created_by: FD, created_at: collectedAt, updated_at: collectedAt
    })
    if (e.payment && paid > 0) {
      payments.push({
        id: `dev-pay-${i}`, invoice_id: `INV-${9000 + i}`, lab_id: LAB, amount: paid,
        method: e.payment.method, reference: null, recorded_by: FD, voided: false, void_reason: null,
        voided_by: null, created_at: collectedAt
      })
    }
    if (e.result) {
      const approvedAt = e.result.approvedMsAgo != null ? iso(e.result.approvedMsAgo) : null
      results.push({
        id: `dev-r-${i}`, sample_id: sampleId, labid: e.labid, lab_id: LAB,
        test_type: e.tests[0].name, parameters: e.result.params ?? {}, comments: e.result.comments ?? null,
        status: e.result.status, entered_by: SCI, approved_by: approvedAt ? SCI : null, approved_at: approvedAt,
        pdf_url: null, pdf_generated_at: null, critical_acknowledged: false, critical_acknowledged_by: null,
        critical_acknowledged_at: null, created_at: collectedAt, updated_at: approvedAt ?? collectedAt
      })
    }
    if (e.notification) {
      notifications.push({
        id: `dev-n-${i}`, labid: e.labid, result_id: `dev-r-${i}`, lab_id: LAB, channel: 'whatsapp',
        status: e.notification.status, recipient_phone: e.phone, secure_link: null, link_token: null,
        link_expires_at: null, sent_at: iso(e.notification.sentMsAgo),
        delivered_at: e.notification.status !== 'sent' ? iso(e.notification.sentMsAgo) : null,
        opened_at: e.notification.openedMsAgo != null ? iso(e.notification.openedMsAgo) : null,
        failure_reason: null, is_doctor_copy: false, doctor_name: null, superseded_by: null,
        created_at: iso(e.notification.sentMsAgo)
      })
    }
  })

  await db.patients.bulkPut(patients)
  await db.patient_visits.bulkPut(visits)
  await db.samples.bulkPut(samples)
  await db.invoices.bulkPut(invoices)
  await db.payments.bulkPut(payments)
  await db.results.bulkPut(results)
  await db.notifications.bulkPut(notifications)
}
