import type { Vec2 } from '../types'
import type { UfoBulletState } from '../tickGameState'

export class UfoBulletData implements UfoBulletState {
  active: boolean = false
  pos:    Vec2    = { x: 0, y: 0 }
  vel:    Vec2    = { x: 0, y: 0 }
  radius: number  = 4
}
