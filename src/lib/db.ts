import Dexie, { type Table } from 'dexie'
import type {
  AuditLogEntry,
  CatalogParameter,
  CatalogTest,
  Invoice,
  Lab,
  LabStaff,
  Notification,
  Patient,
  PatientVisit,
  PriceListItem,
  Payment,
  Result,
  ResultAmendment,
  Sample,
  SampleEvent,
  SyncQueueItem
} from '@/types'

export interface DbSchema {
  labs: Table<Lab, string>
  lab_staff: Table<LabStaff, string>
  patients: Table<Patient, string>
  patient_visits: Table<PatientVisit, string>
  price_list: Table<PriceListItem, string>
  catalog_tests: Table<CatalogTest, string>
  catalog_parameters: Table<CatalogParameter, string>
  samples: Table<Sample, string>
  sample_events: Table<SampleEvent, string>
  results: Table<Result, string>
  result_amendments: Table<ResultAmendment, string>
  invoices: Table<Invoice, string>
  payments: Table<Payment, string>
  notifications: Table<Notification, string>
  syncQueue: Table<SyncQueueItem, number>
  audit_log: Table<AuditLogEntry, string>
}

class LabidDatabase extends Dexie implements DbSchema {
  labs!: Table<Lab, string>
  lab_staff!: Table<LabStaff, string>
  patients!: Table<Patient, string>
  patient_visits!: Table<PatientVisit, string>
  price_list!: Table<PriceListItem, string>
  catalog_tests!: Table<CatalogTest, string>
  catalog_parameters!: Table<CatalogParameter, string>
  samples!: Table<Sample, string>
  sample_events!: Table<SampleEvent, string>
  results!: Table<Result, string>
  result_amendments!: Table<ResultAmendment, string>
  invoices!: Table<Invoice, string>
  payments!: Table<Payment, string>
  notifications!: Table<Notification, string>
  syncQueue!: Table<SyncQueueItem, number>
  audit_log!: Table<AuditLogEntry, string>

  constructor() {
    super('LabidHealth')
    this.version(1).stores({
      labs: 'id, name, mlscn_no, is_active',
      lab_staff: 'id, user_id, lab_id, role, is_active',
      patients: 'id, labid, phone, consent, created_at, updated_at',
      patient_visits: 'id, labid, lab_id, visited_at',
      price_list: 'id, lab_id, test_code, test_name, category, is_active',
      samples: 'id, sample_id, labid, lab_id, status, collected_at, is_stat',
      sample_events: 'id, sample_id, created_at',
      results: 'id, sample_id, labid, lab_id, status, approved_at',
      result_amendments: 'id, result_id, amended_at',
      invoices: 'id, invoice_id, labid, lab_id, status, created_at',
      payments: 'id, invoice_id, lab_id, created_at',
      notifications: 'id, labid, result_id, lab_id, status, created_at',
      syncQueue: '++id, table, operation, recordId, timestamp, attempts',
      audit_log: 'id, lab_id, user_id, action, created_at'
    })
    this.version(2).stores({
      catalog_tests: 'id, lab_id, code, name, result_type, active',
      catalog_parameters: 'id, test_id, sort'
    })
  }
}

export const db = new LabidDatabase()
