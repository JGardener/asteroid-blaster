import type { Vec2 } from '../types'
import type { PickupType } from '../powerup'
import { wrapPosition } from '../collision'

export const PICKUP_RADIUS = 14
const PICKUP_SPEED = 0.6

export class PickupData {
  active: boolean  = true
  pos:    Vec2
  vel:    Vec2
  type:   PickupType
  radius: number   = PICKUP_RADIUS

  constructor(pos: Vec2, type: PickupType) {
    this.pos  = { ...pos }
    this.type = type
    const angle = Math.random() * Math.PI * 2
    this.vel  = { x: Math.cos(angle) * PICKUP_SPEED, y: Math.sin(angle) * PICKUP_SPEED }
  }

  update(dt: number): void {
    this.pos.x += this.vel.x * dt
    this.pos.y += this.vel.y * dt
    this.pos    = wrapPosition(this.pos, this.radius)
  }
}
