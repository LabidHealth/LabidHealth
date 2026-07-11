import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateLocalLabid } from './labid'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    patients: {
      toArray: vi.fn()
    }
  }
}))

const mockedDb = db as unknown as { patients: { toArray: ReturnType<typeof vi.fn> } }

describe('generateLocalLabid', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns LB-YYYY-00001 when empty', async () => {
    mockedDb.patients.toArray.mockResolvedValueOnce([])
    await expect(generateLocalLabid(new Date('2026-04-15T12:00:00Z'))).resolves.toBe('LB-2026-00001')
  })

  it('increments based on existing LABIDs for the year', async () => {
    mockedDb.patients.toArray.mockResolvedValueOnce([
      { labid: 'LB-2026-00001' },
      { labid: 'LB-2026-00002' },
      { labid: 'LB-2025-00123' }
    ])
    await expect(generateLocalLabid(new Date('2026-04-15T12:00:00Z'))).resolves.toBe('LB-2026-00003')
  })

  it('fills the first gap in the sequence', async () => {
    mockedDb.patients.toArray.mockResolvedValueOnce([
      { labid: 'LB-2026-00001' },
      { labid: 'LB-2026-00003' }
    ])
    await expect(generateLocalLabid(new Date('2026-04-15T12:00:00Z'))).resolves.toBe('LB-2026-00002')
  })
})

