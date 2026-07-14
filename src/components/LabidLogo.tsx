import React from 'react'

/**
 * The Labid Health mark (connected-node "L", blue → green) from the brand
 * asset. Served from /public/labid-mark.png.
 */
export function LabidLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/labid-mark.png"
      width={size}
      height={size}
      alt="Labid Health"
      className={className}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}
