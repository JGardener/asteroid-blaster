/// <reference types="vite/client" />
import { useEffect, useRef } from 'react'
import { Application, Ticker } from 'pixi.js'
import type Stats from 'stats.js'
import { useGameStore } from './store'
import { InputState } from './input'
import { ObjectPool } from './ObjectPool'
import { Ship } from './entities/Ship'
import { Asteroid } from './entities/Asteroid'
import { Bullet } from './entities/Bullet'
import { circlesOverlap } from './collision'
import { asteroidsForLevel, speedForLevel, fireCooldownForLevel } from './progression'
import { BULLET_POOL_SIZE, ASTEROID_SCORE, COLOR_ACCENT } from './constants'
import { ParticleSystem } from './effects/ParticleSystem'
import { Thruster }       from './effects/Thruster'
import { createStarField } from './effects/StarField'
import { screenShake }    from './effects/screenShake'
import { AudioEngine }    from './AudioEngine'
import { tickAudio }      from './tickAudio'
import type { AudioTickInput } from './tickAudio'

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

    let stats: Stats | null = null
    if (import.meta.env.DEV) {
      import('stats.js').then(({ default: Stats }) => {
        stats = new Stats()
        stats.showPanel(0)
        Object.assign(stats.dom.style, { position: 'fixed', top: '0', left: '0', zIndex: '9999' })
        document.body.appendChild(stats.dom)
      })
    }

    let ship:          Ship | null = null
    let asteroids:     Asteroid[]  = []
    let fireCooldown   = 0
    let pauseWasDown   = false
    let confirmWasDown = false

    function spawnWave(level: number) {
      for (let i = 0; i < asteroidsForLevel(level); i++) {
        asteroids.push(new Asteroid(stage, 'large'))
      }
    }

    function startGame() {
      asteroids.forEach(a => a.destroy())
      asteroids = []
      bullets.releaseAll(b => b.deactivate())
      ship?.destroy()
      useGameStore.getState().resetGame()
      ship = new Ship(stage)
      spawnWave(1)
    }

    function tick(dt: number) {
      const { phase, level } = useGameStore.getState()
      const snap = input.snapshot()
      const ae: AudioTickInput = { fired: false, explosions: [], shipHit: false, waveCleared: false, gameStarted: false }

      // Resume AudioContext on first user gesture (browser autoplay policy)
      const anyInput = snap.thrust || snap.fire || snap.left || snap.right || snap.pause || snap.confirm
      if (anyInput) audio.resume()

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
        thruster.update(ship.pos.x, ship.pos.y, ship.rotation, ship.thrustOn)
      }
      particles.update(dt)

      if (snap.fire && fireCooldown <= 0 && ship) {
        const b = bullets.acquire()
        if (b) {
          b.init(ship.pos, ship.rotation)
          fireCooldown = fireCooldownNow
          ae.fired = true
        }
      }
      if (fireCooldown > 0) fireCooldown -= dt

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
            asteroid.destroy()
            break
          }
        }
      })
      asteroids = asteroids.filter(a => a.active)
      asteroids.push(...fragments)

      // Ship ↔ Asteroid
      if (ship && ship.invincible <= 0) {
        for (const asteroid of asteroids) {
          if (circlesOverlap(ship.pos, 10, asteroid.pos, asteroid.radius)) {
            ship.hit()
            useGameStore.getState().loseLife()
            screenShake(app.ticker, stage)
            ae.shipHit = true
            break
          }
        }
      }

      // Wave complete
      if (asteroids.length === 0) {
        const nextLevel = useGameStore.getState().level + 1
        useGameStore.getState().nextLevel()
        spawnWave(nextLevel)
        ae.waveCleared = true
      }

      tickAudio(ae, audio)
    }

    const wrappedTick = (ticker: Ticker) => {
      stats?.begin()
      try {
        tick(ticker.deltaTime)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('[AsteroidBlaster] Game loop error:', error)
        app.ticker.remove(wrappedTick)
        onErrorRef.current?.(error)  // onErrorRef always holds the latest onError prop
      } finally {
        stats?.end()
      }
    }
    app.ticker.add(wrappedTick)

    return () => {
      app.ticker?.remove(wrappedTick)
      ship?.destroy()
      asteroids.forEach(a => a.destroy())
      bullets.releaseAll()
      input.destroy()
      audio.destroy()
      useGameStore.getState().setPhase('menu')
      if (stats?.dom.parentNode) stats.dom.parentNode.removeChild(stats.dom)
    }
  }, [app])
}
