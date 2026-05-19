import type { AsteroidSize } from './types'

export const CANVAS_W = 960
export const CANVAS_H = 640

export const BULLET_POOL_SIZE   = 20
export const PARTICLE_POOL_SIZE = 120

export const SHIP_THRUST         = 0.18
export const SHIP_ROTATION_SPEED = 0.065
export const SHIP_MAX_SPEED      = 6
export const SHIP_DRAG           = 0.98
export const SHIP_RADIUS         = 12
export const FIRE_COOLDOWN       = 14

export const BULLET_SPEED    = 10
export const BULLET_LIFETIME = 55

export const ASTEROID_RADII: Record<AsteroidSize, number> = {
  large: 48, medium: 26, small: 13,
}
export const ASTEROID_SCORE: Record<AsteroidSize, number> = {
  large: 20, medium: 50, small: 100,
}
export const ASTEROID_VERTICES_MIN = 6
export const ASTEROID_VERTICES_MAX = 10
export const ASTEROID_JITTER       = 0.28

export const BASE_ASTEROID_COUNT  = 3
export const SPEED_MULTIPLIER_CAP = 2.0
export const STARTING_LIVES       = 3
export const INVINCIBILITY_FRAMES = 120

export const COLOR_ACCENT = 0x4f8cff
export const COLOR_DIM    = 0xa0a0b0
export const COLOR_WHITE  = 0xe8e8f0
export const STAR_COUNT   = 100
