/// <reference types="vite/client" />
import { useEffect, useRef } from 'react'
import { Application, Ticker } from 'pixi.js'
import { useGameStore } from './store'
import { InputState } from './input'
import { ObjectPool } from './ObjectPool'
import { ShipData } from './entities/ShipData'
import { ShipRenderer } from './entities/ShipRenderer'
import { AsteroidData } from './entities/AsteroidData'
import { AsteroidRenderer } from './entities/AsteroidRenderer'
import { BulletData } from './entities/BulletData'
import { BulletRenderer } from './entities/BulletRenderer'
import { UfoBulletData } from './entities/UfoBulletData'
import { UfoBulletRenderer } from './entities/UfoBulletRenderer'
import { tickGameState, type GameLoopState, type GameEvent } from './tickGameState'
import { asteroidsForLevel } from './progression'
import { BULLET_POOL_SIZE, COLOR_ACCENT } from './constants'
import { PickupData } from './entities/PickupData'
import { PickupRenderer } from './entities/PickupRenderer'
import { type PickupType } from './powerup'
import { UfoData, type UfoSide } from './entities/UfoData'
import { UfoRenderer } from './entities/UfoRenderer'
import { ParticleSystem } from './effects/ParticleSystem'
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

    let shipData:           ShipData | null     = null
    let shipRenderer:       ShipRenderer | null = null
    let asteroids:          AsteroidData[]  = []
    let asteroidRenderers:  AsteroidRenderer[] = []
    let pauseWasDown        = false
    let confirmWasDown      = false
    let prevPhase           = useGameStore.getState().phase
    let prevLevel           = useGameStore.getState().level
    let carrierAsteroidIdx: number | null    = null
    let carrierPickupType:  PickupType | null = null
    let pickup:             PickupData | null    = null
    let pickupRenderer:     PickupRenderer | null = null
    let ufoData:            UfoData | null    = null
    let ufoRenderer:        UfoRenderer | null = null
    let pendingUfoTimers:   number[]         = []
    let transitionTimer     = 0

    function startGame() {
      asteroidRenderers.forEach(r => r.destroy())
      asteroids = []
      asteroidRenderers = []
      bulletPool.releaseAll()
      ufoBulletPool.releaseAll()
      shipRenderer?.destroy(); shipRenderer = null; shipData = null
      pickupRenderer?.destroy(); pickupRenderer = null; pickup = null
      ufoRenderer?.destroy(); ufoRenderer = null; ufoData = null
      pendingUfoTimers   = []
      carrierAsteroidIdx = null; carrierPickupType = null
      transitionTimer    = 0
      useGameStore.getState().resetGame()
      shipData     = new ShipData()
      shipRenderer = new ShipRenderer(stage)
      for (let i = 0; i < asteroidsForLevel(1); i++) {
        const speed = Math.random() * 0.8 + 0.4
        const angle = Math.random() * Math.PI * 2
        const data = new AsteroidData(
          'large',
          { x: Math.random() < 0.5 ? -48 : 960 + 48, y: Math.random() * 640 },
          { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        )
        asteroids.push(data)
        asteroidRenderers.push(new AsteroidRenderer(stage, data))
      }
      carrierAsteroidIdx = Math.floor(Math.random() * asteroids.length)
      carrierPickupType  = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)]
      // Level 1 has ufoFrequencyForLevel = 0, so no pending timers needed
    }

    function buildGameLoopState(): GameLoopState {
      const { level, phase, lives, score } = useGameStore.getState()
      return {
        ship: shipData ? {
          pos:              { ...shipData.pos },
          vel:              { ...shipData.vel },
          rotation:         shipData.rotation,
          invincible:       shipData.invincible,
          thrustOn:         shipData.thrustOn,
          powerUp:          shipData.powerUp,
          powerUpRemaining: shipData.powerUpRemaining,
          fireCooldown:     shipData.fireCooldown,
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
        ufo: ufoData?.active ? {
          pos: { ...ufoData.pos }, vel: { ...ufoData.vel },
          fireTimer: ufoData.fireTimer, active: true, radius: ufoData.radius,
        } : null,
        pickup: pickup?.active ? {
          pos: { ...pickup.pos }, vel: { ...pickup.vel },
          type: pickup.type, active: true, radius: pickup.radius,
        } : null,
        pendingUfoTimers: [...pendingUfoTimers],
        carrierAsteroidIdx,
        carrierPickupType,
        level, phase, lives, score,
        transitionTimer,
      }
    }

    function syncEntitiesToState(ns: GameLoopState): void {
      if (shipData && ns.ship) {
        shipData.pos.x           = ns.ship.pos.x
        shipData.pos.y           = ns.ship.pos.y
        shipData.vel.x           = ns.ship.vel.x
        shipData.vel.y           = ns.ship.vel.y
        shipData.rotation        = ns.ship.rotation
        shipData.invincible      = ns.ship.invincible
        shipData.thrustOn        = ns.ship.thrustOn
        shipData.powerUp         = ns.ship.powerUp
        shipData.powerUpRemaining = ns.ship.powerUpRemaining
        shipData.fireCooldown    = ns.ship.fireCooldown
        shipRenderer?.sync(shipData)
      }

      asteroids.forEach((a, i) => {
        const s = ns.asteroids[i]
        if (!s) return
        a.pos.x    = s.pos.x
        a.pos.y    = s.pos.y
        a.rotation = s.rotation
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

      if (ns.ufo && ufoData) {
        ufoData.pos.x     = ns.ufo.pos.x
        ufoData.pos.y     = ns.ufo.pos.y
        ufoData.fireTimer = ns.ufo.fireTimer
      }
    }

    function renderPIXI(): void {
      asteroids.forEach((a, i) => asteroidRenderers[i]?.sync(a))
      bulletPool.getAll().forEach((b, i) => bulletRenderers[i].sync(b))
      ufoBulletPool.getAll().forEach((b, i) => ufoBulletRenderers[i].sync(b))
      if (pickup && pickupRenderer) pickupRenderer.sync(pickup)
      if (ufoData && ufoRenderer) ufoRenderer.sync(ufoData)
    }

    function applyEventsToPIXI(ns: GameLoopState, events: GameEvent[]): void {
      for (const ev of events) {
        if (ev.type === 'particleBurst') {
          const burstCount = ev.size === 'large' ? 18 : ev.size === 'medium' ? 12 : 7
          particles.burst(ev.pos, burstCount, COLOR_ACCENT)
        }
        if (ev.type === 'screenShake') screenShake(app.ticker, stage)
        if (ev.type === 'spawnPickup') {
          pickupRenderer?.destroy()
          pickup         = new PickupData({ ...ev.pos }, ev.pickupType)
          pickupRenderer = new PickupRenderer(stage, pickup)
        }
      }

      // Asteroid reconciliation: destroy renderers for hit asteroids, create for fragments/new wave
      const destroyedIdxs = events
        .filter((e): e is { type: 'asteroidDestroyed'; idx: number } => e.type === 'asteroidDestroyed')
        .map(e => e.idx)
        .sort((a, b) => b - a)  // descending so splice doesn't shift lower indices
      for (const idx of destroyedIdxs) {
        asteroidRenderers[idx]?.destroy()
        asteroids.splice(idx, 1)
        asteroidRenderers.splice(idx, 1)
      }
      while (asteroids.length < ns.asteroids.length) {
        const s    = ns.asteroids[asteroids.length]
        const data = new AsteroidData(s.size, { ...s.pos }, { ...s.vel }, s.rotationSpeed)
        asteroids.push(data)
        asteroidRenderers.push(new AsteroidRenderer(stage, data))
      }

      // UFO entity lifecycle
      if (ns.ufo && !ufoData) {
        const side: UfoSide = ns.ufo.vel.x > 0 ? 'left' : 'right'
        ufoData            = new UfoData(side, { ...ns.ufo.pos })
        ufoData.vel.x      = ns.ufo.vel.x
        ufoData.vel.y      = ns.ufo.vel.y
        ufoData.fireTimer  = ns.ufo.fireTimer
        ufoRenderer        = new UfoRenderer(stage)
      } else if (!ns.ufo && ufoData) {
        ufoRenderer?.destroy()
        ufoRenderer = null
        ufoData     = null
      }

      // Pickup disappear (grabbed by ship or cleared on wave end — but not when a new one was just spawned)
      if (!ns.pickup && pickup && !events.some(e => e.type === 'spawnPickup')) {
        pickup.active = false
        pickupRenderer?.destroy()
        pickupRenderer = null
        pickup         = null
      }

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
      shipRenderer?.destroy()
      asteroidRenderers.forEach(r => r.destroy())
      bulletPool.releaseAll()
      bulletRenderers.forEach(r => r.destroy())
      ufoRenderer?.destroy()
      ufoBulletPool.releaseAll()
      ufoBulletRenderers.forEach(r => r.destroy())
      pickupRenderer?.destroy()
      input.destroy()
      audio.destroy()
      unsubAudio()
      useGameStore.getState().setPhase('menu')
    }
  }, [app])
}
