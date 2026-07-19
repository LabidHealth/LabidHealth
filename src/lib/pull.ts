import { hasBackend, supabase } from './supabase'
import {
  catalogParamRepo,
  catalogTestRepo,
  invoiceRepo,
  labRepo,
  notificationRepo,
  patientRepo,
  resultRepo,
  sampleRepo,
  staffRepo,
  visitRepo
} from './repositories'
import type {
  CatalogParameter,
  CatalogTest,
  Invoice,
  Lab,
  LabStaff,
  Notification,
  Patient,
  PatientVisit,
  Result,
  Sample
} from '@/types'

/**
 * The single server → local-cache boundary. Writes go out through
 * repositories/writeRecord; server reads come back in through here.
 *
 * Three things are centralised here on purpose:
 *
 * 1. No select carries a lab_id filter. RLS scopes every row to the caller's
 *    own lab, so the database — not the client — decides what is visible.
 *
 * 2. PostgREST types CHECK-constrained columns as plain `string` and jsonb as
 *    `Json`, which do not narrow to the domain unions (UserRole, gender,
 *    ResultParameter…). The database enforces those same unions with CHECK
 *    constraints, so the narrowing below is sound — and this is the only place
 *    allowed to assert it. If the schema and the domain types ever drift apart,
 *    it should break here rather than in fifteen pages.
 *
 * 3. Nothing here throws. These calls only warm the cache; every screen renders
 *    from Dexie, so a failed pull must degrade to "stale but working" rather
 *    than blanking a screen a lab is trying to work from.
 */

type ServerRows = PromiseLike<{ data: unknown; error: unknown }>

async function cache<T>(table: string, query: ServerRows, put: (rows: T[]) => Promise<void>): Promise<void> {
  if (!hasBackend || !navigator.onLine) return
  try {
    const { data, error } = await query
    if (error) throw error
    if (Array.isArray(data) && data.length > 0) await put(data as T[])
  } catch (error) {
    console.warn(`[pull] ${table} failed — falling back to local data`, error)
  }
}

export const pull = {
  patients: () =>
    cache<Patient>('patients', supabase.from('patients').select('*'), (rows) => patientRepo.bulkPut(rows)),

  visits: () =>
    cache<PatientVisit>('patient_visits', supabase.from('patient_visits').select('*'), (rows) => visitRepo.bulkPut(rows)),

  samples: () =>
    cache<Sample>('samples', supabase.from('samples').select('*'), (rows) => sampleRepo.bulkPut(rows)),

  results: (limit = 200) =>
    cache<Result>(
      'results',
      supabase.from('results').select('*').order('created_at', { ascending: false }).limit(limit),
      (rows) => resultRepo.bulkPut(rows)
    ),

  invoices: (limit = 200) =>
    cache<Invoice>(
      'invoices',
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(limit),
      (rows) => invoiceRepo.bulkPut(rows)
    ),

  notifications: () =>
    cache<Notification>('notifications', supabase.from('notifications').select('*'), (rows) =>
      notificationRepo.bulkPut(rows)
    ),

  labs: () => cache<Lab>('labs', supabase.from('labs').select('*').limit(1), (rows) => labRepo.bulkPut(rows)),

  // Mirrors every staff row, active or not; screens filter on is_active locally.
  staff: () => cache<LabStaff>('lab_staff', supabase.from('lab_staff').select('*'), (rows) => staffRepo.bulkPut(rows)),

  // The test catalog + reference ranges. In dev mode this is seeded locally; in
  // backend mode it only exists on the server, so result entry/approval/detail
  // depend on this pull to render parameters and reference ranges.
  catalog: async () => {
    await cache<CatalogTest>('catalog_tests', supabase.from('catalog_tests').select('*'), (rows) =>
      catalogTestRepo.bulkPut(rows)
    )
    await cache<CatalogParameter>('catalog_parameters', supabase.from('catalog_parameters').select('*'), (rows) =>
      catalogParamRepo.bulkPut(rows)
    )
  }
}

/** Warm every table the dashboard aggregates over. */
export async function pullDashboard(): Promise<void> {
  await Promise.all([
    pull.samples(),
    pull.results(),
    pull.invoices(),
    pull.notifications(),
    pull.patients(),
    pull.visits(),
    pull.staff()
  ])
}
