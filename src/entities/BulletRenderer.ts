import { Graphics, type Container } from 'pixi.js'
import { COLOR_ACCENT } from '../constants'
import type { BulletData } from './BulletData'

export class BulletRenderer {
  private readonly gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    this.gfx.circle(0, 0, 3).fill({ color: COLOR_ACCENT })
    this.gfx.visible = false
    stage.addChild(this.gfx)
  }

  sync(data: BulletData): void {
    this.gfx.visible = data.active
    if (data.active) {
      this.gfx.x = data.pos.x
      this.gfx.y = data.pos.y
    }
  }

  destroy(): void { this.gfx.destroy() }
}
