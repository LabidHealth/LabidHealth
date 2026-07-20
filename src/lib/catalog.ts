import { db } from './db'
import { catalogParamRepo, catalogTestRepo, priceRepo } from './repositories'
import type {
  CatalogParameter,
  CatalogResultType,
  CatalogTest,
  PriceListItem,
  RefOperator,
  ResultParameterStatus
} from '@/types'

/**
 * The design-partner (KEMI) test catalog, covering all five result shapes:
 * panel, numeric, qualitative, descriptive, narrative. Ranges are placeholders
 * to confirm on-site (see docs test-catalog-seed.md).
 */
type SP = {
  key: string; name: string; unit?: string; low?: number; high?: number
  op?: RefOperator; opts?: string[]; critLow?: number; critHigh?: number
}
type ST = { code: string; name: string; category: string; specimen: string; type: CatalogResultType; params?: SP[] }

const titre = ['<1:20', '1:20', '1:40', '1:80', '1:160', '1:320']

const CATALOG: ST[] = [
  { code: 'FBC', name: 'Full Blood Count', category: 'Haematology', specimen: 'EDTA blood', type: 'panel', params: [
    { key: 'hb', name: 'Haemoglobin', unit: 'g/dl', low: 12, high: 16, critLow: 6, critHigh: 20 },
    { key: 'pcv', name: 'PCV', unit: '%', low: 36, high: 50 },
    { key: 'wbc', name: 'WBC (Total)', unit: 'x10^9/L', low: 4, high: 11, critLow: 1, critHigh: 30 },
    { key: 'neut', name: 'Neutrophils', unit: '%', low: 40, high: 75 },
    { key: 'lymph', name: 'Lymphocytes', unit: '%', low: 20, high: 45 },
    { key: 'mono', name: 'Monocytes', unit: '%', low: 2, high: 8 },
    { key: 'eos', name: 'Eosinophils', unit: '%', low: 1, high: 6 },
    { key: 'plt', name: 'Platelets', unit: 'x10^9/L', low: 150, high: 400, critLow: 50 },
    { key: 'mcv', name: 'MCV', unit: 'fL', low: 80, high: 100 },
    { key: 'mch', name: 'MCH', unit: 'pg', low: 27, high: 33 },
    { key: 'mchc', name: 'MCHC', unit: 'g/dl', low: 32, high: 36 }
  ] },
  { code: 'RFT', name: 'Electrolytes & Urea (E&U)', category: 'Biochemistry', specimen: 'Serum', type: 'panel', params: [
    { key: 'na', name: 'Sodium', unit: 'mmol/L', low: 135, high: 145, critLow: 120, critHigh: 160 },
    { key: 'k', name: 'Potassium', unit: 'mmol/L', low: 3.5, high: 5.1, critLow: 2.5, critHigh: 6.5 },
    { key: 'cl', name: 'Chloride', unit: 'mmol/L', low: 98, high: 107 },
    { key: 'hco3', name: 'Bicarbonate', unit: 'mmol/L', low: 22, high: 29 },
    { key: 'urea', name: 'Urea', unit: 'mg/dl', low: 15, high: 45 },
    { key: 'creat', name: 'Creatinine', unit: 'mg/dl', low: 0.6, high: 1.3, critHigh: 5 }
  ] },
  { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', specimen: 'Serum', type: 'panel', params: [
    { key: 'tbil', name: 'Total Bilirubin', unit: 'mg/dl', low: 0.1, high: 1.2 },
    { key: 'dbil', name: 'Direct Bilirubin', unit: 'mg/dl', low: 0, high: 0.3 },
    { key: 'alt', name: 'ALT', unit: 'U/L', low: 0, high: 45 },
    { key: 'ast', name: 'AST', unit: 'U/L', low: 0, high: 40 },
    { key: 'alp', name: 'ALP', unit: 'U/L', low: 40, high: 130 },
    { key: 'alb', name: 'Albumin', unit: 'g/dl', low: 3.5, high: 5.2 },
    { key: 'tp', name: 'Total Protein', unit: 'g/dl', low: 6.0, high: 8.3 }
  ] },
  { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', specimen: 'Serum (fasting)', type: 'panel', params: [
    { key: 'chol', name: 'Total Cholesterol', unit: 'mmol/L', op: 'lt', high: 5.2 },
    { key: 'hdl', name: 'HDL Cholesterol', unit: 'mmol/L', op: 'gt', low: 1.0 },
    { key: 'ldl', name: 'LDL Cholesterol', unit: 'mmol/L', op: 'lt', high: 3.0 },
    { key: 'trig', name: 'Triglycerides', unit: 'mmol/L', op: 'lt', high: 1.7 }
  ] },
  { code: 'FBG', name: 'Fasting Blood Glucose', category: 'Biochemistry', specimen: 'Fluoride blood', type: 'numeric', params: [
    { key: 'fbg', name: 'Fasting Blood Glucose', unit: 'mg/dl', low: 70, high: 110, critLow: 40, critHigh: 400 }
  ] },
  { code: 'HBA1C', name: 'HbA1c', category: 'Biochemistry', specimen: 'EDTA blood', type: 'numeric', params: [
    { key: 'hba1c', name: 'HbA1c', unit: '%', op: 'lt', high: 6.5, critHigh: 10 }
  ] },
  { code: 'HIV', name: 'HIV 1 & 2 Screening', category: 'Serology', specimen: 'Serum', type: 'qualitative', params: [
    { key: 'hiv', name: 'HIV 1 & 2', opts: ['Non-reactive', 'Reactive'] }
  ] },
  { code: 'HBSAG', name: 'Hepatitis B (HBsAg)', category: 'Serology', specimen: 'Serum', type: 'qualitative', params: [
    { key: 'hbsag', name: 'HBsAg', opts: ['Negative', 'Positive'] }
  ] },
  { code: 'VDRL', name: 'VDRL / Syphilis', category: 'Serology', specimen: 'Serum', type: 'qualitative', params: [
    { key: 'vdrl', name: 'VDRL', opts: ['Non-reactive', 'Reactive'] }
  ] },
  { code: 'MALRDT', name: 'Malaria RDT', category: 'Haematology', specimen: 'Whole blood', type: 'qualitative', params: [
    { key: 'mp', name: 'Malaria Parasite', opts: ['Negative', 'Positive'] }
  ] },
  { code: 'PREG', name: 'Pregnancy Test', category: 'Hormones', specimen: 'Urine', type: 'qualitative', params: [
    { key: 'hcg', name: 'Beta-HCG', opts: ['Negative', 'Positive'] }
  ] },
  { code: 'BGG', name: 'Blood Group & Genotype', category: 'Haematology', specimen: 'EDTA blood', type: 'qualitative', params: [
    { key: 'group', name: 'Blood Group', opts: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] },
    { key: 'genotype', name: 'Genotype', opts: ['AA', 'AS', 'SS', 'AC', 'SC'] }
  ] },
  { code: 'WIDAL', name: 'Widal Test', category: 'Microbiology', specimen: 'Serum', type: 'qualitative', params: [
    { key: 'to', name: 'S. Typhi O', opts: titre },
    { key: 'th', name: 'S. Typhi H', opts: titre },
    { key: 'ah', name: 'S. Paratyphi A', opts: titre },
    { key: 'bh', name: 'S. Paratyphi B', opts: titre }
  ] },
  { code: 'URINAL', name: 'Urinalysis', category: 'Urinalysis', specimen: 'Urine', type: 'descriptive', params: [
    { key: 'colour', name: 'Colour' }, { key: 'appearance', name: 'Appearance' }, { key: 'ph', name: 'pH' },
    { key: 'sg', name: 'Specific Gravity' }, { key: 'protein', name: 'Protein' }, { key: 'glucose', name: 'Glucose' },
    { key: 'ketones', name: 'Ketones' }, { key: 'blood', name: 'Blood' }, { key: 'leucocytes', name: 'Leucocytes' }, { key: 'nitrites', name: 'Nitrites' }
  ] },
  { code: 'STOOL', name: 'Stool Microscopy', category: 'Microbiology', specimen: 'Stool', type: 'descriptive', params: [
    { key: 'colour', name: 'Colour' }, { key: 'consistency', name: 'Consistency' }, { key: 'ova', name: 'Ova / Parasites' },
    { key: 'cyst', name: 'Cyst' }, { key: 'pus', name: 'Pus cells' }, { key: 'rbc', name: 'RBC' }, { key: 'occult', name: 'Occult blood' }
  ] },
  { code: 'HISTO', name: 'Histopathology', category: 'Histopathology', specimen: 'Tissue', type: 'narrative' },
  { code: 'USS', name: 'Abdominal Ultrasound', category: 'Imaging', specimen: '—', type: 'narrative' }
]

/**
 * Default price list (kobo). Includes a few codes beyond the result catalog
 * (e.g. DIFF, ESR, cultures) that are billed but entered as free-form results.
 * Confirm real prices with the lab on-site — these are starting defaults.
 */
export const DEFAULT_PRICE_LIST: Array<{ code: string; name: string; category: string; price: number }> = [
  { code: 'FBC', name: 'Full Blood Count', category: 'Haematology', price: 350000 },
  { code: 'DIFF', name: 'Differential Count', category: 'Haematology', price: 250000 },
  { code: 'ESR', name: 'ESR', category: 'Haematology', price: 150000 },
  { code: 'BGG', name: 'Blood Group & Genotype', category: 'Haematology', price: 250000 },
  { code: 'MALRDT', name: 'Malaria RDT', category: 'Haematology', price: 150000 },
  { code: 'MALMIC', name: 'Malaria Microscopy', category: 'Haematology', price: 150000 },
  { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', price: 500000 },
  { code: 'RFT', name: 'Electrolytes & Urea (E&U)', category: 'Biochemistry', price: 500000 },
  { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', price: 450000 },
  { code: 'FBG', name: 'Fasting Blood Glucose', category: 'Biochemistry', price: 120000 },
  { code: 'HBA1C', name: 'HbA1c', category: 'Biochemistry', price: 400000 },
  { code: 'CNS', name: 'Culture & Sensitivity (M/C/S)', category: 'Microbiology', price: 500000 },
  { code: 'WIDAL', name: 'Widal Test', category: 'Microbiology', price: 200000 },
  { code: 'VDRL', name: 'VDRL / Syphilis', category: 'Serology', price: 200000 },
  { code: 'HBSAG', name: 'Hepatitis B (HBsAg)', category: 'Serology', price: 200000 },
  { code: 'HIV', name: 'HIV 1 & 2 Screening', category: 'Serology', price: 200000 },
  { code: 'URINAL', name: 'Urinalysis', category: 'Urinalysis', price: 150000 },
  { code: 'URMIC', name: 'Urine Microscopy', category: 'Urinalysis', price: 150000 },
  { code: 'TSH', name: 'TSH', category: 'Hormones', price: 500000 },
  { code: 'FT3', name: 'FT3', category: 'Hormones', price: 500000 },
  { code: 'FT4', name: 'FT4', category: 'Hormones', price: 500000 },
  { code: 'PSA', name: 'PSA', category: 'Hormones', price: 500000 },
  { code: 'PREG', name: 'Pregnancy Test', category: 'Hormones', price: 150000 },
  { code: 'STOOL', name: 'Stool Microscopy', category: 'Other', price: 150000 }
]

/** Builds catalog test + parameter rows (fresh UUIDs) for a lab from the CATALOG. */
export function buildCatalogTests(labId: string): { tests: CatalogTest[]; params: CatalogParameter[] } {
  const tests: CatalogTest[] = []
  const params: CatalogParameter[] = []
  for (const t of CATALOG) {
    const testId = crypto.randomUUID()
    tests.push({ id: testId, lab_id: labId, code: t.code, name: t.name, category: t.category, specimen: t.specimen, result_type: t.type, active: true })
    ;(t.params ?? []).forEach((p, i) => {
      params.push({
        id: crypto.randomUUID(), test_id: testId, key: p.key, name: p.name, unit: p.unit ?? null,
        ref_low: p.low ?? null, ref_high: p.high ?? null,
        ref_operator: p.op ?? (p.low != null || p.high != null ? 'between' : null),
        qualitative_options: p.opts ?? null, sex: null,
        critical_low: p.critLow ?? null, critical_high: p.critHigh ?? null, sort: i
      })
    })
  }
  return { tests, params }
}

/** Builds price-list rows (fresh UUIDs) for a lab. HMO 80% / corporate 90% of standard. */
export function buildPriceList(labId: string): PriceListItem[] {
  const now = new Date().toISOString()
  return DEFAULT_PRICE_LIST.map((t) => ({
    id: crypto.randomUUID(),
    lab_id: labId,
    test_code: t.code,
    test_name: t.name,
    category: t.category,
    standard_price: t.price,
    hmo_price: Math.round(t.price * 0.8),
    corporate_price: Math.round(t.price * 0.9),
    is_active: true,
    created_at: now,
    updated_at: now
  }))
}

/** Dev/offline seed: writes the catalog straight to Dexie (no sync). */
export async function seedCatalog(labId: string): Promise<void> {
  if ((await db.catalog_tests.count()) > 0) return
  const { tests, params } = buildCatalogTests(labId)
  await db.catalog_tests.bulkPut(tests)
  await db.catalog_parameters.bulkPut(params)
}

export interface ProvisionResult {
  skipped: boolean
  tests: number
  params: number
  prices: number
}

/**
 * Provisions the default test catalog + price list for a lab through the
 * repository layer, so the rows sync to Supabase (owner/manager RLS permits the
 * writes). Idempotent: does nothing if the lab already has catalog tests.
 * Tests are written before their parameters so the FK is satisfied on sync
 * (the outbox is FIFO).
 */
export async function provisionLabCatalog(labId: string): Promise<ProvisionResult> {
  const existing = await db.catalog_tests.where('lab_id').equals(labId).count()
  if (existing > 0) return { skipped: true, tests: 0, params: 0, prices: 0 }

  const { tests, params } = buildCatalogTests(labId)
  const prices = buildPriceList(labId)

  for (const test of tests) await catalogTestRepo.create(test)
  for (const param of params) await catalogParamRepo.create(param)
  for (const price of prices) await priceRepo.create(price)

  return { skipped: false, tests: tests.length, params: params.length, prices: prices.length }
}

/** Find a catalog test by exact name (as stored on a result) or by code. */
export async function getCatalogTest(nameOrCode: string): Promise<{ test: CatalogTest; params: CatalogParameter[] } | null> {
  // In backend mode the catalog lives only on the server; pull it once on first
  // use so result screens have parameter definitions and reference ranges.
  if ((await db.catalog_tests.count()) === 0) {
    const { pull } = await import('./pull')
    await pull.catalog()
  }
  const test =
    (await db.catalog_tests.where('name').equals(nameOrCode).first()) ??
    (await db.catalog_tests.where('code').equals(nameOrCode).first())
  if (!test) return null
  const params = (await db.catalog_parameters.where('test_id').equals(test.id).toArray()).sort((a, b) => a.sort - b.sort)
  return { test, params }
}

export function evaluateNumeric(p: CatalogParameter, value: number): ResultParameterStatus {
  if (p.critical_high != null && value > p.critical_high) return 'critical_high'
  if (p.critical_low != null && value < p.critical_low) return 'critical_low'
  const op = p.ref_operator ?? 'between'
  if (op === 'lt') return p.ref_high != null && value > p.ref_high ? 'high' : 'normal'
  if (op === 'gt') return p.ref_low != null && value < p.ref_low ? 'low' : 'normal'
  if (p.ref_high != null && value > p.ref_high) return 'high'
  if (p.ref_low != null && value < p.ref_low) return 'low'
  return 'normal'
}

const ABNORMAL = new Set(['reactive', 'positive', 'pos', 'detected', 'seen', 'ss', 'sc', '1:160', '1:320'])
const CARRIER = new Set(['as', 'ac', '+', 'trace', '1:80'])

export function evaluateQualitative(value: string): ResultParameterStatus {
  const v = value.trim().toLowerCase()
  if (!v) return 'normal'
  if (ABNORMAL.has(v) || v.includes('++')) return 'high'
  if (CARRIER.has(v) || v === '+') return 'low'
  return 'normal'
}

export function refText(p: CatalogParameter): string {
  const op = p.ref_operator ?? 'between'
  const unit = p.unit ? ` ${p.unit}` : ''
  if (op === 'lt' && p.ref_high != null) return `< ${p.ref_high}${unit}`
  if (op === 'gt' && p.ref_low != null) return `> ${p.ref_low}${unit}`
  if (p.ref_low != null && p.ref_high != null) return `${p.ref_low}–${p.ref_high}${unit}`
  return unit.trim() || '—'
}
