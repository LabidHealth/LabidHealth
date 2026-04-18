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

const statusConfig: Record<BadgeStatus, { color: string; bg: string }> = {
  ACTIVE: { color: '#00E5A0', bg: 'rgba(0,229,160,0.12)' },
  SYNCED: { color: '#00E5A0', bg: 'rgba(0,229,160,0.12)' },
  READY: { color: '#00E5A0', bg: 'rgba(0,229,160,0.12)' },
  DELIVERED: { color: '#00E5A0', bg: 'rgba(0,229,160,0.12)' },
  PAID: { color: '#00E5A0', bg: 'rgba(0,229,160,0.12)' },
  PROCESSING: { color: '#3B8BD4', bg: 'rgba(59,139,212,0.12)' },
  SCHEDULED: { color: '#A0A0A0', bg: 'rgba(160,160,160,0.12)' },
  RECEIVED: { color: '#A0A0A0', bg: 'rgba(160,160,160,0.12)' },
  'AWAITING APPROVAL': { color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  PARTIAL: { color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  STAT: { color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  OFFLINE: { color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  CRITICAL: { color: '#FF4D4D', bg: 'rgba(255,77,77,0.12)' },
  UNPAID: { color: '#FF4D4D', bg: 'rgba(255,77,77,0.12)' },
  EXPIRED: { color: '#FF4D4D', bg: 'rgba(255,77,77,0.12)' },
  'LOW STOCK': { color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  SUCCESS: { color: '#00E5A0', bg: 'rgba(0,229,160,0.12)' },
  WARNING: { color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  INFO: { color: '#3B8BD4', bg: 'rgba(59,139,212,0.12)' }
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
