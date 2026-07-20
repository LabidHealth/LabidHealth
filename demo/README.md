# Labid Health — demo video (Remotion)

A ~115s product overview built with [Remotion](https://remotion.dev). Scenes are
React components in `src/scenes/`, styled from the app's brand tokens
(`src/theme.ts`), and composited with real product screenshots in `public/`.

## Commands

```bash
npm install
npm run studio      # live editor at localhost:3000
npm run render      # renders out/labid-demo.mp4 (1920x1080, 30fps)
npm run still -- --frame=2280   # single frame preview
```

## Structure

- `src/LabidDemo.tsx` — scene order + durations (edit here to re-time).
- `src/scenes/*` — one file per scene (cold open → problem → pipeline → offline →
  register → catalog → delivery+AI → dashboards → trust → close).
- `public/*.png` — real screenshots (owner, front desk, scientist, patient view).

## Notes

- **Music:** the brief was "captions + music." Drop a licensed track at
  `public/music.mp3` and add `<Audio src={staticFile('music.mp3')} />` to
  `LabidDemo.tsx` — it's intentionally omitted (no licensed audio bundled).
- Screenshots use synthetic demo data only (no real patient information).
- Positioning line: "The Nigerian AI-powered Laboratory Operating & Management System."
