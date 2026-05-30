/// <reference types="vite/client" />
import { useEffect, useRef } from 'react'
import { Application, Ticker } from 'pixi.js'
import { useGameStore } from './store'
import { InputState } from './input'
import { ObjectPool } from './ObjectPool'
import { Ship } from './entities/Ship'
import { Asteroid } from './entities/Asteroid'
import { BulletData } from './entities/BulletData'
import { BulletRenderer } from './entities/BulletRenderer'
import { UfoBulletData } from './entities/UfoBulletData'
import { UfoBulletRenderer } from './entities/UfoBulletRenderer'
import { tickGameState, type GameLoopState, type GameEvent } from './tickGameState'
import { asteroidsForLevel } from './progression'
import { BULLET_POOL_SIZE, COLOR_ACCENT } from './constants'
import { Pickup } from './entities/Pickup'
import { type PickupType } from './powerup'
import { Ufo, type UfoSide } from './entities/Ufo'
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
    const bulletPool      = new ObjectPool(() => new BulletData(), BULLET_POOL_SIZE)
    const bulletRenderers = Array.from({ length: BULLET_POOL_SIZE }, () => new BulletRenderer(stage))
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

    const ufoBulletPool      = new ObjectPool(() => new UfoBulletData(), 8)
    const ufoBulletRenderers = Array.from({ length: 8 }, () => new UfoBulletRenderer(stage))

    let ship:               Ship | null = null
    let asteroids:          Asteroid[]  = []
    let fireCooldown        = 0
    let pauseWasDown        = false
    let confirmWasDown      = false
    let prevPhase           = useGameStore.getState().phase
    let prevLevel           = useGameStore.getState().level
    let carrierAsteroidIdx: number | null    = null
    let carrierPickupType:  PickupType | null = null
    let pickup:             Pickup | null    = null
    let activePowerUp:      { type: PickupType; remaining: number } | null = null
    let ufo:                Ufo | null       = null
    let pendingUfoTimers:   number[]         = []
    let transitionTimer     = 0

    function startGame() {
      asteroids.forEach(a => a.destroy())
      asteroids = []
      bulletPool.releaseAll()
      ufoBulletPool.releaseAll()
      ship?.destroy()
      pickup?.destroy(); pickup = null
      ufo?.destroy(); ufo = null
      pendingUfoTimers   = []
      carrierAsteroidIdx = null; carrierPickupType = null
      activePowerUp      = null
      transitionTimer    = 0
      useGameStore.getState().resetGame()
      ship = new Ship(stage)
      for (let i = 0; i < asteroidsForLevel(1); i++) {
        asteroids.push(new Asteroid(stage, 'large'))
      }
      carrierAsteroidIdx = Math.floor(Math.random() * asteroids.length)
      carrierPickupType  = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)]
      // Level 1 has ufoFrequencyForLevel = 0, so no pending timers needed
    }

    function buildGameLoopState(): GameLoopState {
      const { level, phase, lives, score } = useGameStore.getState()
      return {
        ship: ship ? {
          pos:        { ...ship.pos },
          vel:        { ...ship.vel },
          rotation:   ship.rotation,
          invincible: ship.invincible,
          thrustOn:   ship.thrustOn,
          powerUp:    activePowerUp?.type ?? null,
        } : null,
        asteroids: asteroids.map(a => ({
          pos: { ...a.pos }, vel: { ...a.vel },
          size: a.size, radius: a.radius,
          rotation: a.rotation, rotationSpeed: a.rotationSpeed,
        })),
        bullets: bulletPool.getAll().map(b => ({
          pos: { ...b.pos }, vel: { ...b.vel },
          lifetime: b.lifetime, active: b.active, radius: b.radius,
        })),
        ufoBullets: ufoBulletPool.getAll().map(b => ({
          pos: { ...b.pos }, vel: { ...b.vel }, active: b.active, radius: b.radius,
        })),
        ufo: ufo?.active ? {
          pos: { ...ufo.pos }, vel: { ...ufo.vel },
          fireTimer: ufo.fireTimer, active: true, radius: ufo.radius,
        } : null,
        pickup: pickup?.active ? {
          pos: { ...pickup.pos }, vel: { ...pickup.vel },
          type: pickup.type, active: true, radius: pickup.radius,
        } : null,
        activePowerUp:    activePowerUp ? { ...activePowerUp } : null,
        pendingUfoTimers: [...pendingUfoTimers],
        fireCooldown,
        carrierAsteroidIdx,
        carrierPickupType,
        level, phase, lives, score,
        transitionTimer,
      }
    }

    function syncEntitiesToState(ns: GameLoopState): void {
      if (ship && ns.ship) {
        ship.pos.x        = ns.ship.pos.x
        ship.pos.y        = ns.ship.pos.y
        ship.vel.x        = ns.ship.vel.x
        ship.vel.y        = ns.ship.vel.y
        ship.rotation     = ns.ship.rotation
        ship.invincible   = ns.ship.invincible
        ship.thrustOn     = ns.ship.thrustOn
        ship.gfx.x        = ns.ship.pos.x
        ship.gfx.y        = ns.ship.pos.y
        ship.gfx.rotation = ns.ship.rotation + Math.PI / 2
        ship.gfx.alpha    = (ship.invincible > 0 && ship.invincible % 6 < 3) ? 0.3 : 1
      }

      asteroids.forEach((a, i) => {
        const s = ns.asteroids[i]
        if (!s) return
        a.pos.x        = s.pos.x
        a.pos.y        = s.pos.y
        a.rotation     = s.rotation
        a.gfx.x        = s.pos.x
        a.gfx.y        = s.pos.y
        a.gfx.rotation = s.rotation
      })

      bulletPool.getAll().forEach((b, i) => {
        const s = ns.bullets[i]
        if (!s) return
        b.pos.x    = s.pos.x
        b.pos.y    = s.pos.y
        b.vel.x    = s.vel.x
        b.vel.y    = s.vel.y
        b.lifetime = s.lifetime
        b.active   = s.active
      })

      ufoBulletPool.getAll().forEach((b, i) => {
        const s = ns.ufoBullets[i]
        if (!s) return
        b.pos.x  = s.pos.x
        b.pos.y  = s.pos.y
        b.vel.x  = s.vel.x
        b.vel.y  = s.vel.y
        b.active = s.active
      })

      if (ns.ufo && ufo) {
        ufo.pos.x     = ns.ufo.pos.x
        ufo.pos.y     = ns.ufo.pos.y
        ufo.fireTimer = ns.ufo.fireTimer
        ufo.gfx.x     = ns.ufo.pos.x
        ufo.gfx.y     = ns.ufo.pos.y
      }
    }

    function renderPIXI(): void {
      bulletPool.getAll().forEach((b, i) => bulletRenderers[i].sync(b))
      ufoBulletPool.getAll().forEach((b, i) => ufoBulletRenderers[i].sync(b))
    }

    function applyEventsToPIXI(ns: GameLoopState, events: GameEvent[]): void {
      for (const ev of events) {
        if (ev.type === 'particleBurst') {
          const burstCount = ev.size === 'large' ? 18 : ev.size === 'medium' ? 12 : 7
          particles.burst(ev.pos, burstCount, COLOR_ACCENT)
        }
        if (ev.type === 'screenShake') screenShake(app.ticker, stage)
        if (ev.type === 'spawnPickup') {
          pickup?.destroy()
          pickup = new Pickup(stage, { ...ev.pos }, ev.pickupType)
        }
      }

      // Asteroid reconciliation: destroy PIXI entities for hit asteroids, create for fragments/new wave
      const destroyedIdxs = events
        .filter((e): e is { type: 'asteroidDestroyed'; idx: number } => e.type === 'asteroidDestroyed')
        .map(e => e.idx)
        .sort((a, b) => b - a)  // descending so splice doesn't shift lower indices
      for (const idx of destroyedIdxs) {
        asteroids[idx]?.destroy()
        asteroids.splice(idx, 1)
      }
      while (asteroids.length < ns.asteroids.length) {
        const s = ns.asteroids[asteroids.length]
        asteroids.push(new Asteroid(stage, s.size, { ...s.pos }, { ...s.vel }))
      }

      // UFO entity lifecycle
      if (ns.ufo && !ufo) {
        const side: UfoSide = ns.ufo.vel.x > 0 ? 'left' : 'right'
        ufo           = new Ufo(stage, side)
        ufo.pos.x     = ns.ufo.pos.x
        ufo.pos.y     = ns.ufo.pos.y
        ufo.vel.x     = ns.ufo.vel.x
        ufo.vel.y     = ns.ufo.vel.y
        ufo.fireTimer = ns.ufo.fireTimer
        ufo.active    = true
      } else if (!ns.ufo && ufo) {
        ufo.active      = false
        ufo.gfx.visible = false
        ufo = null
      }

      // Pickup disappear (grabbed by ship or cleared on wave end — but not when a new one was just spawned)
      if (!ns.pickup && pickup && !events.some(e => e.type === 'spawnPickup')) {
        pickup.destroy()
        pickup = null
      }

      // activePowerUp → ship visual sync
      if (ns.activePowerUp?.type !== activePowerUp?.type) {
        ship?.setPowerUp(ns.activePowerUp?.type ?? null)
      }
      activePowerUp = ns.activePowerUp
    }

    function syncStore(ns: GameLoopState, events: GameEvent[]): void {
      const store = useGameStore.getState()
      for (const ev of events) {
        if (ev.type === 'score')     store.addScore(ev.delta)
        if (ev.type === 'loseLife')  store.loseLife()
        if (ev.type === 'nextLevel') store.nextLevel()
        if (ev.type === 'setPhase')  store.setPhase(ev.phase)
      }
    }

    function playAudio(events: GameEvent[], ae: AudioTickInput): void {
      for (const ev of events) {
        if (ev.type !== 'audio') continue
        switch (ev.cue) {
          case 'shot':            ae.fired           = true;     break
          case 'explode_large':   ae.explosions.push('large');   break
          case 'explode_medium':  ae.explosions.push('medium');  break
          case 'explode_small':   ae.explosions.push('small');   break
          case 'shipHit':         ae.shipHit         = true;     break
          case 'waveCleared':     ae.waveCleared     = true;     break
          case 'pickupCollected': ae.pickupCollected = true;     break
          case 'ufoAppeared':     ae.ufoAppeared     = true;     break
          case 'ufoShot':         ae.ufoShot         = true;     break
          default: break
        }
      }
      tickAudio(ae, audio)
    }

    function tick(dt: number) {
      const { phase, level, restartRequested } = useGameStore.getState()

      if (restartRequested) {
        useGameStore.getState().clearRestartRequest()
        prevPhase = 'menu'  // makes music logic call startMusic() on next tick
        startGame()
        return
      }

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

      if (snap.pause && !pauseWasDown) {
        useGameStore.getState().setPhase(phase === 'paused' ? 'playing' : 'paused')
      }
      pauseWasDown = snap.pause
      if (phase === 'paused') return

      // ── playing / transitioning ───────────────────────────────────────────────
      const { newState, events } = tickGameState(buildGameLoopState(), snap, dt)

      applyEventsToPIXI(newState, events)
      syncEntitiesToState(newState)
      renderPIXI()

      // Sync local vars from newState (tickGameState owns these now)
      transitionTimer    = newState.transitionTimer
      pendingUfoTimers   = newState.pendingUfoTimers
      carrierAsteroidIdx = newState.carrierAsteroidIdx
      carrierPickupType  = newState.carrierPickupType
      fireCooldown       = newState.fireCooldown

      // PIXI-only: thruster + particles
      if (ship) {
        thruster.update(ship.pos.x, ship.pos.y, ship.rotation, ship.thrustOn, activePowerUp?.type === 'RapidFire')
      }
      particles.update(dt)

      if (pickup?.active) pickup.update(dt)

      syncStore(newState, events)
      playAudio(events, ae)
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
      bulletPool.releaseAll()
      bulletRenderers.forEach(r => r.destroy())
      ufo?.destroy()
      ufoBulletPool.releaseAll()
      ufoBulletRenderers.forEach(r => r.destroy())
      pickup?.destroy()
      input.destroy()
      audio.destroy()
      unsubAudio()
      useGameStore.getState().setPhase('menu')
    }
  }, [app])
}
