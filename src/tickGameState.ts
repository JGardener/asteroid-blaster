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
  pos:        Vec2
  vel:        Vec2
  rotation:   number
  invincible: number
  thrustOn:   boolean
  powerUp:    PickupType | null
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
  activePowerUp:     { type: PickupType; remaining: number } | null
  pendingUfoTimers:  number[]
  fireCooldown:      number
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
  | { type: 'score';            delta: number }
  | { type: 'loseLife' }
  | { type: 'nextLevel' }
  | { type: 'setPhase';         phase: GamePhase }
  | { type: 'spawnPickup';      pickupType: PickupType; pos: Vec2 }
  | { type: 'particleBurst';    pos: Vec2; color: number; size: AsteroidSize }
  | { type: 'asteroidDestroyed';idx: number }
  | { type: 'screenShake' }
  | { type: 'audio';        cue: AudioCue }

function tickShip(ship: ShipState, input: InputSnapshot, dt: number): ShipState {
  let { pos, vel, rotation, invincible, powerUp } = ship

  if (input.left)  rotation -= SHIP_ROTATION_SPEED * dt
  if (input.right) rotation += SHIP_ROTATION_SPEED * dt

  const thrustOn = input.thrust
  if (input.thrust) {
    vel = {
      x: vel.x + Math.cos(rotation) * SHIP_THRUST * dt,
      y: vel.y + Math.sin(rotation) * SHIP_THRUST * dt,
    }
    const speed = Math.hypot(vel.x, vel.y)
    if (speed > SHIP_MAX_SPEED) {
      vel = { x: (vel.x / speed) * SHIP_MAX_SPEED, y: (vel.y / speed) * SHIP_MAX_SPEED }
    }
  }

  const drag = Math.pow(SHIP_DRAG, dt)
  vel = { x: vel.x * drag, y: vel.y * drag }
  pos = { x: pos.x + vel.x * dt, y: pos.y + vel.y * dt }
  pos = wrapPosition(pos, 0)

  if (invincible > 0) invincible -= dt

  return { pos, vel, rotation, invincible, thrustOn, powerUp }
}

function tickAsteroid(ast: AsteroidState, speedMult: number, dt: number): AsteroidState {
  const pos = wrapPosition(
    { x: ast.pos.x + ast.vel.x * speedMult, y: ast.pos.y + ast.vel.y * speedMult },
    ast.radius,
  )
  return { ...ast, pos, rotation: ast.rotation + ast.rotationSpeed * dt }
}

function tickBullet(b: BulletState, dt: number): BulletState {
  if (!b.active) return b
  const pos      = { x: b.pos.x + b.vel.x * dt, y: b.pos.y + b.vel.y * dt }
  const lifetime = b.lifetime - dt
  const oob      = pos.x < 0 || pos.x > CANVAS_W || pos.y < 0 || pos.y > CANVAS_H
  return { ...b, pos, lifetime, active: lifetime > 0 && !oob }
}

function tickUfoBullet(b: UfoBulletState, dt: number): UfoBulletState {
  if (!b.active) return b
  const pos = { x: b.pos.x + b.vel.x * dt, y: b.pos.y + b.vel.y * dt }
  const oob = pos.x < 0 || pos.x > CANVAS_W || pos.y < 0 || pos.y > CANVAS_H
  return { ...b, pos, active: !oob }
}

function tickUfo(
  ufo: UfoState,
  ufoBullets: UfoBulletState[],
  shipPos: Vec2,
  inaccuracy: number,
  dt: number,
): { ufo: UfoState | null; ufoBullets: UfoBulletState[]; fired: boolean } {
  const pos = { x: ufo.pos.x + ufo.vel.x * dt, y: ufo.pos.y + ufo.vel.y * dt }

  const exited =
    (ufo.vel.x < 0 && pos.x < -UFO_RADIUS) ||
    (ufo.vel.x > 0 && pos.x > CANVAS_W + UFO_RADIUS)
  if (exited) return { ufo: null, ufoBullets, fired: false }

  let fireTimer = ufo.fireTimer - dt
  let nextBullets = ufoBullets
  let fired = false

  if (fireTimer <= 0) {
    fireTimer = UFO_FIRE_RATE
    const base   = Math.atan2(shipPos.y - pos.y, shipPos.x - pos.x)
    const spread = inaccuracy * UFO_MAX_SPREAD
    const angle  = base + (Math.random() - 0.5) * 2 * spread
    const freeIdx = ufoBullets.findIndex(b => !b.active)
    if (freeIdx >= 0) {
      nextBullets = [...ufoBullets]
      nextBullets[freeIdx] = {
        pos:    { ...pos },
        vel:    { x: Math.cos(angle) * UFO_BULLET_SPEED, y: Math.sin(angle) * UFO_BULLET_SPEED },
        active: true,
        radius: 4,
      }
      fired = true
    }
  }

  return { ufo: { ...ufo, pos, fireTimer, active: true }, ufoBullets: nextBullets, fired }
}

interface CollisionResult {
  ship:              ShipState | null
  asteroids:         AsteroidState[]
  bullets:           BulletState[]
  ufoBullets:        UfoBulletState[]
  ufo:               UfoState | null
  pickup:            PickupState | null
  activePowerUp:     { type: PickupType; remaining: number } | null
  carrierAsteroidIdx: number | null
  carrierPickupType: PickupType | null
  events:            GameEvent[]
}

function respondToCollisionsInState(
  pairs:             ReturnType<typeof detectCollisions>,
  ship:              ShipState | null,
  asteroids:         AsteroidState[],
  bullets:           BulletState[],
  activeBulletMap:   Array<{ idx: number }>,
  ufoBullets:        UfoBulletState[],
  activeUfoBulletMap:Array<{ idx: number }>,
  ufo:               UfoState | null,
  pickup:            PickupState | null,
  activePowerUp:     { type: PickupType; remaining: number } | null,
  carrierAsteroidIdx:number | null,
  carrierPickupType: PickupType | null,
): CollisionResult {
  const events: GameEvent[]   = []
  const deadBulletIdxs        = new Set<number>()
  const deadUfoBulletIdxs     = new Set<number>()
  const deadAsteroidIdxs      = new Set<number>()
  const fragments: AsteroidState[] = []
  let ufoKilled    = false
  let pickupGrabbed = false

  for (const pair of pairs) {
    switch (pair.kind) {
      case 'bulletHitsAsteroid': {
        const bulletFullIdx  = activeBulletMap[pair.bulletId].idx
        const ast            = asteroids[pair.asteroidId]
        deadBulletIdxs.add(bulletFullIdx)
        deadAsteroidIdxs.add(pair.asteroidId)
        events.push({ type: 'score', delta: ASTEROID_SCORE[ast.size] })
        events.push({ type: 'particleBurst', pos: { ...ast.pos }, color: COLOR_ACCENT, size: ast.size })
        events.push({ type: 'asteroidDestroyed', idx: pair.asteroidId })
        const cue: GameEvent & { type: 'audio' } = {
          type: 'audio',
          cue:  ast.size === 'large' ? 'explode_large' : ast.size === 'medium' ? 'explode_medium' : 'explode_small',
        }
        events.push(cue)
        if (ast.size !== 'small') {
          const next: AsteroidSize = ast.size === 'large' ? 'medium' : 'small'
          const r = ASTEROID_RADII[next]
          fragments.push(
            { pos: { ...ast.pos }, vel: { x:  ast.vel.y * 1.5 + (Math.random() - 0.5), y: -ast.vel.x * 1.5 + (Math.random() - 0.5) }, size: next, radius: r, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.02 },
            { pos: { ...ast.pos }, vel: { x: -ast.vel.y * 1.5 + (Math.random() - 0.5), y:  ast.vel.x * 1.5 + (Math.random() - 0.5) }, size: next, radius: r, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.02 },
          )
        }
        if (pair.asteroidId === carrierAsteroidIdx && carrierPickupType) {
          events.push({ type: 'spawnPickup', pickupType: carrierPickupType, pos: { ...ast.pos } })
          carrierAsteroidIdx = null
          carrierPickupType  = null
        }
        break
      }
      case 'bulletHitsUfo': {
        const bulletFullIdx = activeBulletMap[pair.bulletId].idx
        deadBulletIdxs.add(bulletFullIdx)
        ufoKilled = true
        events.push({ type: 'score', delta: UFO_SCORE })
        events.push({ type: 'audio', cue: 'explode_medium' })
        break
      }
      case 'ufoBulletHitsShip': {
        const ubFullIdx = activeUfoBulletMap[pair.bulletId].idx
        deadUfoBulletIdxs.add(ubFullIdx)
        if (activePowerUp?.type === 'Shield') {
          activePowerUp = null
          ship = ship ? { ...ship, invincible: INVINCIBILITY_FRAMES, powerUp: null } : null
        } else {
          events.push({ type: 'loseLife' })
          events.push({ type: 'screenShake' })
          ship = ship ? { ...ship, invincible: INVINCIBILITY_FRAMES, vel: { x: 0, y: 0 }, pos: { x: CANVAS_W / 2, y: CANVAS_H / 2 } } : null
        }
        events.push({ type: 'audio', cue: 'shipHit' })
        break
      }
      case 'asteroidHitsShip': {
        if (activePowerUp?.type === 'Shield') {
          activePowerUp = null
          ship = ship ? { ...ship, invincible: INVINCIBILITY_FRAMES, powerUp: null } : null
        } else {
          events.push({ type: 'loseLife' })
          events.push({ type: 'screenShake' })
          ship = ship ? { ...ship, invincible: INVINCIBILITY_FRAMES, vel: { x: 0, y: 0 }, pos: { x: CANVAS_W / 2, y: CANVAS_H / 2 } } : null
        }
        events.push({ type: 'audio', cue: 'shipHit' })
        break
      }
      case 'shipGrabsPickup': {
        if (pickup) {
          activePowerUp = { type: pickup.type, remaining: pickup.type === 'Shield' ? Infinity : PICKUP_DURATION }
          pickupGrabbed = true
          events.push({ type: 'audio', cue: 'pickupCollected' })
        }
        break
      }
    }
  }

  // Remove dead bullets / ufoBullets
  const nextBullets    = bullets.map((b, i) => deadBulletIdxs.has(i) ? { ...b, active: false } : b)
  const nextUfoBullets = ufoBullets.map((b, i) => deadUfoBulletIdxs.has(i) ? { ...b, active: false } : b)

  // Remove dead asteroids; adjust carrier index for any preceding removals
  const survivors: AsteroidState[] = []
  let carrierShift = 0
  asteroids.forEach((a, i) => {
    if (deadAsteroidIdxs.has(i)) {
      if (carrierAsteroidIdx !== null && i < carrierAsteroidIdx) carrierShift++
    } else {
      survivors.push(a)
    }
  })
  if (carrierAsteroidIdx !== null) carrierAsteroidIdx -= carrierShift
  const nextAsteroids = [...survivors, ...fragments]

  return {
    ship,
    asteroids:         nextAsteroids,
    bullets:           nextBullets,
    ufoBullets:        nextUfoBullets,
    ufo:               ufoKilled ? null : ufo,
    pickup:            pickupGrabbed ? null : pickup,
    activePowerUp,
    carrierAsteroidIdx,
    carrierPickupType,
    events,
  }
}

export function tickGameState(
  state: GameLoopState,
  input: InputSnapshot,
  dt: number,
): { newState: GameLoopState; events: GameEvent[] } {
  const events: GameEvent[] = []

  let ship = state.ship ? tickShip(state.ship, input, dt) : null

  const speedMult = speedForLevel(state.level) * dt
  let asteroids = state.asteroids.map(a => tickAsteroid(a, speedMult, dt))
  let bullets   = state.bullets.map(b => tickBullet(b, dt))

  let ufoBullets = state.ufoBullets.map(b => tickUfoBullet(b, dt))
  let ufo        = state.ufo

  if (ufo && ship) {
    const inaccuracy = 1 - ufoAccuracyForLevel(state.level)
    const result     = tickUfo(ufo, ufoBullets, ship.pos, inaccuracy, dt)
    ufo        = result.ufo
    ufoBullets = result.ufoBullets
    if (result.fired) events.push({ type: 'audio', cue: 'ufoShot' })
  }

  // ── collision detection + response ───────────────────────────────────────────
  let { pickup, activePowerUp, carrierAsteroidIdx, carrierPickupType } = state
  const preCollisionCount = asteroids.length

  if (state.phase === 'playing') {
    const activeBulletMap:    Array<{ idx: number }> = []
    const activeUfoBulletMap: Array<{ idx: number }> = []
    bullets.forEach((b, idx)    => { if (b.active) activeBulletMap.push({ idx }) })
    ufoBullets.forEach((b, idx) => { if (b.active) activeUfoBulletMap.push({ idx }) })

    const snapshot: CollisionSnapshot = {
      ship:       ship ? { pos: ship.pos, radius: 10, invincible: ship.invincible } : null,
      bullets:    activeBulletMap.map((entry, i)    => ({ pos: bullets[entry.idx].pos,    radius: bullets[entry.idx].radius,    id: i })),
      asteroids:  asteroids.map((a, i)               => ({ pos: a.pos,                    radius: a.radius,                     id: i })),
      ufoBullets: activeUfoBulletMap.map((entry, i) => ({ pos: ufoBullets[entry.idx].pos, radius: ufoBullets[entry.idx].radius, id: i })),
      ufo:        ufo    ? { pos: ufo.pos,    radius: ufo.radius }    : null,
      pickup:     pickup ? { pos: pickup.pos, radius: pickup.radius } : null,
    }

    const pairs = detectCollisions(snapshot)
    if (pairs.length > 0) {
      const cr = respondToCollisionsInState(
        pairs, ship, asteroids, bullets, activeBulletMap,
        ufoBullets, activeUfoBulletMap, ufo, pickup, activePowerUp,
        carrierAsteroidIdx, carrierPickupType,
      )
      ship              = cr.ship
      asteroids         = cr.asteroids
      bullets           = cr.bullets
      ufoBullets        = cr.ufoBullets
      ufo               = cr.ufo
      pickup            = cr.pickup
      activePowerUp     = cr.activePowerUp
      carrierAsteroidIdx = cr.carrierAsteroidIdx
      carrierPickupType = cr.carrierPickupType
      events.push(...cr.events)
    }
  }

  // ── power-up timer ───────────────────────────────────────────────────────────
  if (activePowerUp && activePowerUp.remaining !== Infinity) {
    const next = activePowerUp.remaining - dt
    activePowerUp = next <= 0 ? null : { ...activePowerUp, remaining: next }
  }

  // ── UFO scheduling ───────────────────────────────────────────────────────────
  let { level, phase } = state
  let transitionTimer  = state.transitionTimer
  let pendingUfoTimers = [...state.pendingUfoTimers]

  if (phase === 'playing') {
    for (let i = pendingUfoTimers.length - 1; i >= 0; i--) {
      pendingUfoTimers[i] -= dt
      if (pendingUfoTimers[i] <= 0 && !ufo) {
        pendingUfoTimers.splice(i, 1)
        const side: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right'
        ufo = {
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
  if (phase === 'playing' && preCollisionCount > 0 && asteroids.length === 0) {
    level             += 1
    phase              = 'transitioning'
    transitionTimer    = TRANSITION_FRAMES
    ufo                = null
    pickup             = null
    pendingUfoTimers   = []
    carrierAsteroidIdx = null
    carrierPickupType  = null
    ufoBullets         = ufoBullets.map(b => ({ ...b, active: false }))
    events.push({ type: 'nextLevel' })
    events.push({ type: 'setPhase', phase: 'transitioning' })
    events.push({ type: 'audio', cue: 'waveCleared' })
  }

  // ── level transition timer ───────────────────────────────────────────────────
  if (phase === 'transitioning' && transitionTimer > 0) {
    transitionTimer -= dt
    if (transitionTimer <= 0) {
      transitionTimer = 0
      const PICKUP_TYPES: PickupType[] = ['SpreadShot', 'RapidFire', 'Shield']
      const count = asteroidsForLevel(level)
      const newAsteroids: AsteroidState[] = []
      for (let i = 0; i < count; i++) {
        const x     = Math.random() < 0.5 ? -ASTEROID_RADII.large : CANVAS_W + ASTEROID_RADII.large
        const y     = Math.random() * CANVAS_H
        const speed = Math.random() * 0.8 + 0.4
        const angle = Math.random() * Math.PI * 2
        newAsteroids.push({
          pos:           { x, y },
          vel:           { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          size:          'large',
          radius:        ASTEROID_RADII.large,
          rotation:      0,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
        })
      }
      asteroids          = newAsteroids
      carrierAsteroidIdx = Math.floor(Math.random() * newAsteroids.length)
      carrierPickupType  = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)]
      const ufoCount     = ufoFrequencyForLevel(level)
      const waveLen      = asteroidsForLevel(level) * 300
      pendingUfoTimers   = Array.from({ length: ufoCount }, () => 60 + Math.floor(Math.random() * Math.max(1, waveLen - 60)))
      phase              = 'playing'
      events.push({ type: 'setPhase', phase: 'playing' })
    }
  }

  // ── bullet firing ─────────────────────────────────────────────────────────────
  let fireCooldown = Math.max(0, state.fireCooldown - dt)
  if (ship && phase === 'playing' && input.fire && state.fireCooldown <= 0) {
    const powerUpType = activePowerUp?.type ?? null
    const angles      = powerUpType === 'SpreadShot' ? spreadShotAngles(ship.rotation) : [ship.rotation]
    let didFire = false
    for (const angle of angles) {
      const slotIdx = bullets.findIndex(b => !b.active)
      if (slotIdx >= 0) {
        bullets = bullets.map((b, i) => i !== slotIdx ? b : {
          pos:      { ...ship.pos },
          vel:      { x: Math.cos(angle) * BULLET_SPEED, y: Math.sin(angle) * BULLET_SPEED },
          lifetime: BULLET_LIFETIME,
          active:   true,
          radius:   3,
        })
        didFire = true
      }
    }
    if (didFire) {
      fireCooldown = effectiveCooldown(fireCooldownForLevel(level), powerUpType)
      events.push({ type: 'audio', cue: 'shot' })
    }
  }

  return {
    newState: {
      ...state,
      ship, asteroids, bullets, ufoBullets, ufo,
      pickup, activePowerUp, carrierAsteroidIdx, carrierPickupType,
      level, phase, transitionTimer, pendingUfoTimers, fireCooldown,
    },
    events,
  }
}

export function makeInitialGameLoopState(): GameLoopState {
  return {
    ship: null,
    asteroids: [],
    bullets: [],
    ufoBullets: [],
    ufo: null,
    pickup: null,
    activePowerUp: null,
    pendingUfoTimers: [],
    fireCooldown: 0,
    carrierAsteroidIdx: null,
    carrierPickupType: null,
    level: 1,
    phase: 'playing',
    lives: 3,
    score: 0,
    transitionTimer: 0,
  }
}
