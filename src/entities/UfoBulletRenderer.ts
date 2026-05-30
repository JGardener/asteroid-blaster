import { Graphics, type Container } from 'pixi.js'
import { UFO_BULLET_COLOR } from '../constants'
import type { UfoBulletData } from './UfoBulletData'

export class UfoBulletRenderer {
  private readonly gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    this.gfx.circle(0, 0, 4).fill({ color: UFO_BULLET_COLOR })
    this.gfx.visible = false
    stage.addChild(this.gfx)
  }

  sync(data: UfoBulletData): void {
    this.gfx.visible = data.active
    if (data.active) {
      this.gfx.x = data.pos.x
      this.gfx.y = data.pos.y
    }
  }

  destroy(): void { this.gfx.destroy() }
}
