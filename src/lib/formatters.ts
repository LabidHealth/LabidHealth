import { format, formatDistanceToNowStrict } from 'date-fns'

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0
})

export function formatNaira(kobo: number): string {
  const naira = kobo / 100
  if (Math.abs(naira) >= 1_000_000) {
    const million = naira / 1_000_000
    const formatted = million.toFixed(2).replace(/\.00$/, '')
    return `\u20A6${formatted}M`
  }
  return nairaFormatter.format(naira)
}

export function formatLAPID(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^0-9]/g, '')
  const year = cleaned.slice(0, 4) || new Date().getFullYear().toString()
  const seq = cleaned.slice(4).padStart(5, '0').slice(0, 5)
  return `LA-${year}-${seq}`
}

export function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.startsWith('234')) digits = digits.slice(3)
  digits = digits.slice(0, 10)
  const segments = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)]
  return `+234 ${segments.filter(Boolean).join(' ')}`.trim()
}

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value
}

export function formatDate(value: string | Date): string {
  return format(toDate(value), 'dd MMM yyyy')
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), 'dd MMM yyyy, hh:mm a')
}

export function formatTimeAgo(value: string | Date): string {
  const date = toDate(value)
  const diffMs = Date.now() - date.getTime()

  if (diffMs < 60_000) {
    const seconds = Math.max(1, Math.floor(diffMs / 1000))
    return `${seconds} sec${seconds === 1 ? '' : 's'} ago`
  }

  if (diffMs < 3_600_000) {
    const minutes = Math.max(1, Math.floor(diffMs / 60_000))
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  }

  if (diffMs < 86_400_000) {
    const hours = Math.max(1, Math.floor(diffMs / 3_600_000))
    return `${hours} hr${hours === 1 ? '' : 's'} ago`
  }

  if (diffMs < 172_800_000) {
    return 'Yesterday'
  }

  return formatDistanceToNowStrict(date, { addSuffix: true })
}

export function formatSampleID(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const padded = digits.padStart(4, '0').slice(0, 4)
  return `#LB-${padded}`
}

export function formatInvoiceID(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const padded = digits.padStart(4, '0').slice(0, 4)
  return `#INV-${padded}`
}
