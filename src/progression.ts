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

export function ufoFrequencyForLevel(level: number): number {
  if (level <= 2) return 0
  if (level <= 4) return 1
  return 2
}

export function ufoAccuracyForLevel(level: number): number {
  return Math.min(0.3 + (level - 3) * (0.85 - 0.3) / 4, 0.85)
}
