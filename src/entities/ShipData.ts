import type { Vec2 } from '../types'
import type { InputSnapshot } from '../input'
import type { PickupType } from '../powerup'
import {
  SHIP_THRUST, SHIP_ROTATION_SPEED, SHIP_MAX_SPEED, SHIP_DRAG,
  CANVAS_W, CANVAS_H,
} from '../constants'
import { wrapPosition } from '../collision'

export class ShipData {
  pos:              Vec2 = { x: CANVAS_W / 2, y: CANVAS_H / 2 }
  vel:              Vec2 = { x: 0, y: 0 }
  rotation:         number = -Math.PI / 2
  invincible:       number = 0
  thrustOn:         boolean = false
  powerUp:          PickupType | null = null
  powerUpRemaining: number = 0
  fireCooldown:     number = 0

  update(input: InputSnapshot, dt: number): void {
    if (input.left)  this.rotation -= SHIP_ROTATION_SPEED * dt
    if (input.right) this.rotation += SHIP_ROTATION_SPEED * dt

    this.thrustOn = input.thrust
    if (input.thrust) {
      this.vel.x += Math.cos(this.rotation) * SHIP_THRUST * dt
      this.vel.y += Math.sin(this.rotation) * SHIP_THRUST * dt
      const speed = Math.hypot(this.vel.x, this.vel.y)
      if (speed > SHIP_MAX_SPEED) {
        this.vel.x = (this.vel.x / speed) * SHIP_MAX_SPEED
        this.vel.y = (this.vel.y / speed) * SHIP_MAX_SPEED
      }
    }

    const drag = Math.pow(SHIP_DRAG, dt)
    this.vel.x *= drag
    this.vel.y *= drag
    this.pos.x += this.vel.x * dt
    this.pos.y += this.vel.y * dt
    this.pos = wrapPosition(this.pos, 0)

    if (this.invincible > 0) this.invincible -= dt
  }
}
