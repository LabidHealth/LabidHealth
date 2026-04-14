import { describe, expect, it, vi } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatInvoiceID,
  formatLAPID,
  formatNaira,
  formatPhone,
  formatSampleID,
  formatTimeAgo
} from './formatters'

describe('formatters', () => {
  it('formats naira values with kobo input', () => {
    expect(formatNaira(350_000)).toBe('₦3,500')
    expect(formatNaira(35_000_000)).toBe('₦350,000')
    expect(formatNaira(1_820_000_00)).toBe('₦1.82M')
  })

  it('formats LAPID correctly', () => {
    expect(formatLAPID('la202500847')).toBe('LA-2025-00847')
    expect(formatLAPID('LA-2024-1')).toBe('LA-2024-00001')
  })

  it('formats Nigerian phone numbers', () => {
    expect(formatPhone('08031234567')).toBe('+234 803 123 4567')
    expect(formatPhone('+2348031234567')).toBe('+234 803 123 4567')
  })

  it('formats dates and times', () => {
    const sample = new Date('2025-10-24T09:12:00Z')
    expect(formatDate(sample)).toBe('24 Oct 2025')
    expect(formatDateTime(sample)).toContain('24 Oct 2025')
  })

  it('formats time ago string', () => {
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    expect(formatTimeAgo(thirtyMinutesAgo)).toContain('min')
  })

  it('formats sample and invoice ids', () => {
    expect(formatSampleID('LB9821')).toBe('#LB-9821')
    expect(formatInvoiceID('9021')).toBe('#INV-9021')
  })
})
