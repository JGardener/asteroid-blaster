# Future Scope

Items deferred from the initial elevation pass (issue #1). Each is a candidate for a future implementation phase. They were not rejected — they were descoped to keep the first elevation focused. A future agent picking up any of these should read `CONTEXT.md` for domain vocabulary and the relevant ADRs in `docs/adr/` before starting.

---

## Power-up expansion

Additional Pickup types beyond the current three (Shield, Spread Shot, Rapid Fire). Candidates include:

- **Bomb** — clears all small and medium asteroids on screen instantly; one-use
- **Time Slow** — reduces all asteroid and UFO movement speed for ~5 seconds
- **Triple Shot** — three parallel bullets (distinct from spread shot, which fans outward)
- **Homing Missile** — single slow-moving bullet that tracks the nearest asteroid

The existing Pickup entity and power-up state machinery (built in issue #1) is designed to accept new types. Adding a new power-up requires: a new variant in the `PowerUpType` union, a visual on the Ship draw method, a Pickup glyph on the canvas, and game loop handling for the effect. The one-active-power-up constraint (ADR-0003) applies to all new types unless that ADR is revisited.

---

## UFO death effects

When the UFO is destroyed it currently disappears immediately with no visual or audio feedback. It should feel as impactful as destroying a large asteroid. Work required:

- Trigger a particle burst at the UFO's position on destruction (the existing `ParticleSystem.burst` call used for asteroids is the right extension point — use a distinct colour such as `UFO_COLOR` to differentiate it from asteroid explosions).
- The `explosionMedium` sound already plays on UFO death (wired in issue #8); no additional audio work is needed unless a dedicated UFO-explosion sound is desired.
- Optionally display a brief score pop-up (`+500`) at the destruction site before fading out, consistent with any future score-feedback system.

The UFO `destroy()` method in `src/entities/Ufo.ts` and the bullet↔UFO collision block in `useGameLoop.ts` are the call sites to update.

---

## Audio volume controls

Players currently have no way to adjust sound effects or music volume. A volume control surface should be added. Suggested implementation:

- Two sliders: **SFX volume** and **Music volume**, each ranging 0–100%.
- A mute toggle button that silences all audio without losing the slider positions, so unmuting restores the previous levels.
- Controls should appear on both the Pause screen and a future Settings screen (see Pause menu game-state controls below).
- Persisted to `localStorage` so preferences survive page reloads.
- `AudioEngine` already exposes `masterGain` for music; a parallel `sfxGain` node should be introduced as the destination for all one-shot sound calls, giving independent control over the two channels.
- The controls are React UI components rendered as overlays inside `.ab-root`; they do not require any PIXI changes.

---

## Pause menu game-state controls

The current Pause screen only resumes the game. It should become a fuller in-game menu with the following controls:

- **Resume** — existing behaviour, returns to playing state.
- **Restart** — resets the game to level 1 with full lives, equivalent to starting a new game from the Game Over screen. Should prompt for confirmation to avoid accidental resets.
- **Quit / Exit** — calls the `onClose` prop to dismiss the game component and return to the portfolio. Should also prompt for confirmation.
- **Audio controls** — the SFX and Music volume sliders and mute toggle described above, embedded directly in the Pause screen so players can adjust audio mid-game without navigating to a separate settings screen.

The Pause screen lives in `src/screens/PauseScreen.tsx`. The `resetGame` action in `useGameStore` already handles the data reset for Restart; `onClose` is already threaded through `AsteroidBlaster.tsx` for Quit.

---

## Enemy variety

Additional enemy types beyond the UFO. Candidates:

- **Homing drone** — a small fast enemy that actively pursues the ship; no bullets, contact kill only; worth 300 points
- **Boss wave** — every fifth level spawns a single large boss asteroid that requires multiple hits to destroy and releases a burst of small asteroids on death
- **Turret asteroid** — a slow-moving large asteroid that periodically fires aimed shots, combining the UFO threat with the asteroid obstacle

Each new enemy should follow the UFO pattern: a self-contained entity class with its own state machine, integrated into the game loop collision checks, gated behind a minimum level. The UFO entry/exit pattern and accuracy scaling in `progression.ts` are useful references.

---

## Persistent meta-progression

Run-to-run upgrades that persist across game sessions (stored in `localStorage` alongside `hiScore`). Examples:

- Start each run with one extra life after reaching a cumulative score threshold
- Unlock a fourth power-up type after clearing level 5 for the first time
- A "prestige" mode unlocked after completing level 10

This requires a second Zustand store slice (or an extension of the existing one) for persistent player data, and a pre-game upgrade selection screen. The current store only persists `hiScore` — any meta-progression system should extend that pattern rather than introduce a separate persistence mechanism.

---

## Online leaderboard

A score submission and display system. Architecture considerations:

- Scores are already tracked in `localStorage` (`hiScore`) — submission would POST the final score and a player name to an external API
- The game is published as an npm package consumed by a portfolio site; the leaderboard UI (submission form, score table) would most naturally live in the portfolio host rather than inside the package
- The package could expose an `onGameOver: (score: number, level: number) => void` callback (similar to the existing `onClose` and `onError` props) that the portfolio host uses to trigger submission
- Do not add a network dependency inside the package itself

---

## Tutorial / onboarding

A guided first-run experience for players unfamiliar with the controls. Options:

- **Inline prompts**: the first Wave spawns only two slow asteroids; HUD prompts ("THRUST: W / ↑", "FIRE: SPACE") fade in and out as the relevant action is first performed
- **Dedicated tutorial phase**: a new `GamePhase` value (`'tutorial'`) with scripted asteroid positions and step-by-step instruction cards
- **Skip on repeat visits**: `localStorage` flag suppresses the tutorial after the first completion

The existing `GamePhase` union and screen component pattern (`MenuScreen`, `PauseScreen`, etc.) are the right extension points.

---

## Mobile and touch input

Adapting the game for touchscreen devices. The current input system (`src/input.ts`) is keyboard-only. Touch support would require:

- Virtual on-screen controls (joystick for thrust/rotation, tap button for fire) rendered as React overlays inside `.ab-root`
- The canvas is fixed at 960×640 — on small screens it would need to scale down and the touch targets would need to scale proportionally
- The `InputState` singleton would need a touch event path alongside the keyboard path, normalising both into the same boolean flags the game loop already reads

This is a meaningful scope increase. Consider whether the portfolio context (desktop-first) makes this a priority before starting.

---

## Accessibility

- **Reduced motion**: respect the `prefers-reduced-motion` media query; suppress screen shake, particle bursts, and the thruster flame animation when active
- **Colorblind modes**: the current palette (blue accent on near-black) is generally accessible, but a high-contrast mode and a deuteranopia-safe variant could be offered as CSS custom property overrides on `.ab-root`
- **Keyboard focus management**: the menu and game over screens use keyboard input but do not manage ARIA focus; screen reader users receive no game state announcements

Reduced motion is the highest-priority item here and the smallest lift — it is a single media query check before applying visual effects.

---

## Visual themes

Alternative colour palettes beyond the default blue-on-dark. Since the entire palette is defined as CSS custom properties on `.ab-root` (see `CLAUDE.md`), a theme is just an alternative set of property values. Candidates:

- **Amber terminal** — amber-on-black, CRT aesthetic
- **Green phosphor** — classic green monochrome
- **High contrast** — white-on-black, accessibility-oriented

Theme selection state could live in `localStorage` and be toggled from the pause screen. No PIXI changes required — only the CSS custom properties need to change.

### Updated Copy on Title Screen

New copy to go on the title screen to give new and existing users a more rounded idea of what the game is and how to play it. This is then enhanced through the previously mentioned tutorial level/process.

**Title Text** - something like "Pilot your ship and destroy asteroids with your trusted blaster before they destroy YOU.
**Powerup mention** - Have the powerups mentioned here to make the user aware of their existence. Possible showing of icons to represent powerups.
