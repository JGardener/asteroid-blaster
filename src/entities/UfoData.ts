import type { Vec2 } from '../types'
import { UFO_RADIUS, UFO_SPEED, UFO_FIRE_RATE } from '../constants'
import type { UfoState } from '../tickGameState'

export type UfoSide = 'left' | 'right'

export class UfoData implements UfoState {
  active:    boolean = true
  pos:       Vec2
  vel:       Vec2
  readonly radius: number = UFO_RADIUS
  fireTimer: number = UFO_FIRE_RATE

  constructor(side: UfoSide, pos: Vec2) {
    this.pos = { ...pos }
    this.vel = { x: side === 'left' ? UFO_SPEED : -UFO_SPEED, y: 0 }
  }
}
