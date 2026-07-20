import React from 'react'
import { AbsoluteFill, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../theme'
import { Screen, Scene } from '../components/ui'

const VIEWS = [
  { src: 'owner.png', label: 'Owner', sub: 'Collected today · undelivered · reconciliation', c: C.green },
  { src: 'frontdesk.png', label: 'Front desk', sub: 'Live queue · balances · one-tap actions', c: C.blue },
  { src: 'scientist.png', label: 'Scientist', sub: 'STAT-pinned worklist · turnaround clock', c: C.amber }
]

const HoldCard: React.FC<{ src: string; label: string; sub: string; c: string }> = ({ src, label, sub, c }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame, fps, config: { damping: 18 } })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 150, opacity: s, transform: `translateY(${(1 - s) * 26}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ width: 15, height: 15, borderRadius: 5, background: c }} />
        <div style={{ fontSize: 38, fontWeight: 800, color: C.ink, letterSpacing: -1 }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, color: C.slate, marginBottom: 22 }}>{sub}</div>
      <Screen src={staticFile(src)} width={980} label="app.labidhealth.com" />
    </AbsoluteFill>
  )
}

export const Dashboards: React.FC<{ dur: number }> = ({ dur }) => {
  const each = Math.floor((dur - 20) / VIEWS.length)
  return (
    <Scene durationInFrames={dur}>
      <AbsoluteFill style={{ paddingTop: 54, alignItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.blue, background: C.blueTint, padding: '8px 18px', borderRadius: 999 }}>
          A view for every role
        </div>
      </AbsoluteFill>
      {VIEWS.map((v, i) => (
        <Sequence key={v.src} from={i * each} durationInFrames={each + 20} layout="none">
          <HoldCard {...v} />
        </Sequence>
      ))}
    </Scene>
  )
}
