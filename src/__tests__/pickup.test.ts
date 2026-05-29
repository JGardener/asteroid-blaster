import { vi, describe, it, expect } from 'vitest'
import { spreadShotAngles, effectiveCooldown, tickPowerUp } from '../powerup'

vi.mock('pixi.js', () => {
  const makeGfx = () => {
    const g: Record<string, unknown> = {
      x: 0, y: 0, alpha: 1, visible: true, rotation: 0,
      destroy: vi.fn(),
    }
    const chainable = ['circle', 'fill', 'moveTo', 'lineTo', 'poly', 'rect',
      'stroke', 'closePath', 'clear', 'arc']
    chainable.forEach(m => { g[m] = () => g })
    return g
  }
  return {
    Graphics: vi.fn(makeGfx),
    Container: vi.fn(),
  }
})

import { Pickup } from '../entities/Pickup'
const mockStage = () => ({ addChild: vi.fn(), addChildAt: vi.fn() } as any)

const SPREAD_RAD = 15 * (Math.PI / 180) // 15° in radians ≈ 0.2618

describe('spreadShotAngles', () => {
  it('returns 3 angles for a base angle of 0', () => {
    const angles = spreadShotAngles(0)
    expect(angles).toHaveLength(3)
    expect(angles[0]).toBeCloseTo(-SPREAD_RAD)
    expect(angles[1]).toBeCloseTo(0)
    expect(angles[2]).toBeCloseTo(SPREAD_RAD)
  })
})

describe('effectiveCooldown', () => {
  it('halves the cooldown when RapidFire is active', () => {
    expect(effectiveCooldown(14, 'RapidFire')).toBe(7)
  })

  it('floors at 4 when halving an already-minimum base cooldown', () => {
    expect(effectiveCooldown(8, 'RapidFire')).toBe(4)
  })

  it('returns base unchanged when no power-up is active', () => {
    expect(effectiveCooldown(14, null)).toBe(14)
  })
})

describe('tickPowerUp', () => {
  it('decrements remaining by dt', () => {
    expect(tickPowerUp(600, 1)).toBeCloseTo(599)
  })

  it('returns a negative value when remaining is less than dt (expired)', () => {
    expect(tickPowerUp(1, 2)).toBeCloseTo(-1)
  })
})

describe('Pickup entity — drift', () => {
  it('changes pos after update (drifts)', () => {
    const p = new Pickup(mockStage(), { x: 100, y: 200 }, 'SpreadShot')
    const before = { ...p.pos }
    p.update(1)
    expect(p.pos.x !== before.x || p.pos.y !== before.y).toBe(true)
  })

  it('wraps from left edge to right edge', () => {
    const p = new Pickup(mockStage(), { x: 0, y: 320 }, 'Shield')
    p.vel = { x: -1, y: 0 }
    // Move far enough past the left boundary
    for (let i = 0; i < 20; i++) p.update(1)
    expect(p.pos.x).toBeGreaterThan(900)
  })
})
