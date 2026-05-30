import { Graphics, type Container } from 'pixi.js'
import { UFO_RADIUS, UFO_COLOR } from '../constants'
import type { UfoData } from './UfoData'

export class UfoRenderer {
  private readonly gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    this.buildShape()
    stage.addChild(this.gfx)
  }

  private buildShape(): void {
    const r = UFO_RADIUS
    this.gfx
      .ellipse(0, 0, r, r * 0.4)
      .fill({ color: UFO_COLOR, alpha: 0.25 })
      .stroke({ color: UFO_COLOR, width: 1.5 })
    this.gfx
      .ellipse(0, -r * 0.3, r * 0.55, r * 0.4)
      .stroke({ color: UFO_COLOR, width: 1.5 })
  }

  sync(data: UfoData): void {
    this.gfx.x = data.pos.x
    this.gfx.y = data.pos.y
  }

  destroy(): void { this.gfx.destroy() }
}
