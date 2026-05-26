import { Graphics, Container } from 'pixi.js'
import type { Vec2, AsteroidSize } from '../types'
import {
  ASTEROID_RADII, ASTEROID_VERTICES_MIN, ASTEROID_VERTICES_MAX,
  ASTEROID_JITTER, CANVAS_W, CANVAS_H, COLOR_DIM,
} from '../constants'

export class Asteroid {
  active:          boolean = true
  readonly size:   AsteroidSize
  readonly radius: number
  pos:             Vec2
  vel:             Vec2
  rotation:        number = 0
  rotationSpeed:   number
  readonly gfx:    Graphics

  constructor(stage: Container, size: AsteroidSize, pos?: Vec2, vel?: Vec2) {
    this.size   = size
    this.radius = ASTEROID_RADII[size]

    this.pos = pos ?? {
      x: Math.random() < 0.5 ? -this.radius : CANVAS_W + this.radius,
      y: Math.random() * CANVAS_H,
    }

    const speed = Math.random() * 0.8 + 0.4
    const angle = Math.random() * Math.PI * 2
    this.vel = vel ?? { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }

    this.rotationSpeed = (Math.random() - 0.5) * 0.02
    this.gfx = new Graphics()
    stage.addChild(this.gfx)
    this.buildShape()
  }

  private buildShape() {
    const sides = ASTEROID_VERTICES_MIN +
      Math.floor(Math.random() * (ASTEROID_VERTICES_MAX - ASTEROID_VERTICES_MIN))
    const pts: number[] = []
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2
      const r = this.radius * (1 - ASTEROID_JITTER + Math.random() * ASTEROID_JITTER)
      pts.push(Math.cos(a) * r, Math.sin(a) * r)
    }
    this.gfx.clear()
    this.gfx.poly(pts).stroke({ color: COLOR_DIM, width: 1.5 })
  }

  update(speedMult: number, dt: number): void {
    this.pos.x    += this.vel.x * speedMult
    this.pos.y    += this.vel.y * speedMult
    this.rotation += this.rotationSpeed * dt

    const r = this.radius
    if (this.pos.x < -r)           this.pos.x += CANVAS_W + r * 2
    if (this.pos.x > CANVAS_W + r) this.pos.x -= CANVAS_W + r * 2
    if (this.pos.y < -r)           this.pos.y += CANVAS_H + r * 2
    if (this.pos.y > CANVAS_H + r) this.pos.y -= CANVAS_H + r * 2

    this.gfx.x        = this.pos.x
    this.gfx.y        = this.pos.y
    this.gfx.rotation = this.rotation
  }

  split(stage: Container): Asteroid[] {
    if (this.size === 'small') return []
    const next: AsteroidSize = this.size === 'large' ? 'medium' : 'small'
    return [
      new Asteroid(stage, next, { ...this.pos }, {
        x:  this.vel.y * 1.5 + (Math.random() - 0.5),
        y: -this.vel.x * 1.5 + (Math.random() - 0.5),
      }),
      new Asteroid(stage, next, { ...this.pos }, {
        x: -this.vel.y * 1.5 + (Math.random() - 0.5),
        y:  this.vel.x * 1.5 + (Math.random() - 0.5),
      }),
    ]
  }

  destroy(): void {
    this.active = false
    this.gfx.destroy()
  }
}
