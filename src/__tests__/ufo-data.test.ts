import { describe, it, expect } from 'vitest'
import { UfoData } from '../entities/UfoData'
import { UFO_RADIUS, CANVAS_W } from '../constants'

const ship = { x: 480, y: 320 }

describe("UfoData — left entry", () => {
  it('starts at the left edge', () => {
    const ufo = new UfoData('left', { x: -UFO_RADIUS, y: 320 })
    expect(ufo.pos.x).toBe(-UFO_RADIUS)
  })

  it('has a rightward velocity', () => {
    const ufo = new UfoData('left', { x: -UFO_RADIUS, y: 320 })
    expect(ufo.vel.x).toBeGreaterThan(0)
  })
})

describe("UfoData — right entry", () => {
  it('starts beyond the right edge', () => {
    const ufo = new UfoData('right', { x: CANVAS_W + UFO_RADIUS, y: 320 })
    expect(ufo.pos.x).toBe(CANVAS_W + UFO_RADIUS)
  })

  it('has a leftward velocity', () => {
    const ufo = new UfoData('right', { x: CANVAS_W + UFO_RADIUS, y: 320 })
    expect(ufo.vel.x).toBeLessThan(0)
  })
})

describe("UfoData — movement", () => {
  it('advances pos.x each update', () => {
    const ufo = new UfoData('left', { x: -UFO_RADIUS, y: 320 })
    const before = ufo.pos.x
    ufo.update(ship, 0, 1)
    expect(ufo.pos.x).toBeGreaterThan(before)
  })
})

describe("UfoData — off-screen exit", () => {
  it('sets active=false after crossing the right edge', () => {
    const ufo = new UfoData('left', { x: -UFO_RADIUS, y: 320 })
    for (let i = 0; i < 2000; i++) ufo.update(ship, 0, 1)
    expect(ufo.active).toBe(false)
  })

  it('returns null on the frame it exits', () => {
    const ufo = new UfoData('left', { x: CANVAS_W + UFO_RADIUS - 0.1, y: 320 })
    const result = ufo.update(ship, 0, 1)
    expect(result).toBeNull()
    expect(ufo.active).toBe(false)
  })
})

describe("UfoData — firing", () => {
  it('returns null before the fire interval elapses', () => {
    const ufo = new UfoData('left', { x: -UFO_RADIUS, y: 320 })
    expect(ufo.update(ship, 0, 1)).toBeNull()
  })

  it('returns a number once the fire interval elapses', () => {
    const ufo = new UfoData('left', { x: -UFO_RADIUS, y: 320 })
    let fired: number | null = null
    for (let i = 0; i < 200 && fired === null; i++) fired = ufo.update(ship, 0, 1)
    expect(typeof fired).toBe('number')
  })

  it('with inaccuracy=0, angle points exactly at ship', () => {
    const ufo = new UfoData('left', { x: 0, y: 320 })
    const expected = Math.atan2(ship.y - 320, ship.x - 0)
    let fired: number | null = null
    for (let i = 0; i < 200 && fired === null; i++) fired = ufo.update(ship, 0, 1)
    expect(fired).not.toBeNull()
    expect(fired!).toBeCloseTo(expected, 10)
  })
})
