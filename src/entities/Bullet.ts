import { Graphics, Container } from 'pixi.js'
import type { Vec2 } from '../types'
import { BULLET_SPEED, BULLET_LIFETIME, CANVAS_W, CANVAS_H, COLOR_ACCENT } from '../constants'

export class Bullet {
  active:   boolean = false
  pos:      Vec2    = { x: 0, y: 0 }
  vel:      Vec2    = { x: 0, y: 0 }
  radius:   number  = 3
  lifetime: number  = 0
  readonly gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    this.gfx.circle(0, 0, this.radius).fill({ color: COLOR_ACCENT })
    this.gfx.visible = false
    stage.addChild(this.gfx)
  }

  init(pos: Vec2, angle: number) {
    this.pos      = { ...pos }
    this.vel      = { x: Math.cos(angle) * BULLET_SPEED, y: Math.sin(angle) * BULLET_SPEED }
    this.lifetime = BULLET_LIFETIME
    this.gfx.visible = true
  }

  update(): boolean {
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.lifetime--

    const oob =
      this.pos.x < 0 || this.pos.x > CANVAS_W ||
      this.pos.y < 0 || this.pos.y > CANVAS_H

    if (this.lifetime <= 0 || oob) {
      this.deactivate()
      return false
    }

    this.gfx.x = this.pos.x
    this.gfx.y = this.pos.y
    return true
  }

  deactivate() {
    this.active      = false
    this.gfx.visible = false
  }

  destroy() { this.gfx.destroy() }
}
