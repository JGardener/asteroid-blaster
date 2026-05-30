import type { Vec2, AsteroidSize, GamePhase } from './types'
import type { InputSnapshot } from './input'
import type { PickupType } from './powerup'
import {
  SHIP_THRUST, SHIP_ROTATION_SPEED, SHIP_MAX_SPEED, SHIP_DRAG,
  CANVAS_W, CANVAS_H,
  BULLET_SPEED, BULLET_LIFETIME,
  UFO_FIRE_RATE, UFO_MAX_SPREAD, UFO_BULLET_SPEED, UFO_RADIUS,
} from './constants'
import { wrapPosition } from './collision'
import { speedForLevel, ufoAccuracyForLevel } from './progression'

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
  | { type: 'score';        delta: number }
  | { type: 'loseLife' }
  | { type: 'nextLevel' }
  | { type: 'setPhase';     phase: GamePhase }
  | { type: 'spawnPickup';  pickupType: PickupType; pos: Vec2 }
  | { type: 'particleBurst'; pos: Vec2; color: string }
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

export function tickGameState(
  state: GameLoopState,
  input: InputSnapshot,
  dt: number,
): { newState: GameLoopState; events: GameEvent[] } {
  const events: GameEvent[] = []

  const ship = state.ship ? tickShip(state.ship, input, dt) : null

  const speedMult = speedForLevel(state.level) * dt
  const asteroids = state.asteroids.map(a => tickAsteroid(a, speedMult, dt))
  const bullets   = state.bullets.map(b => tickBullet(b, dt))

  let ufoBullets = state.ufoBullets.map(b => tickUfoBullet(b, dt))
  let ufo        = state.ufo

  if (ufo && ship) {
    const inaccuracy = 1 - ufoAccuracyForLevel(state.level)
    const result     = tickUfo(ufo, ufoBullets, ship.pos, inaccuracy, dt)
    ufo        = result.ufo
    ufoBullets = result.ufoBullets
    if (result.fired) events.push({ type: 'audio', cue: 'ufoShot' })
  }

  return {
    newState: { ...state, ship, asteroids, bullets, ufoBullets, ufo },
    events,
  }
}
