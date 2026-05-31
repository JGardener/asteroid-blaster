import type { Vec2, AsteroidSize } from '../types'
import { ASTEROID_RADII } from '../constants'
import type { AsteroidState } from '../tickGameState'

export class AsteroidData implements AsteroidState {
  readonly size:   AsteroidSize
  readonly radius: number
  pos:             Vec2
  vel:             Vec2
  rotation:        number = 0
  rotationSpeed:   number

  constructor(size: AsteroidSize, pos: Vec2, vel: Vec2, rotationSpeed?: number) {
    this.size          = size
    this.radius        = ASTEROID_RADII[size]
    this.pos           = { ...pos }
    this.vel           = { ...vel }
    this.rotationSpeed = rotationSpeed ?? (Math.random() - 0.5) * 0.02
  }
}
