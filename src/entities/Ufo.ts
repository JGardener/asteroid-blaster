import { Graphics, Container } from 'pixi.js'
import type { Vec2 } from '../types'
import {
  UFO_RADIUS, UFO_SPEED, UFO_FIRE_RATE, UFO_MAX_SPREAD,
  UFO_COLOR, CANVAS_W, CANVAS_H,
} from '../constants'

export type UfoSide = 'left' | 'right'

export class Ufo {
  active:    boolean = true
  pos:       Vec2
  vel:       Vec2
  radius:    number  = UFO_RADIUS
  fireTimer: number = UFO_FIRE_RATE
  readonly gfx: Graphics

  constructor(stage: Container, side: UfoSide) {
    const y = CANVAS_H * 0.2 + Math.random() * CANVAS_H * 0.6
    if (side === 'left') {
      this.pos = { x: -UFO_RADIUS, y }
      this.vel = { x: UFO_SPEED,   y: 0 }
    } else {
      this.pos = { x: CANVAS_W + UFO_RADIUS, y }
      this.vel = { x: -UFO_SPEED,  y: 0 }
    }

    this.gfx = new Graphics()
    this.buildShape()
    stage.addChild(this.gfx)
  }

  private buildShape(): void {
    const r = UFO_RADIUS
    // Saucer: wide ellipse body + domed top
    this.gfx
      .ellipse(0, 0, r, r * 0.4)
      .fill({ color: UFO_COLOR, alpha: 0.25 })
      .stroke({ color: UFO_COLOR, width: 1.5 })
    this.gfx
      .ellipse(0, -r * 0.3, r * 0.55, r * 0.4)
      .stroke({ color: UFO_COLOR, width: 1.5 })
  }

  update(shipPos: Vec2, inaccuracy: number, dt: number): number | null {
    this.pos.x += this.vel.x * dt
    this.pos.y += this.vel.y * dt

    this.gfx.x = this.pos.x
    this.gfx.y = this.pos.y

    const exitedLeft  = this.vel.x < 0 && this.pos.x < -UFO_RADIUS
    const exitedRight = this.vel.x > 0 && this.pos.x > CANVAS_W + UFO_RADIUS
    if (exitedLeft || exitedRight) {
      this.active = false
      this.gfx.visible = false
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

  destroy(): void {
    this.active     = false
    this.gfx.destroy()
  }
}
