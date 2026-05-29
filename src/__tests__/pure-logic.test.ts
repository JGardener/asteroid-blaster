import { describe, it, expect } from 'vitest'
import { circlesOverlap, wrapPosition } from '../collision'
import { CANVAS_W, CANVAS_H } from '../constants'
import {
  asteroidsForLevel, speedForLevel, fireCooldownForLevel,
} from '../progression'
import { ObjectPool } from '../ObjectPool'
import {
  BASE_ASTEROID_COUNT, SPEED_MULTIPLIER_CAP, FIRE_COOLDOWN,
} from '../constants'

// ── wrapPosition ─────────────────────────────────────────────────────────────

describe('wrapPosition', () => {
  it('wraps x < -radius to the right off-screen edge', () => {
    const result = wrapPosition({ x: -15, y: 320 }, 14)
    expect(result.x).toBe(-15 + CANVAS_W + 14 * 2)
    expect(result.y).toBe(320)
  })

  it('wraps x > CANVAS_W + radius to the left off-screen edge', () => {
    const result = wrapPosition({ x: 975, y: 320 }, 14)
    expect(result.x).toBe(975 - CANVAS_W - 14 * 2)
    expect(result.y).toBe(320)
  })

  it('wraps y < -radius to the bottom off-screen edge', () => {
    const result = wrapPosition({ x: 480, y: -15 }, 14)
    expect(result.x).toBe(480)
    expect(result.y).toBe(-15 + CANVAS_H + 14 * 2)
  })

  it('wraps y > CANVAS_H + radius to the top off-screen edge', () => {
    const result = wrapPosition({ x: 480, y: 655 }, 14)
    expect(result.x).toBe(480)
    expect(result.y).toBe(655 - CANVAS_H - 14 * 2)
  })

  it('returns mid-canvas position unchanged', () => {
    const result = wrapPosition({ x: 480, y: 320 }, 14)
    expect(result).toEqual({ x: 480, y: 320 })
  })
})

// ── circlesOverlap ────────────────────────────────────────────────────────────

describe('circlesOverlap', () => {
  it('returns true for clearly overlapping circles', () => {
    expect(circlesOverlap({ x: 0, y: 0 }, 10, { x: 5, y: 0 }, 10)).toBe(true)
  })

  it('returns false for touching circles (distance equals sum of radii)', () => {
    // Strict < means touching is NOT overlapping
    expect(circlesOverlap({ x: 0, y: 0 }, 10, { x: 20, y: 0 }, 10)).toBe(false)
  })

  it('returns false for separated circles', () => {
    expect(circlesOverlap({ x: 0, y: 0 }, 5, { x: 100, y: 0 }, 5)).toBe(false)
  })

  it('returns true for a zero-radius point inside another circle', () => {
    expect(circlesOverlap({ x: 5, y: 5 }, 0, { x: 0, y: 0 }, 10)).toBe(true)
  })

  it('returns true for circles at identical positions', () => {
    expect(circlesOverlap({ x: 50, y: 50 }, 1, { x: 50, y: 50 }, 1)).toBe(true)
  })
})

// ── progression ───────────────────────────────────────────────────────────────

describe('asteroidsForLevel', () => {
  it('returns BASE_ASTEROID_COUNT at level 1', () => {
    expect(asteroidsForLevel(1)).toBe(BASE_ASTEROID_COUNT)
  })

  it('increases by 1 per level', () => {
    expect(asteroidsForLevel(2)).toBe(BASE_ASTEROID_COUNT + 1)
  })
})

describe('speedForLevel', () => {
  it('returns 1.0 at level 1', () => {
    expect(speedForLevel(1)).toBe(1.0)
  })

  it('increases by 0.05 per level', () => {
    expect(speedForLevel(2)).toBeCloseTo(1.05)
  })

  it('is capped at SPEED_MULTIPLIER_CAP regardless of level', () => {
    // Level 21 reaches the cap exactly; level 100 must not exceed it
    expect(speedForLevel(21)).toBe(SPEED_MULTIPLIER_CAP)
    expect(speedForLevel(100)).toBe(SPEED_MULTIPLIER_CAP)
  })
})

describe('fireCooldownForLevel', () => {
  it('returns FIRE_COOLDOWN at level 1', () => {
    expect(fireCooldownForLevel(1)).toBe(FIRE_COOLDOWN)
  })

  it('reaches the floor of 8 at level 4', () => {
    // FIRE_COOLDOWN(14) - (4-1)*2 = 8
    expect(fireCooldownForLevel(4)).toBe(8)
  })

  it('holds at the floor of 8 beyond level 4', () => {
    expect(fireCooldownForLevel(10)).toBe(8)
    expect(fireCooldownForLevel(50)).toBe(8)
  })
})

// ── ObjectPool ────────────────────────────────────────────────────────────────

describe('ObjectPool', () => {
  const makePool = (size = 3) =>
    new ObjectPool(() => ({ active: false, value: 0 }), size)

  it('acquire returns an active item', () => {
    const pool = makePool()
    const item = pool.acquire()
    expect(item).not.toBeNull()
    expect(item!.active).toBe(true)
  })

  it('release deactivates the item', () => {
    const pool = makePool()
    const item = pool.acquire()!
    pool.release(item)
    expect(item.active).toBe(false)
  })

  it('a released item can be re-acquired', () => {
    const pool = makePool(1)
    const first = pool.acquire()!
    pool.release(first)
    const second = pool.acquire()
    expect(second).toBe(first)
    expect(second!.active).toBe(true)
  })

  it('forEach only visits active items', () => {
    const pool = makePool(3)
    const a = pool.acquire()!
    pool.acquire()
    pool.release(a)
    // only the second acquired item should still be active
    const visited: unknown[] = []
    pool.forEach(item => visited.push(item))
    expect(visited).toHaveLength(1)
  })

  it('returns null when pool is exhausted', () => {
    const pool = makePool(2)
    pool.acquire()
    pool.acquire()
    expect(pool.acquire()).toBeNull()
  })
})
