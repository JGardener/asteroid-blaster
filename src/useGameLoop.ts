/// <reference types="vite/client" />
import { useEffect, useRef } from 'react'
import { Application, Ticker } from 'pixi.js'
import { useGameStore } from './store'
import { InputState } from './input'
import { ObjectPool } from './ObjectPool'
import { Ship } from './entities/Ship'
import { Asteroid } from './entities/Asteroid'
import { Bullet } from './entities/Bullet'
import { circlesOverlap } from './collision'
import { asteroidsForLevel, speedForLevel, fireCooldownForLevel, ufoFrequencyForLevel, ufoAccuracyForLevel } from './progression'
import { BULLET_POOL_SIZE, ASTEROID_SCORE, COLOR_ACCENT, TRANSITION_DURATION_MS, INVINCIBILITY_FRAMES, PICKUP_DURATION, UFO_SCORE } from './constants'
import { Pickup } from './entities/Pickup'
import { type PickupType, spreadShotAngles, effectiveCooldown, tickPowerUp } from './powerup'
import { Ufo, type UfoSide } from './entities/Ufo'
import { UfoBullet } from './entities/UfoBullet'
import { ParticleSystem } from './effects/ParticleSystem'
import { Thruster }       from './effects/Thruster'
import { createStarField } from './effects/StarField'
import { screenShake }    from './effects/screenShake'
import { AudioEngine }    from './AudioEngine'
import { tickAudio }      from './tickAudio'
import type { AudioTickInput } from './tickAudio'
import { useAudioStore }  from './audioStore'

export function useGameLoop(app: Application, onError?: (err: Error) => void) {
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    const stage   = app.stage
    const audio   = new AudioEngine()
    const input   = new InputState()
    const bullets   = new ObjectPool(() => new Bullet(stage), BULLET_POOL_SIZE)
    const particles = new ParticleSystem(stage)
    const thruster  = new Thruster(stage)
    createStarField(stage)

    const { sfxVolume, musicVolume, isMuted } = useAudioStore.getState()
    audio.setSfxVolume(isMuted ? 0 : sfxVolume)
    audio.setMusicVolume(isMuted ? 0 : musicVolume)
    const unsubAudio = useAudioStore.subscribe(({ sfxVolume, musicVolume, isMuted }) => {
      audio.setSfxVolume(isMuted ? 0 : sfxVolume)
      audio.setMusicVolume(isMuted ? 0 : musicVolume)
    })

    const PICKUP_TYPES: PickupType[] = ['SpreadShot', 'RapidFire', 'Shield']

    const ufoBullets = new ObjectPool(() => new UfoBullet(stage), 8)

    let ship:              Ship | null = null
    let asteroids:         Asteroid[]  = []
    let fireCooldown       = 0
    let pauseWasDown       = false
    let confirmWasDown     = false
    let prevPhase          = useGameStore.getState().phase
    let prevLevel          = useGameStore.getState().level
    let transitionStart    = 0
    let carrierAsteroid:   Asteroid | null   = null
    let carrierPickupType: PickupType | null = null
    let pickup:            Pickup | null     = null
    let activePowerUp:     { type: PickupType; remaining: number } | null = null
    let ufo:               Ufo | null        = null
    let pendingUfoTimers:  number[]          = []   // countdown timers for scheduled UFOs

    function scheduleUfos(level: number): void {
      const count    = ufoFrequencyForLevel(level)
      const waveLen  = asteroidsForLevel(level) * 300   // rough wave duration in ticks
      pendingUfoTimers = []
      for (let i = 0; i < count; i++) {
        pendingUfoTimers.push(60 + Math.floor(Math.random() * (waveLen - 60)))
      }
    }

    function spawnWave(level: number) {
      for (let i = 0; i < asteroidsForLevel(level); i++) {
        asteroids.push(new Asteroid(stage, 'large'))
      }
      carrierAsteroid  = asteroids[Math.floor(Math.random() * asteroids.length)]
      carrierPickupType = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)]
      scheduleUfos(level)
    }

    function startGame() {
      asteroids.forEach(a => a.destroy())
      asteroids = []
      bullets.releaseAll(b => b.deactivate())
      ufoBullets.releaseAll(b => b.deactivate())
      ship?.destroy()
      pickup?.destroy(); pickup = null
      ufo?.destroy(); ufo = null
      pendingUfoTimers = []
      carrierAsteroid = null; carrierPickupType = null
      activePowerUp = null
      useGameStore.getState().resetGame()
      ship = new Ship(stage)
      spawnWave(1)
    }

    function tick(dt: number) {
      const { phase, level } = useGameStore.getState()
      const snap = input.snapshot()
      const ae: AudioTickInput = { fired: false, explosions: [], shipHit: false, waveCleared: false, gameStarted: false, pickupCollected: false, ufoAppeared: false, ufoShot: false }

      // Resume AudioContext on first user gesture (browser autoplay policy)
      const anyInput = snap.thrust || snap.fire || snap.left || snap.right || snap.pause || snap.confirm
      if (anyInput) audio.resume()

      // Music phase transitions ('transitioning' is transparent — music keeps running)
      if (phase !== prevPhase) {
        if (phase === 'playing' && prevPhase !== 'paused' && prevPhase !== 'transitioning') { audio.setMusicIntensity(level); audio.startMusic() }
        else if (phase === 'playing')  audio.resumeMusic()
        else if (phase === 'paused')   audio.pauseMusic()
        else if (phase === 'gameover') audio.stopMusic()
        prevPhase = phase
      }
      if (level !== prevLevel) { audio.setMusicIntensity(level); prevLevel = level }

      if (phase === 'menu') {
        if (snap.confirm && !confirmWasDown) { ae.gameStarted = true; startGame() }
        confirmWasDown = snap.confirm
        tickAudio(ae, audio)
        return
      }

      if (phase === 'gameover') {
        if (snap.confirm && !confirmWasDown) { ae.gameStarted = true; startGame() }
        confirmWasDown = snap.confirm
        tickAudio(ae, audio)
        return
      }

      if (phase === 'transitioning') {
        if (performance.now() - transitionStart >= TRANSITION_DURATION_MS) {
          spawnWave(useGameStore.getState().level)
          useGameStore.getState().setPhase('playing')
        }
        return
      }

      if (snap.pause && !pauseWasDown) {
        useGameStore.getState().setPhase(phase === 'paused' ? 'playing' : 'paused')
      }
      pauseWasDown = snap.pause
      if (phase === 'paused') return

      // ── playing ──────────────────────────────────────────────
      const speedMult       = speedForLevel(level) * dt
      const fireCooldownNow = fireCooldownForLevel(level)

      if (ship) ship.update(snap, dt)

      if (ship) {
        thruster.update(ship.pos.x, ship.pos.y, ship.rotation, ship.thrustOn, activePowerUp?.type === 'RapidFire')
      }
      particles.update(dt)

      if (snap.fire && fireCooldown <= 0 && ship) {
        const angles = activePowerUp?.type === 'SpreadShot'
          ? spreadShotAngles(ship.rotation)
          : [ship.rotation]
        let didFire = false
        for (const angle of angles) {
          const b = bullets.acquire()
          if (b) { b.init(ship.pos, angle); didFire = true }
        }
        if (didFire) {
          ae.fired = true
          fireCooldown = effectiveCooldown(fireCooldownNow, activePowerUp?.type ?? null)
        }
      }
      if (fireCooldown > 0) fireCooldown -= dt

      if (pickup?.active) pickup.update(dt)

      // UFO spawn scheduling
      for (let i = pendingUfoTimers.length - 1; i >= 0; i--) {
        pendingUfoTimers[i] -= dt
        if (pendingUfoTimers[i] <= 0 && !ufo?.active) {
          pendingUfoTimers.splice(i, 1)
          const side: UfoSide = Math.random() < 0.5 ? 'left' : 'right'
          ufo = new Ufo(stage, side)
          ae.ufoAppeared = true
        }
      }

      // UFO update and firing
      if (ufo?.active && ship) {
        const inaccuracy = 1 - ufoAccuracyForLevel(level)
        const fireAngle  = ufo.update(ship.pos, inaccuracy, dt)
        if (fireAngle !== null) {
          const b = ufoBullets.acquire()
          if (b) { b.init(ufo.pos, fireAngle) }
          ae.ufoShot = true
        }
      } else if (ufo && !ufo.active) {
        ufo = null
      }

      ufoBullets.forEach(b => b.update(dt))

      bullets.forEach(b => b.update(dt))
      asteroids.forEach(a => a.update(speedMult, dt))

      // Bullet ↔ Asteroid
      const fragments: Asteroid[] = []
      bullets.forEach(bullet => {
        for (const asteroid of asteroids) {
          if (!bullet.active || !asteroid.active) continue
          if (circlesOverlap(bullet.pos, bullet.radius, asteroid.pos, asteroid.radius)) {
            bullet.deactivate()
            useGameStore.getState().addScore(ASTEROID_SCORE[asteroid.size])
            fragments.push(...asteroid.split(stage))
            const burstCount = asteroid.size === 'large' ? 18 : asteroid.size === 'medium' ? 12 : 7
            particles.burst(asteroid.pos, burstCount, COLOR_ACCENT)
            ae.explosions.push(asteroid.size)
            if (asteroid === carrierAsteroid && carrierPickupType) {
              pickup?.destroy()
              pickup = new Pickup(stage, { ...asteroid.pos }, carrierPickupType)
              carrierAsteroid = null; carrierPickupType = null
            }
            asteroid.destroy()
            break
          }
        }
      })
      asteroids = asteroids.filter(a => a.active)
      asteroids.push(...fragments)

      // Bullet ↔ UFO
      if (ufo?.active) {
        bullets.forEach(bullet => {
          if (!bullet.active || !ufo?.active) return
          if (circlesOverlap(bullet.pos, bullet.radius, ufo.pos, ufo.radius)) {
            bullet.deactivate()
            useGameStore.getState().addScore(UFO_SCORE)
            ae.explosions.push('medium')
            ufo.destroy()
            ufo = null
          }
        })
      }

      // UFO bullet ↔ Ship
      if (ship && ship.invincible <= 0) {
        ufoBullets.forEach(ufoBullet => {
          if (!ufoBullet.active || !ship) return
          if (circlesOverlap(ufoBullet.pos, ufoBullet.radius, ship.pos, 10)) {
            ufoBullet.deactivate()
            if (activePowerUp?.type === 'Shield') {
              activePowerUp = null
              ship.setPowerUp(null)
              ship.invincible = INVINCIBILITY_FRAMES
            } else {
              ship.hit()
              useGameStore.getState().loseLife()
              screenShake(app.ticker, stage)
            }
            ae.shipHit = true
          }
        })
      }

      // Ship ↔ Pickup
      if (ship && pickup?.active) {
        if (circlesOverlap(ship.pos, 10, pickup.pos, pickup.radius)) {
          const type = pickup.type
          activePowerUp = { type, remaining: type === 'Shield' ? Infinity : PICKUP_DURATION }
          ship.setPowerUp(type)
          pickup.destroy(); pickup = null
          ae.pickupCollected = true
        }
      }

      // Ship ↔ Asteroid
      if (ship && ship.invincible <= 0) {
        for (const asteroid of asteroids) {
          if (circlesOverlap(ship.pos, 10, asteroid.pos, asteroid.radius)) {
            if (activePowerUp?.type === 'Shield') {
              activePowerUp = null
              ship.setPowerUp(null)
              ship.invincible = INVINCIBILITY_FRAMES
            } else {
              ship.hit()
              useGameStore.getState().loseLife()
              screenShake(app.ticker, stage)
            }
            ae.shipHit = true
            break
          }
        }
      }

      // Power-up timer
      if (activePowerUp) {
        const next = tickPowerUp(activePowerUp.remaining, dt)
        if (next <= 0) { activePowerUp = null; ship?.setPowerUp(null) }
        else activePowerUp.remaining = next
      }

      // Wave complete
      if (asteroids.length === 0) {
        ae.waveCleared = true
        pickup?.destroy(); pickup = null
        ufo?.destroy(); ufo = null
        pendingUfoTimers = []
        ufoBullets.releaseAll(b => b.deactivate())
        carrierAsteroid = null; carrierPickupType = null
        useGameStore.getState().nextLevel()
        transitionStart = performance.now()
        useGameStore.getState().setPhase('transitioning')
      }

      tickAudio(ae, audio)
    }

    const wrappedTick = (ticker: Ticker) => {
      try {
        tick(ticker.deltaTime)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('[AsteroidBlaster] Game loop error:', error)
        app.ticker.remove(wrappedTick)
        onErrorRef.current?.(error)  // onErrorRef always holds the latest onError prop
      } finally {
      }
    }
    app.ticker.add(wrappedTick)

    return () => {
      app.ticker?.remove(wrappedTick)
      ship?.destroy()
      asteroids.forEach(a => a.destroy())
      bullets.releaseAll()
      ufo?.destroy()
      ufoBullets.releaseAll()
      pickup?.destroy()
      input.destroy()
      audio.destroy()
      unsubAudio()
      useGameStore.getState().setPhase('menu')
    }
  }, [app])
}
