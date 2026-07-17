import type { Table } from 'dexie'
import { db } from './db'
import { writeRecord } from './writeRecord'
import type {
  Invoice,
  Lab,
  LabStaff,
  Notification,
  Patient,
  PatientVisit,
  Payment,
  PriceListItem,
  Result,
  ResultAmendment,
  Sample,
  SampleEvent
} from '@/types'

/**
 * Data-access layer. Screens go through these repositories instead of touching
 * Dexie or the sync queue directly, so the storage/sync engine (Dexie today,
 * potentially PowerSync later) can be swapped without changing any screen.
 * Writes go through writeRecord (local Dexie + outbox + audit).
 */
function crud<T extends { id: string }>(table: string, tbl: () => Table<T, string>) {
  return {
    get: (id: string) => tbl().get(id),
    all: () => tbl().toArray(),
    create: (row: T) => writeRecord<T>(table, 'INSERT', row),
    update: (row: T, old?: Partial<T> | null) => writeRecord<T>(table, 'UPDATE', row, old),
    remove: (row: T) => writeRecord<T>(table, 'DELETE', row),
    bulkPut: async (rows: T[]): Promise<void> => {
      await tbl().bulkPut(rows)
    }
  }
}

export const patientRepo = {
  ...crud<Patient>('patients', () => db.patients),
  byLabid: (labid: string) => db.patients.where('labid').equals(labid).first(),
  listByLabid: (labid: string) => db.patients.where('labid').equals(labid).toArray()
}

export const visitRepo = {
  ...crud<PatientVisit>('patient_visits', () => db.patient_visits),
  listByLabid: (labid: string) => db.patient_visits.where('labid').equals(labid).toArray(),
  listByLabidRecent: (labid: string) => db.patient_visits.where('labid').equals(labid).reverse().sortBy('visited_at')
}

export const sampleRepo = {
  ...crud<Sample>('samples', () => db.samples),
  bySampleId: (sampleId: string) => db.samples.where('sample_id').equals(sampleId).first()
}

export const sampleEventRepo = {
  ...crud<SampleEvent>('sample_events', () => db.sample_events),
  listBySample: (sampleId: string) => db.sample_events.where('sample_id').equals(sampleId).toArray(),
  listBySampleSorted: (sampleId: string) => db.sample_events.where('sample_id').equals(sampleId).sortBy('created_at')
}

export const resultRepo = {
  ...crud<Result>('results', () => db.results),
  listByLabid: (labid: string) => db.results.where('labid').equals(labid).toArray(),
  listByLabidRecent: (labid: string) => db.results.where('labid').equals(labid).reverse().sortBy('created_at'),
  // created_at is not part of the results index, so this sorts in memory —
  // matching listByLabidRecent above. Per-lab result volume is bounded.
  listRecent: async () => (await db.results.toArray()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

export const amendmentRepo = {
  ...crud<ResultAmendment>('result_amendments', () => db.result_amendments)
}

export const invoiceRepo = {
  ...crud<Invoice>('invoices', () => db.invoices),
  byInvoiceId: (invoiceId: string) => db.invoices.where('invoice_id').equals(invoiceId).first(),
  listByLabid: (labid: string) => db.invoices.where('labid').equals(labid).toArray(),
  listByLabidRecent: (labid: string) => db.invoices.where('labid').equals(labid).reverse().sortBy('created_at'),
  listRecent: () => db.invoices.orderBy('created_at').reverse().toArray()
}

export const paymentRepo = {
  ...crud<Payment>('payments', () => db.payments),
  listByInvoice: (invoiceId: string) => db.payments.where('invoice_id').equals(invoiceId).toArray()
}

export const labRepo = {
  ...crud<Lab>('labs', () => db.labs)
}

export const staffRepo = {
  ...crud<LabStaff>('lab_staff', () => db.lab_staff),
  byUser: (userId: string) => db.lab_staff.where('user_id').equals(userId).first()
}

export const priceRepo = {
  ...crud<PriceListItem>('price_list', () => db.price_list),
  listByLab: (labId: string) => db.price_list.where('lab_id').equals(labId).toArray()
}

export const notificationRepo = {
  ...crud<Notification>('notifications', () => db.notifications),
  listByResult: (resultId: string) => db.notifications.where('result_id').equals(resultId).toArray()
}

/**
 * Read-only by design: the audit trail is append-only and is written solely by
 * writeRecord (via logAuditEvent), never by a screen.
 */
export const auditRepo = {
  listByRecord: (table: string, recordId: string) =>
    db.audit_log.filter((entry) => entry.table_name === table && entry.record_id === recordId).sortBy('created_at')
}
