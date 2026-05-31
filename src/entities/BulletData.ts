import type { Vec2 } from '../types'
import type { BulletState } from '../tickGameState'

export class BulletData implements BulletState {
  active:   boolean = false
  pos:      Vec2    = { x: 0, y: 0 }
  vel:      Vec2    = { x: 0, y: 0 }
  radius:   number  = 3
  lifetime: number  = 0
}
