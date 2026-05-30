import type { Vec2 } from '../types'
import { UFO_RADIUS, UFO_SPEED, UFO_FIRE_RATE, UFO_MAX_SPREAD, CANVAS_W } from '../constants'

export type UfoSide = 'left' | 'right'

export class UfoData {
  active:    boolean = true
  pos:       Vec2
  vel:       Vec2
  readonly radius: number = UFO_RADIUS
  fireTimer: number = UFO_FIRE_RATE

  constructor(side: UfoSide, pos: Vec2) {
    this.pos = { ...pos }
    this.vel = { x: side === 'left' ? UFO_SPEED : -UFO_SPEED, y: 0 }
  }

  update(shipPos: Vec2, inaccuracy: number, dt: number): number | null {
    this.pos.x += this.vel.x * dt
    this.pos.y += this.vel.y * dt

    const exitedLeft  = this.vel.x < 0 && this.pos.x < -UFO_RADIUS
    const exitedRight = this.vel.x > 0 && this.pos.x > CANVAS_W + UFO_RADIUS
    if (exitedLeft || exitedRight) {
      this.active = false
      return null
    }

    this.fireTimer -= dt
    if (this.fireTimer <= 0) {
      this.fireTimer = UFO_FIRE_RATE
      const base   = Math.atan2(shipPos.y - this.pos.y, shipPos.x - this.pos.x)
      const spread = inaccuracy * UFO_MAX_SPREAD
      return base + (Math.random() - 0.5) * 2 * spread
    }

    return null
  }
}
