import { vi, describe, it, expect } from 'vitest'
import { ufoFrequencyForLevel, ufoAccuracyForLevel } from '../progression'
import { CANVAS_W } from '../constants'

vi.mock('pixi.js', () => {
  const makeGfx = () => {
    const g: Record<string, unknown> = {
      x: 0, y: 0, alpha: 1, visible: true, rotation: 0,
      destroy: vi.fn(),
    }
    const chainable = ['circle', 'fill', 'moveTo', 'lineTo', 'poly', 'rect',
      'stroke', 'closePath', 'clear', 'arc', 'ellipse', 'beginPath']
    chainable.forEach(m => { g[m] = () => g })
    return g
  }
  return {
    Graphics: vi.fn(makeGfx),
    Container: vi.fn(),
  }
})

import { Ufo } from '../entities/Ufo'

const mockStage = () => ({ addChild: vi.fn() } as any)

// ── ufoFrequencyForLevel ──────────────────────────────────────────────────────

describe('ufoFrequencyForLevel', () => {
  it('returns 0 on levels 1 and 2', () => {
    expect(ufoFrequencyForLevel(1)).toBe(0)
    expect(ufoFrequencyForLevel(2)).toBe(0)
  })

  it('returns 1 on levels 3 and 4', () => {
    expect(ufoFrequencyForLevel(3)).toBe(1)
    expect(ufoFrequencyForLevel(4)).toBe(1)
  })

  it('returns 2 on level 5 and beyond', () => {
    expect(ufoFrequencyForLevel(5)).toBe(2)
    expect(ufoFrequencyForLevel(20)).toBe(2)
  })
})

// ── ufoAccuracyForLevel ───────────────────────────────────────────────────────

describe('ufoAccuracyForLevel', () => {
  it('returns approximately 0.3 at level 3', () => {
    expect(ufoAccuracyForLevel(3)).toBeCloseTo(0.3)
  })

  it('returns approximately 0.85 at level 7', () => {
    expect(ufoAccuracyForLevel(7)).toBeCloseTo(0.85)
  })

  it('is capped at 0.85 beyond level 7', () => {
    expect(ufoAccuracyForLevel(10)).toBe(0.85)
    expect(ufoAccuracyForLevel(50)).toBe(0.85)
  })

  it('increases with level between 3 and 7', () => {
    expect(ufoAccuracyForLevel(5)).toBeGreaterThan(ufoAccuracyForLevel(3))
    expect(ufoAccuracyForLevel(7)).toBeGreaterThan(ufoAccuracyForLevel(5))
  })
})

// ── Ufo entity ────────────────────────────────────────────────────────────────

describe("Ufo entering from 'left'", () => {
  it('starts at or before the left edge', () => {
    const ufo = new Ufo(mockStage(), 'left')
    expect(ufo.pos.x).toBeLessThanOrEqual(0)
  })

  it('has a rightward (positive) x velocity', () => {
    const ufo = new Ufo(mockStage(), 'left')
    expect(ufo.vel.x).toBeGreaterThan(0)
  })
})

describe("Ufo entering from 'right'", () => {
  it('starts at or beyond the right edge', () => {
    const ufo = new Ufo(mockStage(), 'right')
    expect(ufo.pos.x).toBeGreaterThanOrEqual(CANVAS_W)
  })

  it('has a leftward (negative) x velocity', () => {
    const ufo = new Ufo(mockStage(), 'right')
    expect(ufo.vel.x).toBeLessThan(0)
  })
})

describe('Ufo movement', () => {
  it('pos.x changes after update()', () => {
    const ufo = new Ufo(mockStage(), 'left')
    const before = ufo.pos.x
    ufo.update({ x: 480, y: 320 }, 0, 1)
    expect(ufo.pos.x).not.toBe(before)
  })

  it('becomes inactive once it exits off the opposite edge', () => {
    const ufo = new Ufo(mockStage(), 'left')
    for (let i = 0; i < 2000; i++) ufo.update({ x: 480, y: 320 }, 0, 1)
    expect(ufo.active).toBe(false)
  })
})

describe('Ufo firing', () => {
  it('returns null before the fire interval elapses', () => {
    const ufo = new Ufo(mockStage(), 'left')
    // First tick: fire timer is full, has not elapsed yet
    expect(ufo.update({ x: 480, y: 320 }, 0, 1)).toBeNull()
  })

  it('returns a number (angle) once the fire interval elapses', () => {
    const ufo = new Ufo(mockStage(), 'left')
    let fired: number | null = null
    for (let i = 0; i < 200 && fired === null; i++) {
      fired = ufo.update({ x: 480, y: 320 }, 0, 1)
    }
    expect(fired).not.toBeNull()
    expect(typeof fired).toBe('number')
  })

  it('with inaccuracy 0, fire angle points exactly at ship', () => {
    const ufo = new Ufo(mockStage(), 'left')
    // Pin UFO position so we can compute expected angle deterministically
    ufo.pos = { x: 0, y: 320 }
    const ship = { x: 480, y: 320 }
    const expected = Math.atan2(ship.y - ufo.pos.y, ship.x - ufo.pos.x) // 0 rad (pointing right)

    let fired: number | null = null
    for (let i = 0; i < 200 && fired === null; i++) {
      fired = ufo.update(ship, 0, 1)
    }
    expect(fired).not.toBeNull()
    expect(fired!).toBeCloseTo(expected, 10)
  })
})
