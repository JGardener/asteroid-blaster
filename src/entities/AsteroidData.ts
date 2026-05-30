import type { Vec2, AsteroidSize } from '../types'
import { ASTEROID_RADII } from '../constants'
import { wrapPosition } from '../collision'

export class AsteroidData {
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

  update(speedMult: number, dt: number): void {
    this.pos.x    += this.vel.x * speedMult
    this.pos.y    += this.vel.y * speedMult
    this.rotation += this.rotationSpeed * dt
    this.pos       = wrapPosition(this.pos, this.radius)
  }

  split(): AsteroidData[] {
    if (this.size === 'small') return []
    const next: AsteroidSize = this.size === 'large' ? 'medium' : 'small'
    return [
      new AsteroidData(next, { ...this.pos }, {
        x:  this.vel.y * 1.5 + (Math.random() - 0.5),
        y: -this.vel.x * 1.5 + (Math.random() - 0.5),
      }),
      new AsteroidData(next, { ...this.pos }, {
        x: -this.vel.y * 1.5 + (Math.random() - 0.5),
        y:  this.vel.x * 1.5 + (Math.random() - 0.5),
      }),
    ]
  }
}
