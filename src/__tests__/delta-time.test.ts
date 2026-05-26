import { vi, describe, it, expect } from 'vitest'

vi.mock('pixi.js', () => {
  const makeGfx = () => {
    const g: Record<string, unknown> = {
      x: 0, y: 0, alpha: 1, visible: false, rotation: 0,
      destroy: vi.fn(),
    }
    const chainable = ['circle', 'fill', 'moveTo', 'lineTo', 'poly',
      'stroke', 'closePath', 'clear']
    chainable.forEach(m => { g[m] = () => g })
    return g
  }
  return {
    Graphics: vi.fn(makeGfx),
    Container: vi.fn(),
  }
})

import { Bullet } from '../entities/Bullet'
import { Ship } from '../entities/Ship'
import { Asteroid } from '../entities/Asteroid'
import { BULLET_SPEED, BULLET_LIFETIME, SHIP_ROTATION_SPEED, INVINCIBILITY_FRAMES } from '../constants'

const mockStage = () => ({ addChild: vi.fn(), addChildAt: vi.fn() } as any)

// ── Bullet ───────────────────────────────────────────────────────────────────

describe('Bullet — dt normalization', () => {
  it('advances position proportionally to dt', () => {
    const b = new Bullet(mockStage())
    b.active = true
    b.init({ x: 100, y: 200 }, 0) // angle 0 → vel = {x: BULLET_SPEED, y: 0}
    b.update(1)
    expect(b.pos.x).toBeCloseTo(100 + BULLET_SPEED * 1)
    expect(b.pos.y).toBeCloseTo(200)
  })

  it('advances twice the distance when dt = 2', () => {
    const b = new Bullet(mockStage())
    b.active = true
    b.init({ x: 0, y: 0 }, 0)
    b.update(2)
    expect(b.pos.x).toBeCloseTo(BULLET_SPEED * 2)
  })

  it('decrements lifetime by dt each call', () => {
    const b = new Bullet(mockStage())
    b.active = true
    b.init({ x: 0, y: 0 }, 0)
    expect(b.lifetime).toBe(BULLET_LIFETIME)
    b.update(1)
    expect(b.lifetime).toBeCloseTo(BULLET_LIFETIME - 1)
    b.update(2)
    expect(b.lifetime).toBeCloseTo(BULLET_LIFETIME - 3)
  })

  it('deactivates once cumulative dt reaches BULLET_LIFETIME', () => {
    const b = new Bullet(mockStage())
    b.active = true
    // fire straight up so bullet stays on screen (y decreases toward 0 / wraps)
    b.init({ x: BULLET_SPEED * BULLET_LIFETIME / 2, y: 320 }, -Math.PI / 2)
    for (let i = 0; i < BULLET_LIFETIME; i++) b.update(1)
    expect(b.active).toBe(false)
  })
})

// ── Ship ─────────────────────────────────────────────────────────────────────

describe('Ship — dt normalization', () => {
  const noInput = { left: false, right: false, thrust: false, fire: false, pause: false, confirm: false }

  it('rotates by SHIP_ROTATION_SPEED * dt when turning left', () => {
    const s = new Ship(mockStage())
    const before = s.rotation
    s.update({ ...noInput, left: true }, 1)
    expect(s.rotation).toBeCloseTo(before - SHIP_ROTATION_SPEED * 1)
  })

  it('rotates twice as far when dt = 2', () => {
    const s = new Ship(mockStage())
    const before = s.rotation
    s.update({ ...noInput, left: true }, 2)
    expect(s.rotation).toBeCloseTo(before - SHIP_ROTATION_SPEED * 2)
  })

  it('invincibility expires to a negative value, never exactly 0, with fractional dt', () => {
    const s = new Ship(mockStage())
    s.hit()
    const dt = 1.016 // realistic 60 fps dt
    while (s.invincible > 0) s.update(noInput, dt)
    // skips past 0 — strict === 0 would never fire
    expect(s.invincible).toBeLessThan(0)
    expect(s.invincible).not.toBe(0)
  })

  it('decrements invincibility counter by dt each frame', () => {
    const s = new Ship(mockStage())
    s.hit() // sets invincible = INVINCIBILITY_FRAMES
    expect(s.invincible).toBe(INVINCIBILITY_FRAMES)
    s.update(noInput, 1)
    expect(s.invincible).toBeCloseTo(INVINCIBILITY_FRAMES - 1)
    s.update(noInput, 2)
    expect(s.invincible).toBeCloseTo(INVINCIBILITY_FRAMES - 3)
  })
})

// ── Asteroid ──────────────────────────────────────────────────────────────────

describe('Asteroid — dt normalization', () => {
  it('advances rotation by rotationSpeed * dt each frame', () => {
    const a = new Asteroid(mockStage(), 'large')
    ;(a as any).rotationSpeed = 0.05 // deterministic, above toBeCloseTo tolerance
    a.rotation = 0
    a.update(1, 1) // speedMult=1, dt=1
    expect(a.rotation).toBeCloseTo(0.05)
  })

  it('advances rotation twice as far when dt = 2', () => {
    const a = new Asteroid(mockStage(), 'large')
    ;(a as any).rotationSpeed = 0.05
    a.rotation = 0
    a.update(1, 2) // speedMult=1, dt=2
    expect(a.rotation).toBeCloseTo(0.10)
  })
})
