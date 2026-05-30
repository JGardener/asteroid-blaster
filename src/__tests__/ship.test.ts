import { describe, it, expect } from 'vitest'
import { ShipData } from '../entities/ShipData'
import { CANVAS_W, CANVAS_H, SHIP_ROTATION_SPEED, SHIP_THRUST, SHIP_MAX_SPEED, SHIP_DRAG } from '../constants'

const noInput = { left: false, right: false, thrust: false, fire: false, pause: false, confirm: false }
const dt = 1

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

  it('left input rotates counter-clockwise', () => {
    const ship = new ShipData()
    const before = ship.rotation
    ship.update({ ...noInput, left: true }, dt)
    expect(ship.rotation).toBeCloseTo(before - SHIP_ROTATION_SPEED * dt)
  })

  it('right input rotates clockwise', () => {
    const ship = new ShipData()
    const before = ship.rotation
    ship.update({ ...noInput, right: true }, dt)
    expect(ship.rotation).toBeCloseTo(before + SHIP_ROTATION_SPEED * dt)
  })

  it('thrust accelerates in the rotation direction', () => {
    const ship = new ShipData()
    ship.rotation = 0  // pointing right
    ship.update({ ...noInput, thrust: true }, dt)
    expect(ship.vel.x).toBeGreaterThan(0)
    expect(ship.vel.y).toBeCloseTo(0, 3)
  })

  it('velocity is clamped at SHIP_MAX_SPEED', () => {
    const ship = new ShipData()
    ship.vel = { x: SHIP_MAX_SPEED, y: 0 }
    ship.rotation = 0
    ship.update({ ...noInput, thrust: true }, dt)
    const speed = Math.hypot(ship.vel.x, ship.vel.y)
    expect(speed).toBeLessThanOrEqual(SHIP_MAX_SPEED + 0.0001)
  })

  it('drag reduces velocity each tick', () => {
    const ship = new ShipData()
    ship.vel = { x: 10, y: 0 }
    ship.update(noInput, dt)
    expect(ship.vel.x).toBeLessThan(10)
  })

  it('position wraps when out of canvas bounds', () => {
    const ship = new ShipData()
    ship.pos = { x: -1, y: CANVAS_H / 2 }
    ship.vel = { x: 0, y: 0 }
    ship.update(noInput, dt)
    expect(ship.pos.x).toBeGreaterThan(0)
  })

  it('invincible decrements each tick', () => {
    const ship = new ShipData()
    ship.invincible = 10
    ship.update(noInput, dt)
    expect(ship.invincible).toBeCloseTo(10 - dt)
  })

  it('thrustOn reflects the thrust input', () => {
    const ship = new ShipData()
    ship.update({ ...noInput, thrust: true }, dt)
    expect(ship.thrustOn).toBe(true)
    ship.update(noInput, dt)
    expect(ship.thrustOn).toBe(false)
  })
})
