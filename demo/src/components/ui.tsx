import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, FONT } from '../theme'

// ── Scene wrapper: soft background + cross-dissolve in/out ──────────────────
export const Scene: React.FC<{
  children: React.ReactNode
  bg?: string
  durationInFrames: number
}> = ({ children, bg = C.pageBg, durationInFrames }) => {
  const frame = useCurrentFrame()
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp'
  })
  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONT, opacity: Math.min(fadeIn, fadeOut) }}>
      {children}
    </AbsoluteFill>
  )
}

// Subtle dotted grid backdrop for "tech" scenes.
export const DotGrid: React.FC<{ color?: string; opacity?: number }> = ({
  color = '#CBD5E1',
  opacity = 0.5
}) => (
  <AbsoluteFill
    style={{
      opacity,
      backgroundImage: `radial-gradient(${color} 1.5px, transparent 1.5px)`,
      backgroundSize: '38px 38px'
    }}
  />
)

// ── Kinetic caption block: kicker + title + subtitle rising into place ──────
export const Caption: React.FC<{
  kicker?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  align?: 'center' | 'left'
  delay?: number
  color?: string
}> = ({ kicker, title, subtitle, align = 'center', delay = 0, color = C.ink }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const rise = (d: number) => {
    const s = spring({ frame: frame - delay - d, fps, config: { damping: 16, mass: 0.7 } })
    return { opacity: s, transform: `translateY(${(1 - s) * 26}px)` }
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        textAlign: align,
        gap: 14
      }}
    >
      {kicker ? (
        <div
          style={{
            ...rise(0),
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: C.blue,
            background: C.blueTint,
            padding: '8px 16px',
            borderRadius: 999
          }}
        >
          {kicker}
        </div>
      ) : null}
      <div style={{ ...rise(4), fontSize: 62, fontWeight: 800, lineHeight: 1.06, color, letterSpacing: -1.5, maxWidth: 1200 }}>
        {title}
      </div>
      {subtitle ? (
        <div style={{ ...rise(9), fontSize: 30, fontWeight: 500, color: C.slate, lineHeight: 1.4, maxWidth: 1000 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  )
}

// ── Browser-chrome frame around a product screenshot ───────────────────────
export const Screen: React.FC<{
  src: string
  width: number
  label?: string
  style?: React.CSSProperties
}> = ({ src, width, label, style }) => (
  <div
    style={{
      width,
      background: C.surface,
      borderRadius: 16,
      overflow: 'hidden',
      border: `1px solid ${C.border}`,
      boxShadow: '0 40px 80px rgba(15,23,42,0.28)',
      ...style
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ width: 12, height: 12, borderRadius: 99, background: '#E2554D' }} />
      <span style={{ width: 12, height: 12, borderRadius: 99, background: '#E8B23A' }} />
      <span style={{ width: 12, height: 12, borderRadius: 99, background: '#3FB950' }} />
      {label ? <span style={{ marginLeft: 12, fontSize: 15, color: C.muted, fontWeight: 600 }}>{label}</span> : null}
    </div>
    <img src={src} style={{ display: 'block', width: '100%' }} />
  </div>
)

// ── Phone frame (owner + patient views) ────────────────────────────────────
export const Phone: React.FC<{ src: string; height: number; style?: React.CSSProperties }> = ({
  src,
  height,
  style
}) => (
  <div
    style={{
      height,
      background: C.navy,
      borderRadius: 44,
      padding: 12,
      boxShadow: '0 40px 80px rgba(15,23,42,0.35)',
      ...style
    }}
  >
    <img src={src} style={{ display: 'block', height: '100%', borderRadius: 32 }} />
  </div>
)
