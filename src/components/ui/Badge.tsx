import React from 'react'

type BadgeStatus =
  | 'ACTIVE'
  | 'SYNCED'
  | 'READY'
  | 'DELIVERED'
  | 'PAID'
  | 'PROCESSING'
  | 'SCHEDULED'
  | 'RECEIVED'
  | 'AWAITING APPROVAL'
  | 'PARTIAL'
  | 'STAT'
  | 'OFFLINE'
  | 'CRITICAL'
  | 'UNPAID'
  | 'EXPIRED'
  | 'LOW STOCK'
  | 'SUCCESS'
  | 'WARNING'
  | 'INFO'

interface BadgeProps {
  status: BadgeStatus | Lowercase<BadgeStatus>
  children?: React.ReactNode
  style?: React.CSSProperties
}

// Labid palette (design-tokens.md). Green = success/money, blue = ready/action,
// sky = sample/info, amber = pending/offline, red = critical, slate = neutral.
const TONE = {
  green: { color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  blue: { color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  sky: { color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)' },
  amber: { color: '#B45309', bg: 'rgba(245,158,11,0.14)' },
  red: { color: '#DC2626', bg: 'rgba(239,68,68,0.12)' },
  slate: { color: '#64748B', bg: 'rgba(100,116,139,0.12)' }
} as const

const statusConfig: Record<BadgeStatus, { color: string; bg: string }> = {
  ACTIVE: TONE.green,
  SYNCED: TONE.green,
  READY: TONE.blue,
  DELIVERED: TONE.green,
  PAID: TONE.green,
  PROCESSING: TONE.sky,
  SCHEDULED: TONE.slate,
  RECEIVED: TONE.sky,
  'AWAITING APPROVAL': TONE.amber,
  PARTIAL: TONE.amber,
  STAT: TONE.amber,
  OFFLINE: TONE.amber,
  CRITICAL: TONE.red,
  UNPAID: TONE.red,
  EXPIRED: TONE.red,
  'LOW STOCK': TONE.amber,
  SUCCESS: TONE.green,
  WARNING: TONE.amber,
  INFO: TONE.sky
}

export function Badge({ status, children, style }: BadgeProps) {
  const normalizedStatus = status.replace(/_/g, ' ').toUpperCase() as BadgeStatus
  const config = statusConfig[normalizedStatus] ?? statusConfig.INFO
  return (
    <span className="badge" style={{ color: config.color, background: config.bg, ...style }}>
      {children ?? normalizedStatus}
    </span>
  )
}
