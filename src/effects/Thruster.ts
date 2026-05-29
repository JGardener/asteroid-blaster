import { Graphics, Container } from 'pixi.js'
import { COLOR_ACCENT } from '../constants'

export class Thruster {
  private gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    stage.addChildAt(this.gfx, 0)
  }

  update(x: number, y: number, rotation: number, thrusting: boolean, rapidFire = false) {
    this.gfx.clear()
    if (!thrusting) return

    const base  = rapidFire ? 22 : 14
    const jitter = rapidFire ? 12 : 8
    const len   = base + Math.random() * jitter
    const angle = rotation + Math.PI
    const tx = x + Math.cos(angle) * len
    const ty = y + Math.sin(angle) * len
    const perp = rotation + Math.PI / 2
    const bw   = 5
    const bx1 = x + Math.cos(perp) * bw,  by1 = y + Math.sin(perp) * bw
    const bx2 = x - Math.cos(perp) * bw,  by2 = y - Math.sin(perp) * bw
    const alpha = rapidFire ? 0.85 + Math.random() * 0.15 : 0.6 + Math.random() * 0.4

    this.gfx
      .moveTo(bx1, by1)
      .lineTo(tx, ty)
      .lineTo(bx2, by2)
      .closePath()
      .fill({ color: COLOR_ACCENT, alpha })
  }

  destroy() { this.gfx.destroy() }
}
