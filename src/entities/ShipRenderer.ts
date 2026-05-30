import { Graphics, type Container } from 'pixi.js'
import { SHIP_RADIUS, COLOR_ACCENT } from '../constants'
import { Thruster } from '../effects/Thruster'
import type { ShipData } from './ShipData'

export class ShipRenderer {
  private readonly gfx:      Graphics
  private readonly thruster: Thruster
  private lastPowerUp:       string | null = null

  constructor(stage: Container) {
    this.gfx      = new Graphics()
    this.thruster = new Thruster(stage)
    this.drawHull(false)
    stage.addChild(this.gfx)
  }

  private drawHull(spreadShot: boolean): void {
    const xw = spreadShot ? SHIP_RADIUS * 1.0 : SHIP_RADIUS * 0.7
    const yw  = spreadShot ? SHIP_RADIUS * 0.7 : SHIP_RADIUS * 0.8
    this.gfx.clear()
    this.gfx
      .moveTo(0,   -SHIP_RADIUS)
      .lineTo( xw,  yw)
      .lineTo( 0,   SHIP_RADIUS * 0.4)
      .lineTo(-xw,  yw)
      .closePath()
      .stroke({ color: COLOR_ACCENT, width: 1.5 })
    if (this.lastPowerUp === 'Shield') {
      this.gfx.arc(0, 0, SHIP_RADIUS + 8, 0, Math.PI * 2)
      this.gfx.stroke({ color: COLOR_ACCENT, width: 1.5 })
    }
  }

  sync(data: ShipData): void {
    const powerUpChanged = data.powerUp !== this.lastPowerUp
    if (powerUpChanged) {
      this.lastPowerUp = data.powerUp
      this.drawHull(data.powerUp === 'SpreadShot')
    }

    this.gfx.x        = data.pos.x
    this.gfx.y        = data.pos.y
    this.gfx.rotation = data.rotation + Math.PI / 2
    this.gfx.alpha    = (data.invincible > 0 && data.invincible % 6 < 3) ? 0.3 : 1

    this.thruster.update(
      data.pos.x, data.pos.y, data.rotation, data.thrustOn,
      data.powerUp === 'RapidFire',
    )
  }

  destroy(): void {
    this.gfx.destroy()
    this.thruster.destroy()
  }
}
