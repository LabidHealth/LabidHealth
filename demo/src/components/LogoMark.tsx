import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C } from '../theme'

// The Labid node mark (from the approved mockup): a blue node connected by an
// L-stroke down to a green node. Draws itself in when `animate` is set.
export const LogoMark: React.FC<{ size?: number; animate?: boolean; delay?: number }> = ({
  size = 120,
  animate = true,
  delay = 0
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const f = Math.max(0, frame - delay)

  const draw = animate ? interpolate(f, [0, 22], [0, 1], { extrapolateRight: 'clamp' }) : 1
  const n1 = animate ? spring({ frame: f - 6, fps, config: { damping: 12 } }) : 1
  const n2 = animate ? spring({ frame: f - 16, fps, config: { damping: 12 } }) : 1
  const pathLen = 60

  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path
        d="M17 9v22a8 8 0 0 0 8 8"
        fill="none"
        stroke={C.blue}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={pathLen}
        strokeDashoffset={pathLen * (1 - draw)}
      />
      <circle cx={17} cy={10} r={7 * n1} fill={C.blue} />
      <circle cx={33} cy={37} r={7 * n2} fill={C.green} />
    </svg>
  )
}
