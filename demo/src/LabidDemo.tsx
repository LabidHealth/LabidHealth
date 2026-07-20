import React from 'react'
import { Series } from 'remotion'
import { ColdOpen } from './scenes/ColdOpen'
import { Problem } from './scenes/Problem'
import { Pipeline } from './scenes/Pipeline'
import { Offline } from './scenes/Offline'
import { Register } from './scenes/Register'
import { Catalog } from './scenes/Catalog'
import { Delivery } from './scenes/Delivery'
import { Dashboards } from './scenes/Dashboards'
import { Trust } from './scenes/Trust'
import { Close } from './scenes/Close'

export const SCENES: { c: React.FC<{ dur: number }>; dur: number }[] = [
  { c: ColdOpen, dur: 180 },
  { c: Problem, dur: 330 },
  { c: Pipeline, dur: 360 },
  { c: Offline, dur: 330 },
  { c: Register, dur: 330 },
  { c: Catalog, dur: 390 },
  { c: Delivery, dur: 540 },
  { c: Dashboards, dur: 450 },
  { c: Trust, dur: 300 },
  { c: Close, dur: 240 }
]

export const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0)

export const LabidDemo: React.FC = () => (
  <Series>
    {SCENES.map(({ c: SceneComp, dur }, i) => (
      <Series.Sequence key={i} durationInFrames={dur}>
        <SceneComp dur={dur} />
      </Series.Sequence>
    ))}
  </Series>
)
