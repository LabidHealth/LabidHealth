import React from 'react'
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, MONO } from '../theme'
import { Caption, Scene } from '../components/ui'

const SHAPES = ['Numeric', 'Panel', 'Qualitative', 'Descriptive', 'Narrative']
const ROWS: { n: string; v: string; ref: string; flag?: 'hi' | 'lo' }[] = [
  { n: 'Haemoglobin', v: '9.8 g/dl', ref: '12–15', flag: 'lo' },
  { n: 'PCV', v: '31 %', ref: '36–45', flag: 'lo' },
  { n: 'WBC', v: '14.2 ×10⁹', ref: '4–11', flag: 'hi' },
  { n: 'Platelets', v: '240', ref: '150–400' }
]

export const Catalog: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const panel = spring({ frame: frame - 40, fps, config: { damping: 16 } })
  const crit = spring({ frame: frame - 210, fps, config: { damping: 14 } })

  return (
    <Scene durationInFrames={dur}>
      <AbsoluteFill style={{ padding: '70px 120px', justifyContent: 'center', gap: 44 }}>
        <Caption
          kicker="Lab-configurable catalog"
          title={<>Every test shape, with <span style={{ color: C.red }}>live range flags</span>.</>}
          align="left"
        />
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: '0 0 360px' }}>
            {SHAPES.map((sh, i) => {
              const s = spring({ frame: frame - 30 - i * 8, fps, config: { damping: 15 } })
              return (
                <div key={sh} style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: s, transform: `translateX(${(1 - s) * -24}px)` }}>
                  <div style={{ width: 14, height: 14, borderRadius: 5, background: [C.blue, C.sky, C.amber, C.green, C.slate][i] }} />
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>{sh}</div>
                </div>
              )
            })}
          </div>
          <div style={{ flex: 1, background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`, boxShadow: '0 24px 50px rgba(15,23,42,0.12)', overflow: 'hidden', opacity: panel, transform: `translateY(${(1 - panel) * 26}px)` }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, fontSize: 22, fontWeight: 800, color: C.ink }}>
              Full Blood Count <span style={{ fontFamily: MONO, fontSize: 16, color: C.blue600, fontWeight: 600 }}>· panel</span>
            </div>
            {ROWS.map((r) => (
              <div key={r.n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 21, color: C.slate }}>{r.n} <span style={{ fontSize: 15, color: C.muted }}>· {r.ref}</span></span>
                <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: C.ink }}>
                  {r.flag ? (
                    <span style={{ padding: '4px 12px', borderRadius: 8, color: r.flag === 'hi' ? '#C0392B' : '#B45309', background: r.flag === 'hi' ? C.redTint : C.amberTint }}>
                      {r.v} {r.flag === 'hi' ? '↑' : '↓'}
                    </span>
                  ) : r.v}
                </span>
              </div>
            ))}
            <div style={{ margin: 18, padding: '14px 18px', borderRadius: 10, background: C.redTint, border: '1px solid #F6CCCC', color: '#B02A2A', fontSize: 18, fontWeight: 600, opacity: crit }}>
              ⚠ Critical: WBC 14.2 — acknowledge before this result can be sent.
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  )
}
