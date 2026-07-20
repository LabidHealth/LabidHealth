import React from 'react'
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../theme'
import { Caption, Scene } from '../components/ui'

const PHONE_W = 392
const IMG_RATIO = 1317 / 430
const SCREEN_H = 820

const CALLOUTS = [
  { t: 'Sent on the lab’s own WhatsApp', s: 'A secure link — no app, no login.', c: C.green },
  { t: 'English · Pidgin · Igbo', s: 'The patient picks their language.', c: C.blue },
  { t: 'Plain-language AI', s: 'Explains the result — never a diagnosis.', c: C.sky }
]

export const Delivery: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const imgH = PHONE_W * IMG_RATIO
  const phoneIn = spring({ frame: frame - 30, fps, config: { damping: 18 } })
  // Slow scroll to reveal the AI explanation lower on the page.
  const scroll = interpolate(frame, [120, 430], [0, -(imgH - SCREEN_H)], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  return (
    <Scene durationInFrames={dur} bg={C.navy}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 700px at 72% 50%, rgba(16,185,129,0.16), transparent 70%)` }} />
      <AbsoluteFill style={{ padding: '0 130px', flexDirection: 'row', alignItems: 'center', gap: 90 }}>
        <div style={{ flex: 1 }}>
          <Caption
            kicker="Delivery + AI"
            title={<span style={{ color: '#fff' }}>Delivered on WhatsApp.<br />Explained in their <span style={{ color: C.green }}>language</span>.</span>}
            align="left"
            color="#fff"
          />
          <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {CALLOUTS.map((co, i) => {
              const s = spring({ frame: frame - 150 - i * 34, fps, config: { damping: 16 } })
              return (
                <div key={co.t} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', opacity: s, transform: `translateX(${(1 - s) * -24}px)` }}>
                  <div style={{ width: 16, height: 16, borderRadius: 5, background: co.c, marginTop: 6, flex: 'none' }} />
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{co.t}</div>
                    <div style={{ fontSize: 20, color: '#AEB9CC', marginTop: 2 }}>{co.s}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ opacity: phoneIn, transform: `translateY(${(1 - phoneIn) * 40}px)` }}>
          <div style={{ width: PHONE_W + 24, background: '#000', borderRadius: 46, padding: 12, boxShadow: '0 40px 90px rgba(0,0,0,0.5)' }}>
            <div style={{ width: PHONE_W, height: SCREEN_H, borderRadius: 34, overflow: 'hidden', background: C.pageBg, position: 'relative' }}>
              <img src={staticFile('patient-phone.png')} style={{ position: 'absolute', top: 0, left: 0, width: PHONE_W, transform: `translateY(${scroll}px)` }} />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  )
}
