import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../theme'
import { Caption, Scene } from '../components/ui'

const STEPS = [
  { t: 'Register', c: C.blue },
  { t: 'Sample', c: C.sky },
  { t: 'Result', c: C.amber },
  { t: 'Deliver', c: C.green },
  { t: 'Get paid', c: C.green600 }
]

export const Pipeline: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const lineGrow = interpolate(frame, [40, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <Scene durationInFrames={dur}>
      <AbsoluteFill style={{ padding: '0 120px', justifyContent: 'center', gap: 90 }}>
        <div style={{ textAlign: 'center' }}>
          <Caption
            kicker="One system, end to end"
            title={<>The whole lab, on one <span style={{ color: C.blue }}>offline-first</span> platform.</>}
          />
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
          <div style={{ position: 'absolute', left: 90, right: 90, top: '50%', height: 4, background: C.border, borderRadius: 4 }} />
          <div
            style={{
              position: 'absolute',
              left: 90,
              top: '50%',
              height: 4,
              width: `calc((100% - 180px) * ${lineGrow})`,
              background: `linear-gradient(90deg, ${C.blue}, ${C.green})`,
              borderRadius: 4
            }}
          />
          {STEPS.map((step, i) => {
            const s = spring({ frame: frame - 44 - i * 16, fps, config: { damping: 13 } })
            return (
              <div key={step.t} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: s, transform: `scale(${0.6 + s * 0.4})` }}>
                <div style={{ width: 92, height: 92, borderRadius: '50%', background: C.surface, border: `4px solid ${step.c}`, display: 'grid', placeItems: 'center', boxShadow: '0 12px 30px rgba(15,23,42,0.12)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: step.c }} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>{step.t}</div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
    </Scene>
  )
}
