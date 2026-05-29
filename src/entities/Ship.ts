import { Graphics, Container } from 'pixi.js'
import type { Vec2 } from '../types'
import type { InputSnapshot } from '../input'
import type { PickupType } from '../powerup'
import {
  SHIP_THRUST, SHIP_ROTATION_SPEED, SHIP_MAX_SPEED,
  SHIP_DRAG, SHIP_RADIUS, CANVAS_W, CANVAS_H,
  INVINCIBILITY_FRAMES, COLOR_ACCENT,
} from '../constants'

export class Ship {
  readonly gfx: Graphics
  pos:         Vec2    = { x: CANVAS_W / 2, y: CANVAS_H / 2 }
  vel:         Vec2    = { x: 0, y: 0 }
  rotation:    number  = -Math.PI / 2
  invincible:  number  = 0
  thrustOn:    boolean = false

  constructor(stage: Container) {
    this.gfx = new Graphics()
    this.gfx.moveTo(0, -SHIP_RADIUS)
    this.gfx.lineTo(SHIP_RADIUS * 0.7,  SHIP_RADIUS * 0.8)
    this.gfx.lineTo(0,                  SHIP_RADIUS * 0.4)
    this.gfx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.8)
    this.gfx.closePath()
    this.gfx.stroke({ color: COLOR_ACCENT, width: 1.5 })
    stage.addChild(this.gfx)
  }

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

    if (this.pos.x < 0)        this.pos.x += CANVAS_W
    if (this.pos.x > CANVAS_W) this.pos.x -= CANVAS_W
    if (this.pos.y < 0)        this.pos.y += CANVAS_H
    if (this.pos.y > CANVAS_H) this.pos.y -= CANVAS_H

    if (this.invincible > 0) this.invincible -= dt

    this.gfx.x        = this.pos.x
    this.gfx.y        = this.pos.y
    this.gfx.rotation = this.rotation + Math.PI / 2
    this.gfx.alpha    = (this.invincible > 0 && this.invincible % 6 < 3) ? 0.3 : 1
  }

  hit(): void {
    this.invincible = INVINCIBILITY_FRAMES
    this.vel        = { x: 0, y: 0 }
    this.pos        = { x: CANVAS_W / 2, y: CANVAS_H / 2 }
  }

  setPowerUp(powerUp: PickupType | null): void {
    this.gfx.clear()
    const wide = powerUp === 'SpreadShot'
    const xw   = wide ? SHIP_RADIUS * 1.0 : SHIP_RADIUS * 0.7
    const yw   = wide ? SHIP_RADIUS * 0.7 : SHIP_RADIUS * 0.8
    this.gfx
      .moveTo(0,   -SHIP_RADIUS)
      .lineTo( xw,  yw)
      .lineTo( 0,   SHIP_RADIUS * 0.4)
      .lineTo(-xw,  yw)
      .closePath()
      .stroke({ color: COLOR_ACCENT, width: 1.5 })
    if (powerUp === 'Shield') {
      this.gfx.arc(0, 0, SHIP_RADIUS + 8, 0, Math.PI * 2)
      this.gfx.stroke({ color: COLOR_ACCENT, width: 1.5 })
    }
  }

  destroy(): void { this.gfx.destroy() }
}
