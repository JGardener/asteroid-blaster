import type { Vec2 } from '../types'
import { CANVAS_W, CANVAS_H } from '../constants'

export class UfoBulletData {
  active: boolean = false
  pos:    Vec2    = { x: 0, y: 0 }
  vel:    Vec2    = { x: 0, y: 0 }
  radius: number  = 4

  update(dt: number): void {
    if (!this.active) return
    this.pos.x += this.vel.x * dt
    this.pos.y += this.vel.y * dt
    const oob = this.pos.x < 0 || this.pos.x > CANVAS_W || this.pos.y < 0 || this.pos.y > CANVAS_H
    if (oob) this.active = false
  }
}
