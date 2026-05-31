import type { Vec2, AsteroidSize, GamePhase } from './types'
import type { InputSnapshot } from './input'
import type { PickupType } from './powerup'
import {
  SHIP_THRUST, SHIP_ROTATION_SPEED, SHIP_MAX_SPEED, SHIP_DRAG,
  CANVAS_W, CANVAS_H,
  BULLET_SPEED, BULLET_LIFETIME,
  UFO_FIRE_RATE, UFO_MAX_SPREAD, UFO_BULLET_SPEED, UFO_RADIUS, UFO_SPEED,
  ASTEROID_RADII, ASTEROID_SCORE, UFO_SCORE, INVINCIBILITY_FRAMES, PICKUP_DURATION,
  COLOR_ACCENT,
} from './constants'
import { wrapPosition, detectCollisions } from './collision'
import type { CollisionSnapshot } from './collision'
import { speedForLevel, ufoAccuracyForLevel, asteroidsForLevel, ufoFrequencyForLevel, fireCooldownForLevel } from './progression'
import { spreadShotAngles, effectiveCooldown } from './powerup'

const TRANSITION_FRAMES = 90  // TRANSITION_DURATION_MS (1500ms) at 60fps

export interface ShipState {
  pos:              Vec2
  vel:              Vec2
  rotation:         number
  invincible:       number
  thrustOn:         boolean
  powerUp:          PickupType | null
  powerUpRemaining: number
  fireCooldown:     number
}

export interface AsteroidState {
  pos:           Vec2
  vel:           Vec2
  size:          AsteroidSize
  radius:        number
  rotation:      number
  rotationSpeed: number
}

export interface BulletState {
  pos:      Vec2
  vel:      Vec2
  lifetime: number
  active:   boolean
  radius:   number
}

export interface UfoBulletState {
  pos:    Vec2
  vel:    Vec2
  active: boolean
  radius: number
}

export interface UfoState {
  pos:       Vec2
  vel:       Vec2
  fireTimer: number
  active:    boolean
  radius:    number
}

export interface PickupState {
  pos:    Vec2
  vel:    Vec2
  type:   PickupType
  active: boolean
  radius: number
}

export interface GameLoopState {
  ship:              ShipState | null
  asteroids:         AsteroidState[]
  bullets:           BulletState[]
  ufoBullets:        UfoBulletState[]
  ufo:               UfoState | null
  pickup:            PickupState | null
  pendingUfoTimers:  number[]
  carrierAsteroidIdx: number | null
  carrierPickupType: PickupType | null
  level:             number
  phase:             GamePhase
  lives:             number
  score:             number
  transitionTimer:   number
}

export type AudioCue =
  | 'shot'
  | 'explode_large'
  | 'explode_medium'
  | 'explode_small'
  | 'shipHit'
  | 'waveCleared'
  | 'gameStarted'
  | 'pickupCollected'
  | 'ufoAppeared'
  | 'ufoShot'

export type GameEvent =
  | { type: 'score';              delta: number }
  | { type: 'loseLife' }
  | { type: 'nextLevel' }
  | { type: 'setPhase';           phase: GamePhase }
  | { type: 'spawnPickup';        pickupType: PickupType; pos: Vec2 }
  | { type: 'particleBurst';      pos: Vec2; color: number; size: AsteroidSize }
  | { type: 'asteroidDestroyed';  idx: number }
  | { type: 'asteroidFragmented'; fragments: { size: AsteroidSize; pos: Vec2; vel: Vec2; rotationSpeed: number }[] }
  | { type: 'waveSpawned';        asteroids: { pos: Vec2; vel: Vec2; rotationSpeed: number }[] }
  | { type: 'screenShake' }
  | { type: 'audio';              cue: AudioCue }

function tickShip(ship: ShipState, input: InputSnapshot, dt: number): void {
  if (input.left)  ship.rotation -= SHIP_ROTATION_SPEED * dt
  if (input.right) ship.rotation += SHIP_ROTATION_SPEED * dt

  ship.thrustOn = input.thrust
  if (input.thrust) {
    ship.vel.x += Math.cos(ship.rotation) * SHIP_THRUST * dt
    ship.vel.y += Math.sin(ship.rotation) * SHIP_THRUST * dt
    const speed = Math.hypot(ship.vel.x, ship.vel.y)
    if (speed > SHIP_MAX_SPEED) {
      ship.vel.x = (ship.vel.x / speed) * SHIP_MAX_SPEED
      ship.vel.y = (ship.vel.y / speed) * SHIP_MAX_SPEED
    }
  }

  const drag = Math.pow(SHIP_DRAG, dt)
  ship.vel.x *= drag
  ship.vel.y *= drag
  ship.pos.x += ship.vel.x * dt
  ship.pos.y += ship.vel.y * dt
  ship.pos = wrapPosition(ship.pos, 0)

  if (ship.invincible > 0) ship.invincible -= dt
}

function tickAsteroid(ast: AsteroidState, speedMult: number, dt: number): void {
  ast.pos = wrapPosition(
    { x: ast.pos.x + ast.vel.x * speedMult, y: ast.pos.y + ast.vel.y * speedMult },
    ast.radius,
  )
  ast.rotation += ast.rotationSpeed * dt
}

function tickBullet(b: BulletState, dt: number): void {
  if (!b.active) return
  b.pos.x   += b.vel.x * dt
  b.pos.y   += b.vel.y * dt
  b.lifetime -= dt
  const oob  = b.pos.x < 0 || b.pos.x > CANVAS_W || b.pos.y < 0 || b.pos.y > CANVAS_H
  b.active   = b.lifetime > 0 && !oob
}

function tickUfoBullet(b: UfoBulletState, dt: number): void {
  if (!b.active) return
  b.pos.x += b.vel.x * dt
  b.pos.y += b.vel.y * dt
  const oob = b.pos.x < 0 || b.pos.x > CANVAS_W || b.pos.y < 0 || b.pos.y > CANVAS_H
  if (oob) b.active = false
}

function tickPickup(pickup: PickupState, dt: number): void {
  pickup.pos.x += pickup.vel.x * dt
  pickup.pos.y += pickup.vel.y * dt
  pickup.pos    = wrapPosition(pickup.pos, pickup.radius)
}

function tickUfo(
  ufo: UfoState,
  ufoBullets: UfoBulletState[],
  shipPos: Vec2,
  inaccuracy: number,
  dt: number,
): { exited: boolean; fired: boolean } {
  ufo.pos.x += ufo.vel.x * dt
  ufo.pos.y += ufo.vel.y * dt

  const exited =
    (ufo.vel.x < 0 && ufo.pos.x < -UFO_RADIUS) ||
    (ufo.vel.x > 0 && ufo.pos.x > CANVAS_W + UFO_RADIUS)
  if (exited) return { exited: true, fired: false }

  ufo.fireTimer -= dt
  let fired = false

  if (ufo.fireTimer <= 0) {
    ufo.fireTimer = UFO_FIRE_RATE
    const base    = Math.atan2(shipPos.y - ufo.pos.y, shipPos.x - ufo.pos.x)
    const spread  = inaccuracy * UFO_MAX_SPREAD
    const angle   = base + (Math.random() - 0.5) * 2 * spread
    const freeIdx = ufoBullets.findIndex(b => !b.active)
    if (freeIdx >= 0) {
      const b  = ufoBullets[freeIdx]
      b.pos.x  = ufo.pos.x
      b.pos.y  = ufo.pos.y
      b.vel.x  = Math.cos(angle) * UFO_BULLET_SPEED
      b.vel.y  = Math.sin(angle) * UFO_BULLET_SPEED
      b.active = true
      fired    = true
    }
  }

  return { exited: false, fired }
}

function respondToCollisionsInState(
  pairs:              ReturnType<typeof detectCollisions>,
  state:              GameLoopState,
  activeBulletMap:    Array<{ idx: number }>,
  activeUfoBulletMap: Array<{ idx: number }>,
): GameEvent[] {
  const events: GameEvent[]   = []
  const deadBulletIdxs        = new Set<number>()
  const deadUfoBulletIdxs     = new Set<number>()
  const deadAsteroidIdxs      = new Set<number>()
  const fragments: { size: AsteroidSize; pos: Vec2; vel: Vec2; rotationSpeed: number }[] = []

  for (const pair of pairs) {
    switch (pair.kind) {
      case 'bulletHitsAsteroid': {
        const bulletFullIdx = activeBulletMap[pair.bulletId].idx
        const ast           = state.asteroids[pair.asteroidId]
        deadBulletIdxs.add(bulletFullIdx)
        deadAsteroidIdxs.add(pair.asteroidId)
        events.push({ type: 'score', delta: ASTEROID_SCORE[ast.size] })
        events.push({ type: 'particleBurst', pos: { ...ast.pos }, color: COLOR_ACCENT, size: ast.size })
        events.push({ type: 'asteroidDestroyed', idx: pair.asteroidId })
        const cue: AudioCue = ast.size === 'large' ? 'explode_large' : ast.size === 'medium' ? 'explode_medium' : 'explode_small'
        events.push({ type: 'audio', cue })
        if (ast.size !== 'small') {
          const next: AsteroidSize = ast.size === 'large' ? 'medium' : 'small'
          fragments.push(
            { size: next, pos: { ...ast.pos }, vel: { x:  ast.vel.y * 1.5 + (Math.random() - 0.5), y: -ast.vel.x * 1.5 + (Math.random() - 0.5) }, rotationSpeed: (Math.random() - 0.5) * 0.02 },
            { size: next, pos: { ...ast.pos }, vel: { x: -ast.vel.y * 1.5 + (Math.random() - 0.5), y:  ast.vel.x * 1.5 + (Math.random() - 0.5) }, rotationSpeed: (Math.random() - 0.5) * 0.02 },
          )
        }
        if (pair.asteroidId === state.carrierAsteroidIdx && state.carrierPickupType) {
          events.push({ type: 'spawnPickup', pickupType: state.carrierPickupType, pos: { ...ast.pos } })
          state.carrierAsteroidIdx = null
          state.carrierPickupType  = null
        }
        break
      }
      case 'bulletHitsUfo': {
        const bulletFullIdx = activeBulletMap[pair.bulletId].idx
        deadBulletIdxs.add(bulletFullIdx)
        state.ufo = null
        events.push({ type: 'score', delta: UFO_SCORE })
        events.push({ type: 'audio', cue: 'explode_medium' })
        break
      }
      case 'ufoBulletHitsShip': {
        const ubFullIdx = activeUfoBulletMap[pair.bulletId].idx
        deadUfoBulletIdxs.add(ubFullIdx)
        if (state.ship?.powerUp === 'Shield') {
          state.ship.invincible       = INVINCIBILITY_FRAMES
          state.ship.powerUp          = null
          state.ship.powerUpRemaining = 0
        } else {
          events.push({ type: 'loseLife' })
          events.push({ type: 'screenShake' })
          if (state.ship) {
            state.ship.invincible = INVINCIBILITY_FRAMES
            state.ship.vel        = { x: 0, y: 0 }
            state.ship.pos        = { x: CANVAS_W / 2, y: CANVAS_H / 2 }
          }
        }
        events.push({ type: 'audio', cue: 'shipHit' })
        break
      }
      case 'asteroidHitsShip': {
        if (state.ship?.powerUp === 'Shield') {
          state.ship.invincible       = INVINCIBILITY_FRAMES
          state.ship.powerUp          = null
          state.ship.powerUpRemaining = 0
        } else {
          events.push({ type: 'loseLife' })
          events.push({ type: 'screenShake' })
          if (state.ship) {
            state.ship.invincible = INVINCIBILITY_FRAMES
            state.ship.vel        = { x: 0, y: 0 }
            state.ship.pos        = { x: CANVAS_W / 2, y: CANVAS_H / 2 }
          }
        }
        events.push({ type: 'audio', cue: 'shipHit' })
        break
      }
      case 'shipGrabsPickup': {
        if (state.pickup && state.ship) {
          state.ship.powerUp          = state.pickup.type
          state.ship.powerUpRemaining = state.pickup.type === 'Shield' ? Infinity : PICKUP_DURATION
          state.pickup                = null
          events.push({ type: 'audio', cue: 'pickupCollected' })
        }
        break
      }
    }
  }

  // Deactivate dead bullets / ufoBullets
  for (const idx of deadBulletIdxs)    state.bullets[idx].active    = false
  for (const idx of deadUfoBulletIdxs) state.ufoBullets[idx].active = false

  // Adjust carrierAsteroidIdx for removed asteroids
  if (state.carrierAsteroidIdx !== null && deadAsteroidIdxs.size > 0) {
    let shift = 0
    for (const i of deadAsteroidIdxs) {
      if (i < state.carrierAsteroidIdx) shift++
    }
    state.carrierAsteroidIdx -= shift
  }

  // Splice dead asteroids descending so earlier indices stay valid
  for (const idx of [...deadAsteroidIdxs].sort((a, b) => b - a)) {
    state.asteroids.splice(idx, 1)
  }

  // Fragments emitted as event; applyEventsToPIXI creates AsteroidData + renderers
  if (fragments.length > 0) {
    events.push({ type: 'asteroidFragmented', fragments })
  }

  return events
}

export function tickGameState(
  state: GameLoopState,
  input: InputSnapshot,
  dt: number,
): GameEvent[] {
  const events: GameEvent[] = []

  if (state.ship) tickShip(state.ship, input, dt)

  const speedMult = speedForLevel(state.level) * dt
  for (const ast of state.asteroids) tickAsteroid(ast, speedMult, dt)
  for (const b   of state.bullets)   tickBullet(b, dt)
  for (const b   of state.ufoBullets) tickUfoBullet(b, dt)

  if (state.ufo && state.ship) {
    const inaccuracy = 1 - ufoAccuracyForLevel(state.level)
    const { exited, fired } = tickUfo(state.ufo, state.ufoBullets, state.ship.pos, inaccuracy, dt)
    if (exited) state.ufo = null
    if (fired)  events.push({ type: 'audio', cue: 'ufoShot' })
  }

  if (state.pickup) tickPickup(state.pickup, dt)

  // ── collision detection + response ───────────────────────────────────────────
  const preCollisionCount = state.asteroids.length

  if (state.phase === 'playing') {
    const activeBulletMap:    Array<{ idx: number }> = []
    const activeUfoBulletMap: Array<{ idx: number }> = []
    state.bullets.forEach((b, idx)    => { if (b.active) activeBulletMap.push({ idx }) })
    state.ufoBullets.forEach((b, idx) => { if (b.active) activeUfoBulletMap.push({ idx }) })

    const snapshot: CollisionSnapshot = {
      ship:       state.ship ? { pos: state.ship.pos, radius: 10, invincible: state.ship.invincible } : null,
      bullets:    activeBulletMap.map((entry, i)    => ({ pos: state.bullets[entry.idx].pos,    radius: state.bullets[entry.idx].radius,    id: i })),
      asteroids:  state.asteroids.map((a, i)         => ({ pos: a.pos,                           radius: a.radius,                           id: i })),
      ufoBullets: activeUfoBulletMap.map((entry, i) => ({ pos: state.ufoBullets[entry.idx].pos, radius: state.ufoBullets[entry.idx].radius, id: i })),
      ufo:        state.ufo    ? { pos: state.ufo.pos,    radius: state.ufo.radius }    : null,
      pickup:     state.pickup ? { pos: state.pickup.pos, radius: state.pickup.radius } : null,
    }

    const pairs = detectCollisions(snapshot)
    if (pairs.length > 0) {
      events.push(...respondToCollisionsInState(pairs, state, activeBulletMap, activeUfoBulletMap))
    }
  }

  // ── power-up timer ───────────────────────────────────────────────────────────
  if (state.ship?.powerUp && state.ship.powerUpRemaining !== Infinity) {
    state.ship.powerUpRemaining -= dt
    if (state.ship.powerUpRemaining <= 0) {
      state.ship.powerUp          = null
      state.ship.powerUpRemaining = 0
    }
  }

  // ── UFO scheduling ───────────────────────────────────────────────────────────
  if (state.phase === 'playing') {
    for (let i = state.pendingUfoTimers.length - 1; i >= 0; i--) {
      state.pendingUfoTimers[i] -= dt
      if (state.pendingUfoTimers[i] <= 0 && !state.ufo) {
        state.pendingUfoTimers.splice(i, 1)
        const side: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right'
        state.ufo = {
          pos:       { x: side === 'left' ? -UFO_RADIUS : CANVAS_W + UFO_RADIUS, y: Math.random() * CANVAS_H * 0.6 + CANVAS_H * 0.2 },
          vel:       { x: side === 'left' ? UFO_SPEED : -UFO_SPEED, y: 0 },
          fireTimer: UFO_FIRE_RATE,
          active:    true,
          radius:    UFO_RADIUS,
        }
        events.push({ type: 'audio', cue: 'ufoAppeared' })
      }
    }
  }

  // ── wave clear ───────────────────────────────────────────────────────────────
  const fragmentCount = events
    .filter(e => e.type === 'asteroidFragmented')
    .flatMap(e => (e as { type: 'asteroidFragmented'; fragments: unknown[] }).fragments)
    .length

  if (state.phase === 'playing' && preCollisionCount > 0 && state.asteroids.length === 0 && fragmentCount === 0) {
    state.level           += 1
    state.phase            = 'transitioning'
    state.transitionTimer  = TRANSITION_FRAMES
    state.ufo              = null
    state.pickup           = null
    state.pendingUfoTimers = []
    state.carrierAsteroidIdx = null
    state.carrierPickupType  = null
    for (const b of state.ufoBullets) b.active = false
    events.push({ type: 'nextLevel' })
    events.push({ type: 'setPhase', phase: 'transitioning' })
    events.push({ type: 'audio', cue: 'waveCleared' })
  }

  // ── level transition timer ───────────────────────────────────────────────────
  const PICKUP_TYPES: PickupType[] = ['SpreadShot', 'RapidFire', 'Shield']

  if (state.phase === 'transitioning' && state.transitionTimer > 0) {
    state.transitionTimer -= dt
    if (state.transitionTimer <= 0) {
      state.transitionTimer = 0
      const count           = asteroidsForLevel(state.level)
      const newAsteroidParams: { pos: Vec2; vel: Vec2; rotationSpeed: number }[] = []
      for (let i = 0; i < count; i++) {
        const x     = Math.random() < 0.5 ? -ASTEROID_RADII.large : CANVAS_W + ASTEROID_RADII.large
        const y     = Math.random() * CANVAS_H
        const speed = Math.random() * 0.8 + 0.4
        const angle = Math.random() * Math.PI * 2
        newAsteroidParams.push({
          pos: { x, y },
          vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          rotationSpeed: (Math.random() - 0.5) * 0.02,
        })
      }
      state.carrierAsteroidIdx = Math.floor(Math.random() * count)
      state.carrierPickupType  = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)]
      const ufoCount           = ufoFrequencyForLevel(state.level)
      const waveLen            = asteroidsForLevel(state.level) * 300
      state.pendingUfoTimers   = Array.from({ length: ufoCount }, () => 60 + Math.floor(Math.random() * Math.max(1, waveLen - 60)))
      state.phase              = 'playing'
      events.push({ type: 'waveSpawned', asteroids: newAsteroidParams })
      events.push({ type: 'setPhase', phase: 'playing' })
    }
  }

  // ── bullet firing ─────────────────────────────────────────────────────────────
  const canFire = state.ship ? state.ship.fireCooldown <= 0 : false
  if (state.ship) state.ship.fireCooldown = Math.max(0, state.ship.fireCooldown - dt)

  if (state.ship && state.phase === 'playing' && input.fire && canFire) {
    const powerUpType = state.ship.powerUp
    const angles      = powerUpType === 'SpreadShot' ? spreadShotAngles(state.ship.rotation) : [state.ship.rotation]
    let didFire = false
    for (const angle of angles) {
      const slotIdx = state.bullets.findIndex(b => !b.active)
      if (slotIdx >= 0) {
        const b    = state.bullets[slotIdx]
        b.pos.x    = state.ship.pos.x
        b.pos.y    = state.ship.pos.y
        b.vel.x    = Math.cos(angle) * BULLET_SPEED
        b.vel.y    = Math.sin(angle) * BULLET_SPEED
        b.lifetime = BULLET_LIFETIME
        b.active   = true
        didFire    = true
      }
    }
    if (didFire) {
      state.ship.fireCooldown = effectiveCooldown(fireCooldownForLevel(state.level), powerUpType)
      events.push({ type: 'audio', cue: 'shot' })
    }
  }

  return events
}

export function makeInitialGameLoopState(): GameLoopState {
  return {
    ship: null,
    asteroids: [],
    bullets: [],
    ufoBullets: [],
    ufo: null,
    pickup: null,
    pendingUfoTimers: [],
    carrierAsteroidIdx: null,
    carrierPickupType: null,
    level: 1,
    phase: 'playing',
    lives: 3,
    score: 0,
    transitionTimer: 0,
  }
}
