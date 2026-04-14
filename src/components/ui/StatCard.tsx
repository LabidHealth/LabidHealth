import React from 'react'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  status?: 'warning' | 'danger'
}

export function StatCard({ label, value, sub, trend, status }: StatCardProps) {
  return (
    <div className={`stat-card${status ? ` stat-card--${status}` : ''}`}>
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {sub && <p className="stat-card__sub">{sub}</p>}
      {trend && <span className={`stat-trend stat-trend--${trend}`} />}
    </div>
  )
}
