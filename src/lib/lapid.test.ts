import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateLocalLapid } from './lapid'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  db: {
    patients: {
      toArray: vi.fn()
    }
  }
}))

const mockedDb = db as unknown as { patients: { toArray: ReturnType<typeof vi.fn> } }

describe('generateLocalLapid', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns LA-YYYY-00001 when empty', async () => {
    mockedDb.patients.toArray.mockResolvedValueOnce([])
    await expect(generateLocalLapid(new Date('2026-04-15T12:00:00Z'))).resolves.toBe('LA-2026-00001')
  })

  it('increments based on existing LAPIDs for the year', async () => {
    mockedDb.patients.toArray.mockResolvedValueOnce([
      { lapid: 'LA-2026-00001' },
      { lapid: 'LA-2026-00002' },
      { lapid: 'LA-2025-00123' }
    ])
    await expect(generateLocalLapid(new Date('2026-04-15T12:00:00Z'))).resolves.toBe('LA-2026-00003')
  })

  it('fills the first gap in the sequence', async () => {
    mockedDb.patients.toArray.mockResolvedValueOnce([
      { lapid: 'LA-2026-00001' },
      { lapid: 'LA-2026-00003' }
    ])
    await expect(generateLocalLapid(new Date('2026-04-15T12:00:00Z'))).resolves.toBe('LA-2026-00002')
  })
})

