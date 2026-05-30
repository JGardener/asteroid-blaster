import { describe, it, expect } from 'vitest'
import { tickGameState, makeInitialGameLoopState } from '../tickGameState'
import type { GameLoopState, AsteroidState } from '../tickGameState'
import type { InputSnapshot } from '../input'
import {
  SHIP_THRUST, SHIP_ROTATION_SPEED, SHIP_MAX_SPEED, SHIP_DRAG,
  CANVAS_W, CANVAS_H, BULLET_LIFETIME, UFO_FIRE_RATE, UFO_RADIUS,
} from '../constants'

const noInput: InputSnapshot = {
  thrust: false, fire: false, left: false, right: false, pause: false, confirm: false,
}

const baseShip = (): GameLoopState['ship'] => ({
  pos: { x: 480, y: 320 }, vel: { x: 0, y: 0 },
  rotation: 0, invincible: 0, thrustOn: false, powerUp: null,
  powerUpRemaining: 0, fireCooldown: 0,
})

const baseBullet = (overrides: Partial<NonNullable<GameLoopState['bullets'][number]>> = {}): GameLoopState['bullets'][number] => ({
  pos: { x: 100, y: 100 }, vel: { x: 10, y: 0 },
  lifetime: BULLET_LIFETIME, active: true, radius: 3,
  ...overrides,
})

const baseUfoBullet = (overrides: Partial<NonNullable<GameLoopState['ufoBullets'][number]>> = {}): GameLoopState['ufoBullets'][number] => ({
  pos: { x: 100, y: 100 }, vel: { x: 4, y: 0 },
  active: true, radius: 4,
  ...overrides,
})

const emptyState = (): GameLoopState => ({
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
})

const baseAsteroid = (overrides: Partial<AsteroidState> = {}): AsteroidState => ({
  pos: { x: 100, y: 100 }, vel: { x: 0, y: 0 },
  size: 'large', radius: 48,
  rotation: 0, rotationSpeed: 0,
  ...overrides,
})

// ── #17 stub ──────────────────────────────────────────────────────────────────

describe('tickGameState stub', () => {
  it('returns state unchanged and empty events', () => {
    const state = emptyState()
    const { newState, events } = tickGameState(state, noInput, 1)
    expect(newState).toEqual(state)
    expect(events).toEqual([])
  })
})

// ── #18 ship physics ──────────────────────────────────────────────────────────

describe('tickGameState — ship physics', () => {
  it('thrust increases velocity in the direction of rotation', () => {
    const state = { ...emptyState(), ship: { ...baseShip()!, rotation: 0 } }
    const { newState } = tickGameState(state, { ...noInput, thrust: true }, 1)
    expect(newState.ship!.vel.x).toBeCloseTo(SHIP_THRUST)
    expect(newState.ship!.vel.y).toBeCloseTo(0, 5)
  })

  it('left input rotates ship counter-clockwise', () => {
    const state = { ...emptyState(), ship: { ...baseShip()!, rotation: 0 } }
    const { newState } = tickGameState(state, { ...noInput, left: true }, 1)
    expect(newState.ship!.rotation).toBeCloseTo(-SHIP_ROTATION_SPEED)
  })

  it('right input rotates ship clockwise', () => {
    const state = { ...emptyState(), ship: { ...baseShip()!, rotation: 0 } }
    const { newState } = tickGameState(state, { ...noInput, right: true }, 1)
    expect(newState.ship!.rotation).toBeCloseTo(SHIP_ROTATION_SPEED)
  })

  it('drag is applied each frame', () => {
    const state = { ...emptyState(), ship: { ...baseShip()!, vel: { x: 1, y: 0 } } }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ship!.vel.x).toBeCloseTo(Math.pow(SHIP_DRAG, 1))
  })

  it('velocity is capped at SHIP_MAX_SPEED', () => {
    const state = { ...emptyState(), ship: { ...baseShip()!, vel: { x: SHIP_MAX_SPEED, y: 0 } } }
    const { newState } = tickGameState(state, { ...noInput, thrust: true }, 1)
    const speed = Math.hypot(newState.ship!.vel.x, newState.ship!.vel.y)
    expect(speed).toBeLessThanOrEqual(SHIP_MAX_SPEED + 0.001)
  })

  it('position advances by velocity * dt', () => {
    const state = { ...emptyState(), ship: { ...baseShip()!, pos: { x: 100, y: 100 }, vel: { x: 2, y: 3 } } }
    const { newState } = tickGameState(state, noInput, 1)
    // Drag is applied before pos update; approximate check
    expect(newState.ship!.pos.x).toBeGreaterThan(100)
    expect(newState.ship!.pos.y).toBeGreaterThan(100)
  })

  it('wraps x < 0 to the right edge', () => {
    const state = { ...emptyState(), ship: { ...baseShip()!, pos: { x: -1, y: 320 }, vel: { x: 0, y: 0 } } }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ship!.pos.x).toBeCloseTo(CANVAS_W - 1)
  })

  it('wraps y > CANVAS_H to the top edge', () => {
    const state = { ...emptyState(), ship: { ...baseShip()!, pos: { x: 480, y: CANVAS_H + 1 }, vel: { x: 0, y: 0 } } }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ship!.pos.y).toBeCloseTo(1)
  })
})

// ── #18 asteroid movement ─────────────────────────────────────────────────────

describe('tickGameState — asteroid movement', () => {
  it('position advances by vel * speedMult', () => {
    const ast = { pos: { x: 100, y: 100 }, vel: { x: 1, y: 0 }, size: 'large' as const, radius: 48, rotation: 0, rotationSpeed: 0 }
    const state = { ...emptyState(), asteroids: [ast], level: 1 }
    const { newState } = tickGameState(state, noInput, 1)
    // speedForLevel(1) = 1.0, dt = 1 → speedMult = 1
    expect(newState.asteroids[0].pos.x).toBeCloseTo(101)
  })

  it('wraps x > CANVAS_W + radius to left off-screen edge', () => {
    const ast = { pos: { x: CANVAS_W + 49, y: 100 }, vel: { x: 0, y: 0 }, size: 'large' as const, radius: 48, rotation: 0, rotationSpeed: 0 }
    const state = { ...emptyState(), asteroids: [ast] }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.asteroids[0].pos.x).toBeLessThan(0)
  })
})

// ── #18 bullet lifetime ───────────────────────────────────────────────────────

describe('tickGameState — bullet lifetime', () => {
  it('active bullet lifetime decrements by dt', () => {
    const state = { ...emptyState(), bullets: [baseBullet()] }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.bullets[0].lifetime).toBeCloseTo(BULLET_LIFETIME - 1)
  })

  it('bullet becomes inactive when lifetime reaches 0', () => {
    const state = { ...emptyState(), bullets: [baseBullet({ lifetime: 0.5 })] }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.bullets[0].active).toBe(false)
  })

  it('bullet becomes inactive when out of bounds', () => {
    const state = { ...emptyState(), bullets: [baseBullet({ pos: { x: CANVAS_W + 1, y: 100 } })] }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.bullets[0].active).toBe(false)
  })

  it('inactive bullet slot is not updated', () => {
    const state = { ...emptyState(), bullets: [baseBullet({ active: false, lifetime: BULLET_LIFETIME })] }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.bullets[0].lifetime).toBe(BULLET_LIFETIME)
  })
})

// ── #18 UFO bullet movement ───────────────────────────────────────────────────

describe('tickGameState — UFO bullet movement', () => {
  it('active UFO bullet position advances by velocity', () => {
    const state = { ...emptyState(), ufoBullets: [baseUfoBullet()] }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ufoBullets[0].pos.x).toBeCloseTo(104)
  })

  it('UFO bullet becomes inactive when out of bounds', () => {
    const state = { ...emptyState(), ufoBullets: [baseUfoBullet({ pos: { x: CANVAS_W + 1, y: 100 } })] }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ufoBullets[0].active).toBe(false)
  })
})

// ── #18 UFO movement ──────────────────────────────────────────────────────────

describe('tickGameState — UFO movement', () => {
  const baseUfo = (): GameLoopState['ufo'] => ({
    pos: { x: 200, y: 200 }, vel: { x: 1.5, y: 0 },
    fireTimer: UFO_FIRE_RATE, active: true, radius: 18,
  })

  it('UFO position advances each frame', () => {
    const state = { ...emptyState(), ufo: baseUfo(), ship: baseShip() }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ufo!.pos.x).toBeCloseTo(201.5)
  })

  it('UFO fire timer decrements each frame', () => {
    const state = { ...emptyState(), ufo: baseUfo(), ship: baseShip() }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ufo!.fireTimer).toBeCloseTo(UFO_FIRE_RATE - 1)
  })

  it('UFO adds an active UFO bullet slot when fire timer expires', () => {
    const ufo = { ...baseUfo()!, fireTimer: 0.5 }
    const slots = Array.from({ length: 8 }, () => baseUfoBullet({ active: false }))
    const state = { ...emptyState(), ufo, ship: baseShip(), ufoBullets: slots }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ufoBullets.some(b => b.active)).toBe(true)
  })

  it('UFO goes inactive when it exits the right edge', () => {
    const ufo = { ...baseUfo()!, pos: { x: CANVAS_W + UFO_RADIUS + 1, y: 200 }, vel: { x: 1.5, y: 0 } }
    const state = { ...emptyState(), ufo, ship: baseShip() }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ufo).toBeNull()
  })
})

// ── #19 collision response ────────────────────────────────────────────────────

describe('tickGameState — collision response', () => {
  it('bullet hitting asteroid emits score and particleBurst events', () => {
    const state = {
      ...emptyState(),
      asteroids: [baseAsteroid()],
      bullets:   [baseBullet({ pos: { x: 100, y: 100 } })],
    }
    const { events } = tickGameState(state, noInput, 0)
    expect(events.some(e => e.type === 'score')).toBe(true)
    expect(events.some(e => e.type === 'particleBurst')).toBe(true)
  })

  it('bullet hitting carrier asteroid emits spawnPickup event', () => {
    const state = {
      ...emptyState(),
      asteroids:         [baseAsteroid()],
      bullets:           [baseBullet({ pos: { x: 100, y: 100 } })],
      carrierAsteroidIdx: 0,
      carrierPickupType:  'SpreadShot' as const,
    }
    const { events } = tickGameState(state, noInput, 0)
    expect(events.some(e => e.type === 'spawnPickup')).toBe(true)
  })

  it('bullet hitting non-carrier asteroid does not emit spawnPickup', () => {
    const state = {
      ...emptyState(),
      asteroids:         [baseAsteroid(), baseAsteroid({ pos: { x: 500, y: 500 } })],
      bullets:           [baseBullet({ pos: { x: 100, y: 100 } })],
      carrierAsteroidIdx: 1,
      carrierPickupType:  'RapidFire' as const,
    }
    const { events } = tickGameState(state, noInput, 0)
    expect(events.some(e => e.type === 'spawnPickup')).toBe(false)
  })

  it('asteroid overlapping ship with no shield emits loseLife event', () => {
    const state = {
      ...emptyState(),
      ship:      { ...baseShip()!, pos: { x: 100, y: 100 }, invincible: 0 },
      asteroids: [baseAsteroid()],
    }
    const { events } = tickGameState(state, noInput, 0)
    expect(events.some(e => e.type === 'loseLife')).toBe(true)
  })

  it('asteroid hitting ship with Shield absorbs hit — no loseLife, Shield cleared', () => {
    const state = {
      ...emptyState(),
      ship:      { ...baseShip()!, pos: { x: 100, y: 100 }, invincible: 0, powerUp: 'Shield' as const, powerUpRemaining: Infinity },
      asteroids: [baseAsteroid()],
    }
    const { newState, events } = tickGameState(state, noInput, 0)
    expect(events.some(e => e.type === 'loseLife')).toBe(false)
    expect(newState.ship!.powerUp).toBeNull()
  })
})

// ── #19 wave clear ────────────────────────────────────────────────────────────

describe('tickGameState — wave clear', () => {
  it('destroying the last asteroid emits setPhase transitioning event', () => {
    const state = {
      ...emptyState(),
      phase:     'playing' as const,
      asteroids: [baseAsteroid({ size: 'small', radius: 13 })],
      bullets:   [baseBullet({ pos: { x: 100, y: 100 } })],
    }
    const { events } = tickGameState(state, noInput, 0)
    expect(events.some(e => e.type === 'setPhase' && (e as { phase: string }).phase === 'transitioning')).toBe(true)
  })
})

// ── #19 power-up timer ────────────────────────────────────────────────────────

describe('tickGameState — power-up timer', () => {
  it('SpreadShot timer expiring clears powerUp on ship in newState', () => {
    const state = {
      ...emptyState(),
      ship: { ...baseShip()!, powerUp: 'SpreadShot' as const, powerUpRemaining: 0.5 },
    }
    const { newState } = tickGameState(state, noInput, 1)
    expect(newState.ship!.powerUp).toBeNull()
  })
})

// ── #19 makeInitialGameLoopState ──────────────────────────────────────────────

describe('makeInitialGameLoopState', () => {
  it('produces clean state with no residual powerUp, ufo, or pickup', () => {
    const state = makeInitialGameLoopState()
    expect(state.ship).toBeNull()
    expect(state.ufo).toBeNull()
    expect(state.pickup).toBeNull()
  })
})

// ── #19 bullet firing ─────────────────────────────────────────────────────────

const inactiveBullets = (count: number): GameLoopState['bullets'] =>
  Array.from({ length: count }, () => ({
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, lifetime: 0, active: false, radius: 3,
  }))

const fireInput: InputSnapshot = { ...noInput, fire: true }

describe('tickGameState — bullet firing', () => {
  it('fire with cooldown ready activates one bullet slot', () => {
    const state = { ...emptyState(), ship: baseShip(), bullets: inactiveBullets(5) }
    const { newState } = tickGameState(state, fireInput, 1)
    expect(newState.bullets.filter(b => b.active)).toHaveLength(1)
  })

  it('fired bullet starts at ship position', () => {
    const ship = { ...baseShip()!, pos: { x: 300, y: 200 } }
    const state = { ...emptyState(), ship, bullets: inactiveBullets(5) }
    const { newState } = tickGameState(state, fireInput, 1)
    const fired = newState.bullets.find(b => b.active)!
    expect(fired.pos.x).toBeCloseTo(300)
    expect(fired.pos.y).toBeCloseTo(200)
  })

  it('sets fireCooldown > 0 on ship in newState after firing', () => {
    const state = { ...emptyState(), ship: baseShip(), bullets: inactiveBullets(5) }
    const { newState } = tickGameState(state, fireInput, 1)
    expect(newState.ship!.fireCooldown).toBeGreaterThan(0)
  })

  it('does not fire when ship fireCooldown > 0', () => {
    const state = { ...emptyState(), ship: { ...baseShip()!, fireCooldown: 5 }, bullets: inactiveBullets(5) }
    const { newState } = tickGameState(state, fireInput, 1)
    expect(newState.bullets.every(b => !b.active)).toBe(true)
  })

  it('emits audio shot cue when firing', () => {
    const state = { ...emptyState(), ship: baseShip(), bullets: inactiveBullets(5) }
    const { events } = tickGameState(state, fireInput, 1)
    expect(events.some(e => e.type === 'audio' && (e as { cue: string }).cue === 'shot')).toBe(true)
  })

  it('SpreadShot activates 3 bullet slots', () => {
    const state = {
      ...emptyState(),
      ship:    { ...baseShip()!, powerUp: 'SpreadShot' as const, powerUpRemaining: 5 },
      bullets: inactiveBullets(5),
    }
    const { newState } = tickGameState(state, fireInput, 1)
    expect(newState.bullets.filter(b => b.active)).toHaveLength(3)
  })
})
