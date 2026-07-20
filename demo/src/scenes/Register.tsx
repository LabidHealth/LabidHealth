import React from 'react'
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, MONO } from '../theme'
import { Caption, Scene } from '../components/ui'

const FIELDS = [
  ['Full name', 'Adaeze Okoro'],
  ['Phone', '+234 803 000 1111'],
  ['Gender · DOB', 'Female · 1991']
]

export const Register: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const card = spring({ frame: frame - 24, fps, config: { damping: 16 } })
  const chip = spring({ frame: frame - 150, fps, config: { damping: 12 } })
  const consent = spring({ frame: frame - 120, fps, config: { damping: 14 } })

  return (
    <Scene durationInFrames={dur}>
      <AbsoluteFill style={{ padding: '0 120px', flexDirection: 'row', alignItems: 'center', gap: 80 }}>
        <div style={{ flex: 1 }}>
          <Caption
            kicker="Front desk"
            title={<>Register a patient in <span style={{ color: C.blue }}>seconds</span>.</>}
            subtitle="A LABID is issued instantly — even offline — and NDPA consent is captured up front."
            align="left"
          />
        </div>
        <div style={{ width: 620, background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: '0 30px 60px rgba(15,23,42,0.14)', padding: 30, opacity: card, transform: `translateY(${(1 - card) * 30}px)` }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginBottom: 20 }}>New patient</div>
          {FIELDS.map(([label, val]) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.slate, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 20, color: C.ink, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 14px' }}>{val}</div>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, opacity: consent }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: C.green, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>✓</div>
            <div style={{ fontSize: 17, color: C.slate }}>NDPA consent — store &amp; share across Labid labs I visit</div>
          </div>
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderRadius: 12, background: C.blueTint, opacity: chip, transform: `scale(${0.9 + chip * 0.1})` }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.slate }}>LABID ISSUED</span>
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.blue600, letterSpacing: -0.5 }}>LB-2026-00412</span>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  )
}
