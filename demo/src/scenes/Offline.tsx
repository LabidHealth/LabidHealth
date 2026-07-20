import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, MONO } from '../theme'
import { Caption, DotGrid, Scene } from '../components/ui'

const OUTBOX = ['Patient LB-2026-00412', 'Payment ₦4,000 · POS', 'Result · FBC', 'Delivery · WhatsApp']

export const Offline: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // Goes offline ~frame 60, comes back ~150; items flush after reconnect.
  const online = frame < 60 || frame > 150
  const toggle = spring({ frame: frame - (online ? 150 : 60), fps, config: { damping: 200 } })
  const flushed = (i: number) => frame > 160 + i * 12

  return (
    <Scene durationInFrames={dur}>
      <DotGrid opacity={0.4} />
      <AbsoluteFill style={{ padding: '0 120px', flexDirection: 'row', alignItems: 'center', gap: 80 }}>
        <div style={{ flex: 1 }}>
          <Caption
            kicker="Offline-first"
            title={<>Works with <span style={{ color: C.amber }}>zero internet</span>.<br />Never loses a write.</>}
            subtitle="Every action saves locally and syncs the moment you reconnect — the outbox never drops."
            align="left"
          />
        </div>
        <div style={{ width: 560, background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: '0 30px 60px rgba(15,23,42,0.12)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: online ? C.green : C.amber, transform: `scale(${1 + toggle * 0})` }} />
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: online ? C.green600 : '#B45309' }}>
              {online ? 'SYNCED' : 'OFFLINE — QUEUEING'}
            </span>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {OUTBOX.map((item, i) => {
              const done = online && flushed(i)
              const appear = interpolate(frame, [70 + i * 10, 82 + i * 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              return (
                <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: done ? C.greenTint : C.surfaceAlt, opacity: appear, border: `1px solid ${done ? '#C7EFDF' : C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 18, color: C.ink }}>{item}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: done ? C.green600 : '#B45309' }}>{done ? '✓ synced' : 'pending'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  )
}
