# Asteroid Blaster — Claude Code Instructions

This is a standalone repository for Asteroid Blaster, a PixiJS v8 arcade
shooter. It is built and tested independently, then consumed by a separate
portfolio repository as an npm package.

Read this file fully before doing anything else.
Then read the phase file for the current phase before writing any code.
Do not read ahead to future phase files.

---

## Hard rules — never break these

- Only create or edit files listed in the current phase file
- Never install a dependency not listed in the current phase file
- Never refactor code from a completed phase unless fixing a confirmed bug
- Never use `new` inside the PIXI ticker — use the ObjectPool
- Never store per-frame state (positions, velocities) in the zustand store
- Never hardcode colours — use the CSS custom properties listed below
- When a phase is complete, state exactly what to test and how, then stop

---

## Repository purpose

This repo produces a self-contained game component that the portfolio repo
consumes. The integration contract is:

```ts
// Portfolio imports this:
import AsteroidBlaster from 'asteroid-blaster'

// And mounts it inside GameModal:
<AsteroidBlaster onClose={handleClose} />
```

Everything inside this repo — canvas, HUD, screens, game loop — is
encapsulated. The portfolio repo provides nothing except a container div
and an `onClose` callback. The game is responsible for its own PIXI
lifecycle, input handling, and teardown.

---

## Architecture — two worlds, one bridge

```
PIXI world                         React world
─────────────────────────          ──────────────────────────
useGameLoop.ts (ticker)   writes►  store.ts (zustand)
  Ship, Asteroid,                    score, lives, phase, level
  Bullet, Ufo, UfoBullet,                       │
  Pickup, Particle,                              ▼
  StarField, Thruster         GameHUD.tsx  (reads store)
                              MenuScreen.tsx
tickAudio.ts          calls►  PauseScreen.tsx
  (per-frame audio            GameOverScreen.tsx
   dispatch)                  LevelTransitionScreen.tsx
        │
        ▼
  AudioEngine.ts              audioStore.ts (zustand)
  (Web Audio API)    reads►   volume, muted (persistent prefs)
```

The PIXI ticker and React components never reference each other directly.
Zustand is the only bridge. This keeps the render loop free of React
overhead and keeps the UI declarative.

Audio runs through a separate path: `tickAudio.ts` is called each frame
and dispatches sound events to `AudioEngine.ts`, which synthesises audio
procedurally via the Web Audio API. Volume/mute preferences live in
`audioStore.ts` (persisted via `localStorage`).

---

## File structure

```
asteroid-blaster/
├── CLAUDE.md                        ← you are here
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts                   ← lib mode, exports AsteroidBlaster
├── index.html                       ← dev harness only (not shipped)
├── README.md
├── dist/                            ← build output (gitignored)
└── src/
    ├── index.ts                     ← public export
    ├── AsteroidBlaster.tsx          ← root component (entry point)
    ├── main.tsx                     ← dev harness entry point
    ├── styles.css                   ← global styles / CSS custom properties
    ├── tsconfig.json                ← src-level TS config
    ├── constants.ts
    ├── types.ts
    ├── store.ts
    ├── audioStore.ts                ← volume/mute prefs (persisted)
    ├── AudioEngine.ts               ← procedural Web Audio synthesis
    ├── tickAudio.ts                 ← per-frame audio dispatch (called from ticker)
    ├── input.ts
    ├── progression.ts
    ├── powerup.ts                   ← power-up type definitions and logic
    ├── collision.ts
    ├── ObjectPool.ts
    ├── useGameLoop.ts
    ├── GameLoop.tsx
    ├── PixiCanvas.tsx
    ├── GameHUD.tsx
    ├── entities/
    │   ├── Ship.ts
    │   ├── Asteroid.ts
    │   ├── Bullet.ts
    │   ├── Ufo.ts
    │   ├── UfoBullet.ts
    │   └── Pickup.ts                ← collectible power-up entity
    ├── effects/
    │   ├── ParticleSystem.ts
    │   ├── Thruster.ts
    │   ├── StarField.ts
    │   └── screenShake.ts
    ├── screens/
    │   ├── MenuScreen.tsx
    │   ├── PauseScreen.tsx
    │   ├── GameOverScreen.tsx
    │   └── LevelTransitionScreen.tsx
    └── __tests__/
        ├── setup.ts
        ├── pure-logic.test.ts
        ├── delta-time.test.ts
        ├── pickup.test.ts
        ├── ufo.test.ts
        ├── audioStore.test.ts
        ├── AudioEngine.test.ts
        ├── PauseScreen.test.tsx
        └── LevelTransitionScreen.test.tsx
```

---

## CSS custom properties

The game component injects its own stylesheet scoped to `.ab-root`.
Use only these properties inside component styles — never hardcode hex values.

```css
.ab-root {
  --ab-bg: #0a0a0f;
  --ab-surface: #13131a;
  --ab-accent: #4f8cff;
  --ab-text: #e8e8f0;
  --ab-dim: #6e6e85;
  --ab-muted: #3a3a50;
  --ab-mono: "JetBrains Mono", monospace;
  --ab-display: "Syne", sans-serif;
  --ab-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

These values are chosen to match the portfolio's design tokens. When the
game mounts inside the portfolio modal, they will visually integrate
without any extra configuration.

---

## Canvas

- Fixed size: **960 × 640**
- `autoDensity: true`, `resolution: Math.min(devicePixelRatio, 2)`
- `backgroundAlpha: 0` — the `.ab-root` background colour shows through
- The canvas fills its container via `width: 100%; height: 100%`

## How to run in development

```bash
npm install
npm run dev
# Opens http://localhost:5173 — the dev harness renders AsteroidBlaster full-screen
```

## How to build the library

```bash
npm run build
# Outputs dist/asteroid-blaster.es.js and dist/asteroid-blaster.umd.js
```

## How to link to the portfolio (before publishing to npm)

```bash
# In this repo:
npm link

# In the portfolio repo:
npm link asteroid-blaster
```
