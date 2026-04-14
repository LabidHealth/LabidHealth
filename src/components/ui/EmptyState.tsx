import React, { type ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  headline: string
  description?: string
  cta?: ReactNode
}

export function EmptyState({ icon, headline, description, cta }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <p className="empty-state__headline">{headline}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {cta && <div className="empty-state__cta">{cta}</div>}
    </div>
  )
}
