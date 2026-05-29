import { Graphics, Container } from 'pixi.js'
import type { Vec2 } from '../types'
import { UFO_BULLET_SPEED, UFO_BULLET_COLOR, CANVAS_W, CANVAS_H } from '../constants'

export class UfoBullet {
  active:   boolean = false
  pos:      Vec2    = { x: 0, y: 0 }
  vel:      Vec2    = { x: 0, y: 0 }
  radius:   number  = 4
  readonly gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    this.gfx.circle(0, 0, this.radius).fill({ color: UFO_BULLET_COLOR })
    this.gfx.visible = false
    stage.addChild(this.gfx)
  }

  init(pos: Vec2, angle: number): void {
    this.pos      = { ...pos }
    this.vel      = { x: Math.cos(angle) * UFO_BULLET_SPEED, y: Math.sin(angle) * UFO_BULLET_SPEED }
    this.gfx.visible = true
  }

  update(dt: number): void {
    this.pos.x += this.vel.x * dt
    this.pos.y += this.vel.y * dt

    const oob =
      this.pos.x < 0 || this.pos.x > CANVAS_W ||
      this.pos.y < 0 || this.pos.y > CANVAS_H

    if (oob) {
      this.deactivate()
      return
    }

    this.gfx.x = this.pos.x
    this.gfx.y = this.pos.y
  }

  deactivate(): void {
    this.active      = false
    this.gfx.visible = false
  }

  destroy(): void { this.gfx.destroy() }
}
