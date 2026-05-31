import { describe, it, expect } from 'vitest'
import { ShipData } from '../entities/ShipData'
import { CANVAS_W, CANVAS_H } from '../constants'

describe('ShipData', () => {
  it('starts at canvas center with zero velocity and default rotation', () => {
    const ship = new ShipData()
    expect(ship.pos).toEqual({ x: CANVAS_W / 2, y: CANVAS_H / 2 })
    expect(ship.vel).toEqual({ x: 0, y: 0 })
    expect(ship.rotation).toBeCloseTo(-Math.PI / 2)
    expect(ship.invincible).toBe(0)
    expect(ship.thrustOn).toBe(false)
    expect(ship.powerUp).toBeNull()
    expect(ship.fireCooldown).toBe(0)
  })
})
