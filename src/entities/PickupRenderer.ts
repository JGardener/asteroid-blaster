import { Graphics, type Container } from 'pixi.js'
import type { PickupType } from '../powerup'
import { COLOR_ACCENT, COLOR_DIM } from '../constants'
import { PICKUP_RADIUS } from './PickupData'
import type { PickupData } from './PickupData'

const GLYPHS: Record<PickupType, (g: Graphics) => void> = {
  SpreadShot: g => {
    const len = 8
    const angles = [-0.45, 0, 0.45]
    angles.forEach(a => {
      g.moveTo(0, 0)
      g.lineTo(Math.cos(a - Math.PI / 2) * len, Math.sin(a - Math.PI / 2) * len)
    })
    g.stroke({ color: COLOR_ACCENT, width: 1.5 })
  },
  RapidFire: g => {
    for (let i = -1; i <= 1; i++) {
      g.moveTo(-6, i * 4)
      g.lineTo(6,  i * 4)
    }
    g.stroke({ color: COLOR_ACCENT, width: 1.5 })
  },
  Shield: g => {
    g.arc(0, 0, 6, 0, Math.PI * 2)
    g.stroke({ color: COLOR_ACCENT, width: 1.5 })
  },
}

export class PickupRenderer {
  private readonly gfx: Graphics

  constructor(stage: Container, data: PickupData) {
    this.gfx = new Graphics()
    this.gfx.arc(0, 0, PICKUP_RADIUS, 0, Math.PI * 2)
    this.gfx.stroke({ color: COLOR_DIM, width: 1.5 })
    GLYPHS[data.type](this.gfx)
    stage.addChild(this.gfx)
  }

  sync(data: PickupData): void {
    this.gfx.x       = data.pos.x
    this.gfx.y       = data.pos.y
    this.gfx.visible = data.active
  }

  destroy(): void { this.gfx.destroy() }
}
