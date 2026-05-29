export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover' | 'transitioning'

export interface Vec2 {
  x: number
  y: number
}

export interface Entity {
  pos:    Vec2
  vel:    Vec2
  radius: number
  active: boolean
}

export interface Bullet extends Entity {
  lifetime: number
}

export type AsteroidSize = 'large' | 'medium' | 'small'

export interface Asteroid extends Entity {
  size:          AsteroidSize
  rotation:      number
  rotationSpeed: number
}

export interface Particle extends Entity {
  alpha: number
  decay: number
  color: number
}
