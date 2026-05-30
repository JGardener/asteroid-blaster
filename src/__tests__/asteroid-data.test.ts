import { describe, it, expect } from 'vitest'
import { AsteroidData } from '../entities/AsteroidData'
import { PickupData } from '../entities/PickupData'
import { ASTEROID_RADII, CANVAS_W, CANVAS_H } from '../constants'

describe('AsteroidData — update', () => {
  it('advances position by vel * speedMult', () => {
    const a = new AsteroidData('large', { x: 100, y: 200 }, { x: 2, y: -1 })

    a.update(1, 1)

    expect(a.pos.x).toBeCloseTo(102)
    expect(a.pos.y).toBeCloseTo(199)
  })

  it('applies world-wrap when crossing right edge', () => {
    const radius = ASTEROID_RADII.large
    const a = new AsteroidData('large', { x: CANVAS_W + radius - 1, y: 100 }, { x: 5, y: 0 }, 0)

    a.update(1, 1)

    expect(a.pos.x).toBeLessThan(0)
  })

  it('advances rotation by rotationSpeed * dt', () => {
    const a = new AsteroidData('large', { x: 100, y: 100 }, { x: 0, y: 0 }, 0.01)
    a.rotation = 0

    a.update(0, 2)

    expect(a.rotation).toBeCloseTo(0.02)
  })
})

describe('AsteroidData — split', () => {
  it('returns two children for large', () => {
    const a = new AsteroidData('large', { x: 200, y: 200 }, { x: 1, y: 0 })
    const children = a.split()
    expect(children).toHaveLength(2)
  })

  it('large children have size medium', () => {
    const a = new AsteroidData('large', { x: 200, y: 200 }, { x: 1, y: 0 })
    const children = a.split()
    expect(children[0].size).toBe('medium')
    expect(children[1].size).toBe('medium')
  })

  it('large children have medium radius', () => {
    const a = new AsteroidData('large', { x: 200, y: 200 }, { x: 1, y: 0 })
    const children = a.split()
    expect(children[0].radius).toBe(ASTEROID_RADII.medium)
    expect(children[1].radius).toBe(ASTEROID_RADII.medium)
  })

  it('returns two children for medium with size small', () => {
    const a = new AsteroidData('medium', { x: 200, y: 200 }, { x: 1, y: 0 })
    const children = a.split()
    expect(children).toHaveLength(2)
    expect(children[0].size).toBe('small')
  })

  it('returns empty array for small', () => {
    const a = new AsteroidData('small', { x: 200, y: 200 }, { x: 1, y: 0 })
    expect(a.split()).toHaveLength(0)
  })
})

describe('PickupData — update', () => {
  it('advances position by vel * dt', () => {
    const p = new PickupData({ x: 100, y: 200 }, 'Shield')
    p.vel = { x: 2, y: -1 }

    p.update(1)

    expect(p.pos.x).toBeCloseTo(102)
    expect(p.pos.y).toBeCloseTo(199)
  })

  it('applies world-wrap when crossing bottom edge', () => {
    const p = new PickupData({ x: 100, y: 100 }, 'RapidFire')
    p.pos = { x: 100, y: CANVAS_H + p.radius - 1 }
    p.vel = { x: 0, y: 5 }

    p.update(1)

    expect(p.pos.y).toBeLessThan(0)
  })
})
