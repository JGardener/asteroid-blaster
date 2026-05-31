import type { Vec2 } from '../types'
import type { PickupType } from '../powerup'
import { CANVAS_W, CANVAS_H } from '../constants'
import type { ShipState } from '../tickGameState'

export class ShipData implements ShipState {
  pos:              Vec2 = { x: CANVAS_W / 2, y: CANVAS_H / 2 }
  vel:              Vec2 = { x: 0, y: 0 }
  rotation:         number = -Math.PI / 2
  invincible:       number = 0
  thrustOn:         boolean = false
  powerUp:          PickupType | null = null
  powerUpRemaining: number = 0
  fireCooldown:     number = 0
}
