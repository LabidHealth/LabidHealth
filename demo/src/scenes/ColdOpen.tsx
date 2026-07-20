import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../theme'
import { LogoMark } from '../components/LogoMark'
import { Scene } from '../components/ui'

export const ColdOpen: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const word = spring({ frame: frame - 30, fps, config: { damping: 18 } })
  const line = interpolate(frame, [58, 82], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <Scene durationInFrames={dur} bg={C.navy}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1100px 600px at 50% 38%, rgba(37,99,235,0.28), transparent 70%)`
        }}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 26 }}>
        <LogoMark size={150} animate delay={4} />
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: -2,
            opacity: word,
            transform: `translateY(${(1 - word) * 24}px)`
          }}
        >
          Labid Health
          <span style={{ color: C.green }}>.</span>
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: '#AEB9CC',
            opacity: line,
            transform: `translateY(${(1 - line) * 16}px)`,
            maxWidth: 1100,
            textAlign: 'center'
          }}
        >
          The Nigerian AI-powered Laboratory Operating &amp; Management System
        </div>
      </AbsoluteFill>
    </Scene>
  )
}
