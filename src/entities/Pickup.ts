import { Graphics, Container } from 'pixi.js'
import type { Vec2 } from '../types'
import type { PickupType } from '../powerup'
import { CANVAS_W, CANVAS_H, COLOR_ACCENT, COLOR_DIM } from '../constants'

export const PICKUP_RADIUS = 14
const PICKUP_SPEED = 0.6

const GLYPHS: Record<PickupType, (g: Graphics) => void> = {
  SpreadShot: g => {
    // Fan of 3 lines emanating outward
    const len = 8
    const angles = [-0.45, 0, 0.45]
    angles.forEach(a => {
      g.moveTo(0, 0)
      g.lineTo(Math.cos(a - Math.PI / 2) * len, Math.sin(a - Math.PI / 2) * len)
    })
    g.stroke({ color: COLOR_ACCENT, width: 1.5 })
  },
  RapidFire: g => {
    // Three short horizontal dashes (speed lines)
    for (let i = -1; i <= 1; i++) {
      g.moveTo(-6, i * 4)
      g.lineTo(6,  i * 4)
    }
    g.stroke({ color: COLOR_ACCENT, width: 1.5 })
  },
  Shield: g => {
    // Simple circle
    g.arc(0, 0, 6, 0, Math.PI * 2)
    g.stroke({ color: COLOR_ACCENT, width: 1.5 })
  },
}

export class Pickup {
  active: boolean    = true
  pos:    Vec2
  vel:    Vec2
  radius: number     = PICKUP_RADIUS
  readonly type:     PickupType
  readonly gfx:      Graphics

  constructor(stage: Container, pos: Vec2, type: PickupType) {
    this.type = type
    this.pos  = { ...pos }
    const angle = Math.random() * Math.PI * 2
    this.vel  = { x: Math.cos(angle) * PICKUP_SPEED, y: Math.sin(angle) * PICKUP_SPEED }

    this.gfx = new Graphics()
    // Outer ring
    this.gfx.arc(0, 0, PICKUP_RADIUS, 0, Math.PI * 2)
    this.gfx.stroke({ color: COLOR_DIM, width: 1.5 })
    // Inner glyph
    GLYPHS[type](this.gfx)

    stage.addChild(this.gfx)
  }

  update(dt: number): void {
    this.pos.x += this.vel.x * dt
    this.pos.y += this.vel.y * dt

    if (this.pos.x < -PICKUP_RADIUS)           this.pos.x += CANVAS_W + PICKUP_RADIUS * 2
    if (this.pos.x > CANVAS_W + PICKUP_RADIUS) this.pos.x -= CANVAS_W + PICKUP_RADIUS * 2
    if (this.pos.y < -PICKUP_RADIUS)           this.pos.y += CANVAS_H + PICKUP_RADIUS * 2
    if (this.pos.y > CANVAS_H + PICKUP_RADIUS) this.pos.y -= CANVAS_H + PICKUP_RADIUS * 2

    this.gfx.x = this.pos.x
    this.gfx.y = this.pos.y
  }

  destroy(): void {
    this.active = false
    this.gfx.destroy()
  }
}
