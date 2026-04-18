import React from 'react'

export function ModulePlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="module-placeholder">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}
