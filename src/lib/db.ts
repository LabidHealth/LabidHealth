import Dexie, { type Table } from 'dexie'
import type {
  AuditLogEntry,
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
  SyncQueueItem,
  InventoryItem,
  InventoryEvent
} from '@/types'

export interface DbSchema {
  labs: Table<Lab, string>
  lab_staff: Table<LabStaff, string>
  patients: Table<Patient, string>
  patient_visits: Table<PatientVisit, string>
  price_list: Table<PriceListItem, string>
  samples: Table<Sample, string>
  sample_events: Table<SampleEvent, string>
  results: Table<Result, string>
  result_amendments: Table<ResultAmendment, string>
  invoices: Table<Invoice, string>
  payments: Table<Payment, string>
  inventory: Table<InventoryItem, string>
  inventory_events: Table<InventoryEvent, string>
  notifications: Table<Notification, string>
  syncQueue: Table<SyncQueueItem, number>
  audit_log: Table<AuditLogEntry, string>
}

class LaboraDatabase extends Dexie implements DbSchema {
  labs!: Table<Lab, string>
  lab_staff!: Table<LabStaff, string>
  patients!: Table<Patient, string>
  patient_visits!: Table<PatientVisit, string>
  price_list!: Table<PriceListItem, string>
  samples!: Table<Sample, string>
  sample_events!: Table<SampleEvent, string>
  results!: Table<Result, string>
  result_amendments!: Table<ResultAmendment, string>
  invoices!: Table<Invoice, string>
  payments!: Table<Payment, string>
  inventory!: Table<InventoryItem, string>
  inventory_events!: Table<InventoryEvent, string>
  notifications!: Table<Notification, string>
  syncQueue!: Table<SyncQueueItem, number>
  audit_log!: Table<AuditLogEntry, string>

  constructor() {
    super('LaboraAI')
    this.version(1).stores({
      labs: 'id, name, mlscn_no, is_active',
      lab_staff: 'id, user_id, lab_id, role, is_active',
      patients: 'id, lapid, phone, consent, created_at, updated_at',
      patient_visits: 'id, lapid, lab_id, visited_at',
      samples: 'id, sample_id, lapid, lab_id, status, collected_at, is_stat',
      sample_events: 'id, sample_id, created_at',
      results: 'id, sample_id, lapid, lab_id, status, approved_at',
      result_amendments: 'id, result_id, amended_at',
      invoices: 'id, invoice_id, lapid, lab_id, status, created_at',
      payments: 'id, invoice_id, lab_id, created_at',
      inventory: 'id, lab_id, item_name, is_active',
      inventory_events: 'id, item_id, lab_id, created_at',
      notifications: 'id, lapid, result_id, lab_id, status, created_at',
      syncQueue: '++id, table, operation, recordId, timestamp, attempts',
      audit_log: 'id, lab_id, user_id, action, created_at'
    })

    this.version(2).stores({
      labs: 'id, name, mlscn_no, is_active',
      lab_staff: 'id, user_id, lab_id, role, is_active',
      patients: 'id, lapid, phone, consent, created_at, updated_at',
      patient_visits: 'id, lapid, lab_id, visited_at',
      price_list: 'id, lab_id, test_code, test_name, category, is_active',
      samples: 'id, sample_id, lapid, lab_id, status, collected_at, is_stat',
      sample_events: 'id, sample_id, created_at',
      results: 'id, sample_id, lapid, lab_id, status, approved_at',
      result_amendments: 'id, result_id, amended_at',
      invoices: 'id, invoice_id, lapid, lab_id, status, created_at',
      payments: 'id, invoice_id, lab_id, created_at',
      inventory: 'id, lab_id, item_name, is_active',
      inventory_events: 'id, item_id, lab_id, created_at',
      notifications: 'id, lapid, result_id, lab_id, status, created_at',
      syncQueue: '++id, table, operation, recordId, timestamp, attempts',
      audit_log: 'id, lab_id, user_id, action, created_at'
    })
  }
}

export const db = new LaboraDatabase()
