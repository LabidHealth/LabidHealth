import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../theme'
import { LogoMark } from '../components/LogoMark'
import { Scene } from '../components/ui'

export const Close: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const word = spring({ frame: frame - 18, fps, config: { damping: 18 } })
  const cta = interpolate(frame, [48, 70], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <Scene durationInFrames={dur} bg={C.navy}>
      <AbsoluteFill
        style={{ background: `radial-gradient(1100px 600px at 50% 45%, rgba(16,185,129,0.22), transparent 70%)` }}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 22 }}>
        <LogoMark size={120} animate delay={2} />
        <div style={{ fontSize: 72, fontWeight: 800, color: '#fff', letterSpacing: -1.5, opacity: word }}>
          Labid Health<span style={{ color: C.green }}>.</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, color: '#AEB9CC', textAlign: 'center', maxWidth: 1000, opacity: word }}>
          The Nigerian AI-powered Laboratory Operating &amp; Management System
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 24,
            fontWeight: 700,
            color: C.navy,
            background: C.green,
            padding: '14px 30px',
            borderRadius: 12,
            opacity: cta,
            transform: `translateY(${(1 - cta) * 14}px)`
          }}
        >
          Run your lab on Labid.
        </div>
      </AbsoluteFill>
    </Scene>
  )
}
