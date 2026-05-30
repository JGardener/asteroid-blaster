import { Graphics, type Container } from 'pixi.js'
import { ASTEROID_VERTICES_MIN, ASTEROID_VERTICES_MAX, ASTEROID_JITTER, COLOR_DIM } from '../constants'
import type { AsteroidData } from './AsteroidData'

export class AsteroidRenderer {
  private readonly gfx: Graphics

  constructor(stage: Container, data: AsteroidData) {
    this.gfx = new Graphics()
    this.buildShape(data.radius)
    stage.addChild(this.gfx)
  }

  private buildShape(radius: number): void {
    const sides = ASTEROID_VERTICES_MIN +
      Math.floor(Math.random() * (ASTEROID_VERTICES_MAX - ASTEROID_VERTICES_MIN))
    const pts: number[] = []
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2
      const r = radius * (1 - ASTEROID_JITTER + Math.random() * ASTEROID_JITTER)
      pts.push(Math.cos(a) * r, Math.sin(a) * r)
    }
    this.gfx.clear()
    this.gfx.poly(pts).stroke({ color: COLOR_DIM, width: 1.5 })
  }

  sync(data: AsteroidData): void {
    this.gfx.x        = data.pos.x
    this.gfx.y        = data.pos.y
    this.gfx.rotation = data.rotation
  }

  destroy(): void { this.gfx.destroy() }
}
