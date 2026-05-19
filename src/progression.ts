import { BASE_ASTEROID_COUNT, SPEED_MULTIPLIER_CAP, FIRE_COOLDOWN } from './constants'

export function asteroidsForLevel(level: number): number {
  return BASE_ASTEROID_COUNT + (level - 1)
}

export function speedForLevel(level: number): number {
  return Math.min(1 + (level - 1) * 0.05, SPEED_MULTIPLIER_CAP)
}

export function fireCooldownForLevel(level: number): number {
  return Math.max(FIRE_COOLDOWN - (level - 1) * 2, 8)
}
