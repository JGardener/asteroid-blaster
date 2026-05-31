import type { Vec2 } from '../types'
import type { PickupType } from '../powerup'
import type { PickupState } from '../tickGameState'

export const PICKUP_RADIUS = 14
const PICKUP_SPEED = 0.6

export class PickupData implements PickupState {
  active: boolean  = true
  pos:    Vec2
  vel:    Vec2
  type:   PickupType
  radius: number   = PICKUP_RADIUS

  constructor(pos: Vec2, type: PickupType) {
    this.pos  = { ...pos }
    this.type = type
    const angle = Math.random() * Math.PI * 2
    this.vel  = { x: Math.cos(angle) * PICKUP_SPEED, y: Math.sin(angle) * PICKUP_SPEED }
  }
}
