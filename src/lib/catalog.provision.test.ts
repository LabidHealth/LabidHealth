import { describe, expect, it, vi } from 'vitest'

// catalog.ts imports the repository layer, which transitively constructs the
// SyncEngine (touching IndexedDB at module load). These tests only exercise the
// pure builders, so stub the engine out.
vi.mock('./sync', () => ({ syncEngine: { push: () => {}, subscribe: () => () => {} } }))

import { buildCatalogTests, buildPriceList } from './catalog'

const LAB = 'lab-under-test'
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

describe('buildCatalogTests', () => {
  const { tests, params } = buildCatalogTests(LAB)

  it('builds the full KEMI catalog: 17 tests, 58 parameters', () => {
    expect(tests).toHaveLength(17)
    expect(params).toHaveLength(58)
  })

  it('scopes every test to the lab and gives each a UUID id', () => {
    for (const t of tests) {
      expect(t.lab_id).toBe(LAB)
      expect(isUuid(t.id)).toBe(true)
      expect(['numeric', 'panel', 'qualitative', 'descriptive', 'narrative']).toContain(t.result_type)
    }
  })

  it('links every parameter to one of the built tests (FK integrity)', () => {
    const testIds = new Set(tests.map((t) => t.id))
    for (const p of params) {
      expect(testIds.has(p.test_id)).toBe(true)
      expect(isUuid(p.id)).toBe(true)
    }
  })

  it('sets ref_operator only where a range/operator exists', () => {
    const byTest = (code: string) => {
      const t = tests.find((x) => x.code === code)!
      return params.filter((p) => p.test_id === t.id)
    }
    // panel with ranges -> between
    expect(byTest('FBC').every((p) => p.ref_operator === 'between')).toBe(true)
    // lipid uses lt/gt operators
    const lipid = Object.fromEntries(byTest('LIPID').map((p) => [p.key, p.ref_operator]))
    expect(lipid).toMatchObject({ chol: 'lt', hdl: 'gt', ldl: 'lt', trig: 'lt' })
    // descriptive -> no operator, no options
    expect(byTest('URINAL').every((p) => p.ref_operator === null && p.qualitative_options === null)).toBe(true)
  })

  it('carries qualitative option lists and critical flags', () => {
    const hb = params.find((p) => p.key === 'hb')!
    expect(hb.ref_low).toBe(12)
    expect(hb.ref_high).toBe(16)
    expect(hb.critical_low).toBe(6)
    expect(hb.critical_high).toBe(20)

    const hiv = params.find((p) => p.key === 'hiv')!
    expect(hiv.qualitative_options).toEqual(['Non-reactive', 'Reactive'])

    const withOptions = params.filter((p) => p.qualitative_options !== null)
    expect(withOptions).toHaveLength(11)
  })

  it('gives each test fresh ids on every call (no cross-lab id reuse)', () => {
    const again = buildCatalogTests('other-lab')
    const overlap = tests.map((t) => t.id).filter((id) => again.tests.some((t) => t.id === id))
    expect(overlap).toHaveLength(0)
  })
})

describe('buildPriceList', () => {
  const prices = buildPriceList(LAB)

  it('builds 24 priced items scoped to the lab', () => {
    expect(prices).toHaveLength(24)
    for (const p of prices) {
      expect(p.lab_id).toBe(LAB)
      expect(isUuid(p.id)).toBe(true)
      expect(p.is_active).toBe(true)
    }
  })

  it('discounts HMO to 80% and corporate to 90% of standard', () => {
    const fbc = prices.find((p) => p.test_code === 'FBC')!
    expect(fbc.standard_price).toBe(350000)
    expect(fbc.hmo_price).toBe(280000)
    expect(fbc.corporate_price).toBe(315000)
  })
})
