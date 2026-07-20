import React from 'react'
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../theme'
import { Caption, DotGrid, Scene } from '../components/ui'

const PAINS = [
  { t: 'Results get lost', s: 'Paper files, personal WhatsApp, no trail.', color: C.red, tint: C.redTint },
  { t: 'No reconciliation', s: 'Cash, POS and transfers never add up.', color: C.amber, tint: C.amberTint },
  { t: 'Patients wait & call back', s: 'No status, no self-service, more calls.', color: C.sky, tint: C.skyTint }
]

export const Problem: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <Scene durationInFrames={dur}>
      <DotGrid opacity={0.4} />
      <AbsoluteFill style={{ padding: '90px 120px', justifyContent: 'center', gap: 60 }}>
        <Caption
          kicker="The problem"
          title={<>Independent Nigerian labs run on <span style={{ color: C.red }}>paper, WhatsApp&nbsp;&amp;&nbsp;cash</span>.</>}
          align="left"
        />
        <div style={{ display: 'flex', gap: 28 }}>
          {PAINS.map((p, i) => {
            const s = spring({ frame: frame - 34 - i * 10, fps, config: { damping: 15 } })
            return (
              <div
                key={p.t}
                style={{
                  flex: 1,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderTop: `4px solid ${p.color}`,
                  borderRadius: 16,
                  padding: '26px 28px',
                  boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
                  opacity: s,
                  transform: `translateY(${(1 - s) * 30}px)`
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: p.tint, marginBottom: 16 }} />
                <div style={{ fontSize: 30, fontWeight: 800, color: C.ink, letterSpacing: -0.5 }}>{p.t}</div>
                <div style={{ fontSize: 21, color: C.slate, marginTop: 8, lineHeight: 1.4 }}>{p.s}</div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
    </Scene>
  )
}
