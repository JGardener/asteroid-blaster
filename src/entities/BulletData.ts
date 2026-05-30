import type { Vec2 } from '../types'
import { CANVAS_W, CANVAS_H } from '../constants'

export class BulletData {
  active:   boolean = false
  pos:      Vec2    = { x: 0, y: 0 }
  vel:      Vec2    = { x: 0, y: 0 }
  radius:   number  = 3
  lifetime: number  = 0

  update(dt: number): void {
    if (!this.active) return
    this.pos.x   += this.vel.x * dt
    this.pos.y   += this.vel.y * dt
    this.lifetime -= dt
    const oob = this.pos.x < 0 || this.pos.x > CANVAS_W || this.pos.y < 0 || this.pos.y > CANVAS_H
    if (this.lifetime <= 0 || oob) this.active = false
  }
}
