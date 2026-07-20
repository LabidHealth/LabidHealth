import React from 'react'
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../theme'
import { Caption, DotGrid, Scene } from '../components/ui'

const ITEMS = [
  'NDPA consent, captured & revocable',
  'Non-diagnostic AI, disclaimer always shown',
  'MLSCN & RA numbers on every PDF',
  'Secure tokenised result links',
  'PII-safe analytics',
  'Works fully offline'
]

export const Trust: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <Scene durationInFrames={dur} bg={C.navy}>
      <DotGrid color="#1E293B" opacity={0.7} />
      <AbsoluteFill style={{ padding: '0 130px', justifyContent: 'center', gap: 54 }}>
        <Caption
          kicker="Trust & compliance"
          title={<span style={{ color: '#fff' }}>Built for Nigerian labs — and <span style={{ color: C.green }}>NDPA</span>.</span>}
          align="left"
          color="#fff"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {ITEMS.map((it, i) => {
            const s = spring({ frame: frame - 30 - i * 8, fps, config: { damping: 16 } })
            return (
              <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderRadius: 14, background: C.navy2, border: '1px solid #23324A', opacity: s, transform: `translateY(${(1 - s) * 20}px)` }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: C.green, color: C.navy, display: 'grid', placeItems: 'center', fontWeight: 800, flex: 'none' }}>✓</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#E8EDF6' }}>{it}</div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
    </Scene>
  )
}
