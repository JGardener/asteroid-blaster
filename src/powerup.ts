export type PickupType = 'SpreadShot' | 'RapidFire' | 'Shield'

const SPREAD_ANGLE = 15 * (Math.PI / 180) // 15° in radians

export function spreadShotAngles(baseAngle: number): number[] {
  return [baseAngle - SPREAD_ANGLE, baseAngle, baseAngle + SPREAD_ANGLE]
}

export function effectiveCooldown(base: number, powerUpType: PickupType | null): number {
  if (powerUpType === 'RapidFire') return base / 2
  return base
}

export function tickPowerUp(remaining: number, dt: number): number {
  return remaining - dt
}
