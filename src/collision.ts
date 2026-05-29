import type { Vec2 } from './types'
import { CANVAS_W, CANVAS_H } from './constants'

export function circlesOverlap(
  aPos: Vec2, aRadius: number,
  bPos: Vec2, bRadius: number,
): boolean {
  const dx = aPos.x - bPos.x
  const dy = aPos.y - bPos.y
  return (dx * dx + dy * dy) < (aRadius + bRadius) * (aRadius + bRadius)
}

export function wrapPosition(pos: Vec2, radius: number): Vec2 {
  let { x, y } = pos
  if (x < -radius)           x += CANVAS_W + radius * 2
  if (x > CANVAS_W + radius) x -= CANVAS_W + radius * 2
  if (y < -radius)           y += CANVAS_H + radius * 2
  if (y > CANVAS_H + radius) y -= CANVAS_H + radius * 2
  return { x, y }
}

export type CollisionPair =
  | { kind: 'bulletHitsAsteroid'; bulletId: number; asteroidId: number }
  | { kind: 'bulletHitsUfo';      bulletId: number }
  | { kind: 'ufoBulletHitsShip';  bulletId: number }
  | { kind: 'asteroidHitsShip';   asteroidId: number }
  | { kind: 'shipGrabsPickup' }

export interface CollisionSnapshot {
  ship:       ({ pos: Vec2; radius: number; invincible: number }) | null
  bullets:    Array<{ pos: Vec2; radius: number; id: number }>
  asteroids:  Array<{ pos: Vec2; radius: number; id: number }>
  ufoBullets: Array<{ pos: Vec2; radius: number; id: number }>
  ufo:        { pos: Vec2; radius: number } | null
  pickup:     { pos: Vec2; radius: number } | null
}

export function detectCollisions(snapshot: CollisionSnapshot): CollisionPair[] {
  const pairs: CollisionPair[] = []
  const usedBulletIds   = new Set<number>()
  const usedAsteroidIds = new Set<number>()

  // Bullet ↔ Asteroid
  for (const bullet of snapshot.bullets) {
    for (const asteroid of snapshot.asteroids) {
      if (usedAsteroidIds.has(asteroid.id)) continue
      if (circlesOverlap(bullet.pos, bullet.radius, asteroid.pos, asteroid.radius)) {
        pairs.push({ kind: 'bulletHitsAsteroid', bulletId: bullet.id, asteroidId: asteroid.id })
        usedBulletIds.add(bullet.id)
        usedAsteroidIds.add(asteroid.id)
        break
      }
    }
  }

  // Bullet ↔ UFO
  if (snapshot.ufo) {
    for (const bullet of snapshot.bullets) {
      if (usedBulletIds.has(bullet.id)) continue
      if (circlesOverlap(bullet.pos, bullet.radius, snapshot.ufo.pos, snapshot.ufo.radius)) {
        pairs.push({ kind: 'bulletHitsUfo', bulletId: bullet.id })
        break
      }
    }
  }

  // UFO bullet ↔ Ship
  if (snapshot.ship && snapshot.ship.invincible <= 0) {
    for (const ufoBullet of snapshot.ufoBullets) {
      if (circlesOverlap(ufoBullet.pos, ufoBullet.radius, snapshot.ship.pos, snapshot.ship.radius)) {
        pairs.push({ kind: 'ufoBulletHitsShip', bulletId: ufoBullet.id })
      }
    }
  }

  // Ship ↔ Pickup
  if (snapshot.ship && snapshot.pickup) {
    if (circlesOverlap(snapshot.ship.pos, snapshot.ship.radius, snapshot.pickup.pos, snapshot.pickup.radius)) {
      pairs.push({ kind: 'shipGrabsPickup' })
    }
  }

  // Ship ↔ Asteroid (first hit only)
  if (snapshot.ship && snapshot.ship.invincible <= 0) {
    for (const asteroid of snapshot.asteroids) {
      if (circlesOverlap(snapshot.ship.pos, snapshot.ship.radius, asteroid.pos, asteroid.radius)) {
        pairs.push({ kind: 'asteroidHitsShip', asteroidId: asteroid.id })
        break
      }
    }
  }

  return pairs
}
