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

    // PIXI-side entity renderers (parallel to gameLoopState arrays)
    let shipRenderer:       ShipRenderer | null  = null
    let asteroidRenderers:  AsteroidRenderer[]   = []
    let ufoRenderer:        UfoRenderer | null   = null
    let pickupRenderer:     PickupRenderer | null = null

    let pauseWasDown   = false
    let confirmWasDown = false
    let prevPhase      = useGameStore.getState().phase
    let prevLevel      = useGameStore.getState().level

    // Authoritative game state — entity fields hold *Data instances
    const gameLoopState: GameLoopState = {
      ship:              null,
      asteroids:         [],
      bullets:           bulletPool.getAll(),
      ufoBullets:        ufoBulletPool.getAll(),
      ufo:               null,
      pickup:            null,
      pendingUfoTimers:  [],
      carrierAsteroidIdx: null,
      carrierPickupType: null,
      level:             1,
      phase:             'playing',
      lives:             3,
      score:             0,
      transitionTimer:   0,
    }

    function startGame() {
      asteroidRenderers.forEach(r => r.destroy())
      asteroidRenderers = []
      shipRenderer?.destroy(); shipRenderer = null
      pickupRenderer?.destroy(); pickupRenderer = null
      ufoRenderer?.destroy(); ufoRenderer = null
      bulletPool.releaseAll()
      ufoBulletPool.releaseAll()

      useGameStore.getState().resetGame()

      const shipData  = new ShipData()
      shipRenderer    = new ShipRenderer(stage)

      gameLoopState.ship              = shipData
      gameLoopState.asteroids.length  = 0
      gameLoopState.ufo               = null
      gameLoopState.pickup            = null
      gameLoopState.pendingUfoTimers  = []
      gameLoopState.carrierAsteroidIdx = null
      gameLoopState.carrierPickupType = null
      gameLoopState.transitionTimer   = 0

      for (let i = 0; i < asteroidsForLevel(1); i++) {
        const speed = Math.random() * 0.8 + 0.4
        const angle = Math.random() * Math.PI * 2
        const data  = new AsteroidData(
          'large',
          { x: Math.random() < 0.5 ? -48 : 960 + 48, y: Math.random() * 640 },
          { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        )
        gameLoopState.asteroids.push(data)
        asteroidRenderers.push(new AsteroidRenderer(stage, data))
      }
      gameLoopState.carrierAsteroidIdx = Math.floor(Math.random() * gameLoopState.asteroids.length)
      gameLoopState.carrierPickupType  = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)]
    }

    function applyEventsToPIXI(state: GameLoopState, events: GameEvent[]): void {
      for (const ev of events) {
        if (ev.type === 'particleBurst') {
          const burstCount = ev.size === 'large' ? 18 : ev.size === 'medium' ? 12 : 7
          particles.burst(ev.pos, burstCount, COLOR_ACCENT)
        }
        if (ev.type === 'screenShake') screenShake(app.ticker, stage)
        if (ev.type === 'spawnPickup') {
          pickupRenderer?.destroy()
          const pd      = new PickupData({ ...ev.pos }, ev.pickupType)
          state.pickup  = pd
          pickupRenderer = new PickupRenderer(stage, pd)
        }
      }

      // Asteroid destruction: tickGameState already spliced state.asteroids; splice matching renderers
      const destroyedIdxs = events
        .filter((e): e is { type: 'asteroidDestroyed'; idx: number } => e.type === 'asteroidDestroyed')
        .map(e => e.idx)
        .sort((a, b) => b - a)
      for (const idx of destroyedIdxs) {
        asteroidRenderers[idx]?.destroy()
        asteroidRenderers.splice(idx, 1)
      }

      // Asteroid fragments: create AsteroidData + renderer for each fragment
      for (const ev of events) {
        if (ev.type === 'asteroidFragmented') {
          for (const frag of ev.fragments) {
            const data = new AsteroidData(frag.size, { ...frag.pos }, { ...frag.vel }, frag.rotationSpeed)
            state.asteroids.push(data)
            asteroidRenderers.push(new AsteroidRenderer(stage, data))
          }
        }
      }

      // Wave spawn: tickGameState cleared state.asteroids; create AsteroidData + renderers
      for (const ev of events) {
        if (ev.type === 'waveSpawned') {
          // Destroy any stale renderers (should be none post-wave-clear, but guard anyway)
          asteroidRenderers.forEach(r => r.destroy())
          asteroidRenderers = []
          for (const params of ev.asteroids) {
            const data = new AsteroidData('large', { ...params.pos }, { ...params.vel }, params.rotationSpeed)
            state.asteroids.push(data)
            asteroidRenderers.push(new AsteroidRenderer(stage, data))
          }
        }
      }

      // UFO lifecycle: tickGameState sets state.ufo to plain literal on spawn; upgrade here
      if (state.ufo && !ufoRenderer) {
        const side: UfoSide = state.ufo.vel.x > 0 ? 'left' : 'right'
        const ufoData       = new UfoData(side, { ...state.ufo.pos })
        ufoData.vel.x       = state.ufo.vel.x
        ufoData.vel.y       = state.ufo.vel.y
        ufoData.fireTimer   = state.ufo.fireTimer
        state.ufo           = ufoData
        ufoRenderer         = new UfoRenderer(stage)
      } else if (!state.ufo && ufoRenderer) {
        ufoRenderer.destroy()
        ufoRenderer = null
      }

      // Pickup consumed (grabbed or wave cleared) — but not when a new one was just spawned
      if (!state.pickup && pickupRenderer && !events.some(e => e.type === 'spawnPickup')) {
        pickupRenderer.destroy()
        pickupRenderer = null
      }
    }

    function renderPIXI(): void {
      if (gameLoopState.ship && shipRenderer) shipRenderer.sync(gameLoopState.ship as ShipData)
      gameLoopState.asteroids.forEach((a, i) => asteroidRenderers[i]?.sync(a as AsteroidData))
      gameLoopState.bullets.forEach((b, i) => bulletRenderers[i].sync(b as BulletData))
      gameLoopState.ufoBullets.forEach((b, i) => ufoBulletRenderers[i].sync(b as UfoBulletData))
      if (gameLoopState.pickup && pickupRenderer) pickupRenderer.sync(gameLoopState.pickup as PickupData)
      if (gameLoopState.ufo && ufoRenderer) ufoRenderer.sync(gameLoopState.ufo as UfoData)
    }

    function syncStore(events: GameEvent[]): void {
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
      // Scalars are authoritative in the store; refresh each tick
      const { phase, level, restartRequested } = useGameStore.getState()
      gameLoopState.phase = phase
      gameLoopState.level = level

      if (restartRequested) {
        useGameStore.getState().clearRestartRequest()
        prevPhase = 'menu'
        startGame()
        return
      }

      const snap = input.snapshot()
      const ae: AudioTickInput = { fired: false, explosions: [], shipHit: false, waveCleared: false, gameStarted: false, pickupCollected: false, ufoAppeared: false, ufoShot: false }

      const anyInput = snap.thrust || snap.fire || snap.left || snap.right || snap.pause || snap.confirm
      if (anyInput) audio.resume()

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
        const newPhase = phase === 'paused' ? 'playing' : 'paused'
        useGameStore.getState().setPhase(newPhase)
        gameLoopState.phase = newPhase
      }
      pauseWasDown = snap.pause
      if (phase === 'paused') return

      // ── playing / transitioning ───────────────────────────────────────────────
      const events = tickGameState(gameLoopState, snap, dt)

      applyEventsToPIXI(gameLoopState, events)
      renderPIXI()

      particles.update(dt)

      syncStore(events)
      playAudio(events, ae)
    }

    const wrappedTick = (ticker: Ticker) => {
      try {
        tick(ticker.deltaTime)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('[AsteroidBlaster] Game loop error:', error)
        app.ticker.remove(wrappedTick)
        onErrorRef.current?.(error)
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
