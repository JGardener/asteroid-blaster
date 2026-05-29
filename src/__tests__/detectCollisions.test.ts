import { describe, it, expect } from 'vitest'
import { detectCollisions } from '../collision'
import type { CollisionSnapshot } from '../collision'

const emptySnapshot = (): CollisionSnapshot => ({
  ship:       null,
  bullets:    [],
  asteroids:  [],
  ufoBullets: [],
  ufo:        null,
  pickup:     null,
})

describe('detectCollisions', () => {
  it('returns no pairs when nothing overlaps', () => {
    const snap: CollisionSnapshot = {
      ...emptySnapshot(),
      ship:      { pos: { x: 480, y: 320 }, radius: 10, invincible: 0 },
      bullets:   [{ pos: { x: 100, y: 100 }, radius: 3, id: 0 }],
      asteroids: [{ pos: { x: 800, y: 500 }, radius: 48, id: 0 }],
    }
    expect(detectCollisions(snap)).toEqual([])
  })

  it('returns bulletHitsAsteroid when bullet overlaps asteroid', () => {
    const snap: CollisionSnapshot = {
      ...emptySnapshot(),
      bullets:   [{ pos: { x: 100, y: 100 }, radius: 3, id: 0 }],
      asteroids: [{ pos: { x: 100, y: 100 }, radius: 48, id: 0 }],
    }
    expect(detectCollisions(snap)).toContainEqual({
      kind: 'bulletHitsAsteroid', bulletId: 0, asteroidId: 0,
    })
  })

  it('returns bulletHitsUfo when bullet overlaps UFO', () => {
    const snap: CollisionSnapshot = {
      ...emptySnapshot(),
      bullets: [{ pos: { x: 200, y: 200 }, radius: 3, id: 0 }],
      ufo:     { pos: { x: 200, y: 200 }, radius: 18 },
    }
    expect(detectCollisions(snap)).toContainEqual({
      kind: 'bulletHitsUfo', bulletId: 0,
    })
  })

  it('returns ufoBulletHitsShip when UFO bullet overlaps non-invincible ship', () => {
    const snap: CollisionSnapshot = {
      ...emptySnapshot(),
      ship:       { pos: { x: 480, y: 320 }, radius: 10, invincible: 0 },
      ufoBullets: [{ pos: { x: 480, y: 320 }, radius: 3, id: 0 }],
    }
    expect(detectCollisions(snap)).toContainEqual({
      kind: 'ufoBulletHitsShip', bulletId: 0,
    })
  })

  it('emits no ufoBulletHitsShip when ship is invincible', () => {
    const snap: CollisionSnapshot = {
      ...emptySnapshot(),
      ship:       { pos: { x: 480, y: 320 }, radius: 10, invincible: 60 },
      ufoBullets: [{ pos: { x: 480, y: 320 }, radius: 3, id: 0 }],
    }
    expect(detectCollisions(snap)).toEqual([])
  })

  it('returns asteroidHitsShip when asteroid overlaps non-invincible ship', () => {
    const snap: CollisionSnapshot = {
      ...emptySnapshot(),
      ship:      { pos: { x: 480, y: 320 }, radius: 10, invincible: 0 },
      asteroids: [{ pos: { x: 480, y: 320 }, radius: 48, id: 0 }],
    }
    expect(detectCollisions(snap)).toContainEqual({
      kind: 'asteroidHitsShip', asteroidId: 0,
    })
  })

  it('returns shipGrabsPickup when ship overlaps pickup', () => {
    const snap: CollisionSnapshot = {
      ...emptySnapshot(),
      ship:   { pos: { x: 480, y: 320 }, radius: 10, invincible: 0 },
      pickup: { pos: { x: 480, y: 320 }, radius: 14 },
    }
    expect(detectCollisions(snap)).toContainEqual({ kind: 'shipGrabsPickup' })
  })

  it('does not emit bulletHitsUfo for a bullet already matched to an asteroid', () => {
    const snap: CollisionSnapshot = {
      ...emptySnapshot(),
      bullets:   [{ pos: { x: 100, y: 100 }, radius: 3, id: 0 }],
      asteroids: [{ pos: { x: 100, y: 100 }, radius: 48, id: 0 }],
      ufo:       { pos: { x: 100, y: 100 }, radius: 18 },
    }
    const pairs = detectCollisions(snap)
    expect(pairs).toContainEqual({ kind: 'bulletHitsAsteroid', bulletId: 0, asteroidId: 0 })
    expect(pairs.some(p => p.kind === 'bulletHitsUfo' && p.bulletId === 0)).toBe(false)
  })
})
