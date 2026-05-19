# Asteroid Blaster

> Browser arcade shooter built with PixiJS v8, React, and TypeScript.
> Consumed as an npm package by a portfolio SPA — playable inline via a modal.

## Architecture

```
PIXI world                         React world
─────────────────────────          ──────────────────────────
useGameLoop.ts (ticker)   writes►  store.ts (zustand)
  Ship, Asteroid,                    score, lives, phase, level
  Bullet, Particle                              │
  StarField, Thruster                           ▼
  screenShake                        GameHUD.tsx
                                     MenuScreen.tsx
                                     PauseScreen.tsx
                                     GameOverScreen.tsx
```

The game uses two worlds that never directly reference each other:

**PIXI world** — `useGameLoop.ts` runs inside a PIXI Ticker at 60fps.
It owns all entity state: positions, velocities, graphics objects.
No React, no hooks, no setState calls inside the ticker.

**React world** — `GameHUD`, `MenuScreen`, `PauseScreen`, `GameOverScreen`
are standard React components. They never touch PIXI directly.

**The bridge** — `store.ts` (zustand). The ticker writes `score`,
`lives`, `phase`, and `level`. React components read them via selectors.
One-directional data flow; zero coupling between the two worlds.

## Object Pool

JavaScript's garbage collector runs unpredictably. Calling `new` inside
a 60fps ticker creates short-lived objects that trigger GC pauses —
visible as frame drops in DevTools.

The pool pre-allocates 20 bullets and 120 particles at startup.
`acquire()` returns a dormant instance; `release()` marks it inactive.
No allocation in the hot path after init.

Pool sizes were calculated from worst-case simultaneity:

- **Bullets**: fire cooldown of 14 frames, bullet lifetime of 55 frames →
  max simultaneous = ⌊55 / 14⌋ + 1 = 4 bullets. Pool of 20 gives 5× headroom.
- **Particles**: destroying one large asteroid emits 18 particles; a large
  splits into 2 mediums (12 each) = 42 particles in a single frame. Pool of
  120 covers 2–3 simultaneous chain-reaction bursts with margin.

## State machine

`GamePhase` is a string union: `'menu' | 'playing' | 'paused' | 'gameover'`

```
          Enter/Space
  ┌───────────────────────────────┐
  │                               ▼
menu ──Enter/Space──► playing ──Esc──► paused
                        │               │
                      lives=0          Esc
                        │               │
                        ▼               ▼
                     gameover       playing
                        │
                   Enter/Space
                        │
                        ▼
                     playing
```

A string union rather than an enum because it serialises cleanly to
localStorage, reads naturally in the React DevTools store panel, and
avoids the reverse-mapping ceremony TypeScript enums require.

State lives in zustand rather than in the game loop because React
components need to read it declaratively — polling from a ref inside a
rAF loop would couple the UI to the game clock unnecessarily.

## Performance results

Profiled with Stats.js (FPS panel) and Chrome DevTools → Performance.

- 60fps stable with 30+ simultaneous asteroids
- Memory profile: flat line — no sawtooth GC pattern
- No allocations in the ticker hot path (confirmed via DevTools Allocation Profiler)
- Object pool eliminates all per-frame `new` calls after startup
- Bundle: 486 KB UMD unminified / ~142 KB gzipped (PixiJS v8 dominates)
- React and ReactDOM are peer dependencies — not included in the bundle
- stats.js profiler is dev-only; Vite tree-shakes it completely from production

## Running locally

```bash
npm install
npm run dev
# Opens http://localhost:5173 — full-screen dev harness
```

## Building the package

```bash
npm run build
# Outputs dist/asteroid-blaster.es.js and dist/asteroid-blaster.umd.js
```

## Integrating into the portfolio

### Local (pre-publish)

```bash
# In this repo:
npm run build
npm link

# In the portfolio repo:
npm link asteroid-blaster
```

### Via npm (after publish)

```bash
npm install asteroid-blaster
```

```tsx
import AsteroidBlaster from 'asteroid-blaster'

// Inside GameModal:
<AsteroidBlaster onClose={handleClose} />
```

The component is self-contained — it owns its PIXI lifecycle, canvas, HUD,
and all screen overlays. The portfolio provides only a container div and an
`onClose` callback. Unmounting the component triggers full PIXI teardown and
input listener removal.
