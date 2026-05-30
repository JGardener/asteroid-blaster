import { describe, it, expect } from 'vitest'
import { BulletData } from '../entities/BulletData'
import { UfoBulletData } from '../entities/UfoBulletData'
import { CANVAS_W, CANVAS_H, BULLET_LIFETIME } from '../constants'

describe('BulletData — update', () => {
  it('advances position by vel * dt', () => {
    const b = new BulletData()
    b.active = true
    b.pos    = { x: 100, y: 200 }
    b.vel    = { x: 10, y: -5 }
    b.lifetime = BULLET_LIFETIME

    b.update(1)

    expect(b.pos.x).toBeCloseTo(110)
    expect(b.pos.y).toBeCloseTo(195)
  })

  it('decrements lifetime by dt', () => {
    const b = new BulletData()
    b.active   = true
    b.pos      = { x: 100, y: 100 }
    b.vel      = { x: 0, y: 0 }
    b.lifetime = 30

    b.update(5)

    expect(b.lifetime).toBeCloseTo(25)
  })

  it('deactivates when lifetime expires', () => {
    const b = new BulletData()
    b.active   = true
    b.pos      = { x: 100, y: 100 }
    b.vel      = { x: 0, y: 0 }
    b.lifetime = 1

    b.update(2)

    expect(b.active).toBe(false)
  })

  it('deactivates when bullet goes out of bounds on the right', () => {
    const b = new BulletData()
    b.active   = true
    b.pos      = { x: CANVAS_W - 1, y: 100 }
    b.vel      = { x: 10, y: 0 }
    b.lifetime = BULLET_LIFETIME

    b.update(1)

    expect(b.active).toBe(false)
  })

  it('deactivates when bullet goes out of bounds on the left', () => {
    const b = new BulletData()
    b.active   = true
    b.pos      = { x: 1, y: 100 }
    b.vel      = { x: -10, y: 0 }
    b.lifetime = BULLET_LIFETIME

    b.update(1)

    expect(b.active).toBe(false)
  })

  it('deactivates when bullet goes out of bounds on the top', () => {
    const b = new BulletData()
    b.active   = true
    b.pos      = { x: 100, y: 1 }
    b.vel      = { x: 0, y: -10 }
    b.lifetime = BULLET_LIFETIME

    b.update(1)

    expect(b.active).toBe(false)
  })

  it('deactivates when bullet goes out of bounds on the bottom', () => {
    const b = new BulletData()
    b.active   = true
    b.pos      = { x: 100, y: CANVAS_H - 1 }
    b.vel      = { x: 0, y: 10 }
    b.lifetime = BULLET_LIFETIME

    b.update(1)

    expect(b.active).toBe(false)
  })

  it('skips update when inactive', () => {
    const b = new BulletData()
    b.active   = false
    b.pos      = { x: 100, y: 100 }
    b.vel      = { x: 10, y: 0 }
    b.lifetime = BULLET_LIFETIME

    b.update(1)

    expect(b.pos.x).toBe(100)
    expect(b.lifetime).toBe(BULLET_LIFETIME)
  })
})

describe('UfoBulletData — update', () => {
  it('advances position by vel * dt', () => {
    const b = new UfoBulletData()
    b.active = true
    b.pos    = { x: 100, y: 200 }
    b.vel    = { x: 4, y: 2 }

    b.update(1)

    expect(b.pos.x).toBeCloseTo(104)
    expect(b.pos.y).toBeCloseTo(202)
  })

  it('deactivates when out of bounds', () => {
    const b = new UfoBulletData()
    b.active = true
    b.pos    = { x: CANVAS_W - 1, y: 100 }
    b.vel    = { x: 10, y: 0 }

    b.update(1)

    expect(b.active).toBe(false)
  })

  it('skips update when inactive', () => {
    const b = new UfoBulletData()
    b.active = false
    b.pos    = { x: 100, y: 100 }
    b.vel    = { x: 4, y: 0 }

    b.update(1)

    expect(b.pos.x).toBe(100)
  })
})
