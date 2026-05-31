import { describe, it, expect } from 'vitest'
import { UfoData } from '../entities/UfoData'
import { UFO_RADIUS, CANVAS_W } from '../constants'

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
