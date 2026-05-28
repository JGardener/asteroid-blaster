import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioEngine } from '../AudioEngine'
import { tickAudio } from '../tickAudio'

// ── Mock factory ──────────────────────────────────────────────────────────────

function makeNode() {
  return {
    type: 'sine' as OscillatorType,
    frequency: {
      value: 440,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function makeMockCtx(state: AudioContextState = 'running') {
  return {
    state,
    currentTime: 0,
    sampleRate: 44100,
    destination: {} as AudioDestinationNode,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => makeNode()),
    createGain: vi.fn(() => makeNode()),
    createBuffer: vi.fn((_ch: number, frames: number) => ({
      getChannelData: vi.fn(() => new Float32Array(frames)),
      length: frames,
      sampleRate: 44100,
    })),
    createBufferSource: vi.fn(() => makeNode()),
  } as unknown as AudioContext
}

// ── resume ────────────────────────────────────────────────────────────────────

describe('resume', () => {
  it('calls ctx.resume() when context is suspended', async () => {
    const ctx = makeMockCtx('suspended')
    const engine = new AudioEngine(ctx)
    await engine.resume()
    expect(ctx.resume).toHaveBeenCalledOnce()
  })

  it('does not call ctx.resume() when context is already running', async () => {
    const ctx = makeMockCtx('running')
    const engine = new AudioEngine(ctx)
    await engine.resume()
    expect(ctx.resume).not.toHaveBeenCalled()
  })
})

// ── playShoot ─────────────────────────────────────────────────────────────────

describe('playShoot', () => {
  it('creates and starts an oscillator', () => {
    const ctx = makeMockCtx()
    const engine = new AudioEngine(ctx)
    engine.playShoot()
    expect(ctx.createOscillator).toHaveBeenCalled()
    const osc = (ctx.createOscillator as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(osc.start).toHaveBeenCalled()
  })
})

// ── playExplosion ─────────────────────────────────────────────────────────────

describe('playExplosion', () => {
  it('starts at a lower frequency for large than for small', () => {
    const ctxLarge = makeMockCtx()
    new AudioEngine(ctxLarge).playExplosion('large')
    const largeOsc = (ctxLarge.createOscillator as ReturnType<typeof vi.fn>).mock.results[0].value
    const largeFreq = largeOsc.frequency.setValueAtTime.mock.calls[0][0] as number

    const ctxSmall = makeMockCtx()
    new AudioEngine(ctxSmall).playExplosion('small')
    const smallOsc = (ctxSmall.createOscillator as ReturnType<typeof vi.fn>).mock.results[0].value
    const smallFreq = smallOsc.frequency.setValueAtTime.mock.calls[0][0] as number

    expect(largeFreq).toBeLessThan(smallFreq)
  })
})

// ── remaining sounds (smoke tests) ───────────────────────────────────────────

describe.each([
  ['playShipDeath',  (e: AudioEngine) => e.playShipDeath()],
  ['playUfoAppear',  (e: AudioEngine) => e.playUfoAppear()],
  ['playUfoShoot',   (e: AudioEngine) => e.playUfoShoot()],
  ['playPickup',     (e: AudioEngine) => e.playPickup()],
  ['playLevelUp',    (e: AudioEngine) => e.playLevelUp()],
  ['playMenuSelect', (e: AudioEngine) => e.playMenuSelect()],
] as const)('%s', (_name, call) => {
  it('schedules audio nodes without throwing', () => {
    const ctx = makeMockCtx()
    const engine = new AudioEngine(ctx)
    expect(() => call(engine)).not.toThrow()
    expect(ctx.createOscillator).toHaveBeenCalled()
  })
})

// ── destroy ───────────────────────────────────────────────────────────────────

describe('destroy', () => {
  it('closes the AudioContext', () => {
    const ctx = makeMockCtx()
    const engine = new AudioEngine(ctx)
    engine.destroy()
    expect(ctx.close).toHaveBeenCalledOnce()
  })

  it('makes all play methods no-ops after destroy', () => {
    const ctx = makeMockCtx()
    const engine = new AudioEngine(ctx)
    engine.destroy()
    ;(ctx.createOscillator as ReturnType<typeof vi.fn>).mockClear()

    engine.playShoot()
    engine.playExplosion('large')
    engine.playShipDeath()
    engine.playUfoAppear()
    engine.playUfoShoot()
    engine.playPickup()
    engine.playLevelUp()
    engine.playMenuSelect()

    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })
})

// ── music ─────────────────────────────────────────────────────────────────────

describe('music', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  describe('startMusic', () => {
    it('schedules a note after the first scheduler tick fires', () => {
      const ctx = makeMockCtx()
      const engine = new AudioEngine(ctx)
      engine.startMusic()
      vi.advanceTimersByTime(30) // past one 25ms tick
      expect(ctx.createOscillator).toHaveBeenCalled()
    })
  })

  describe('stopMusic', () => {
    it('clears the scheduler so no further notes are created', () => {
      const ctx = makeMockCtx()
      const engine = new AudioEngine(ctx)
      engine.startMusic()
      vi.advanceTimersByTime(30)
      ;(ctx.createOscillator as ReturnType<typeof vi.fn>).mockClear()
      engine.stopMusic()
      vi.advanceTimersByTime(200)
      expect(ctx.createOscillator).not.toHaveBeenCalled()
    })
  })

  describe('pauseMusic', () => {
    it('ramps master gain toward zero', () => {
      const ctx = makeMockCtx()
      const engine = new AudioEngine(ctx)
      engine.startMusic()
      // don't advance timers — only master gain exists at this point
      const masterGain = (ctx.createGain as ReturnType<typeof vi.fn>).mock.results[0].value
      engine.pauseMusic()
      expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        expect.closeTo(0, 1),
        expect.any(Number),
      )
    })
  })

  describe('resumeMusic', () => {
    it('ramps master gain back to 1', () => {
      const ctx = makeMockCtx()
      const engine = new AudioEngine(ctx)
      engine.startMusic()
      const masterGain = (ctx.createGain as ReturnType<typeof vi.fn>).mock.results[0].value
      engine.pauseMusic()
      engine.resumeMusic()
      const calls = (masterGain.gain.linearRampToValueAtTime as ReturnType<typeof vi.fn>).mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[0]).toBeCloseTo(1, 5)
    })
  })

  describe('setMusicIntensity', () => {
    it('schedules more notes per second at level 3 than level 1', () => {
      function countNotesForLevel(level: number): number {
        const ctx = makeMockCtx()
        const mockCtx = ctx as unknown as { currentTime: number }
        const engine = new AudioEngine(ctx)
        engine.setMusicIntensity(level)
        engine.startMusic()
        vi.advanceTimersByTime(30) // first tick at t=0
        mockCtx.currentTime = 1   // simulate 1 second elapsed
        vi.advanceTimersByTime(30) // second tick catches up
        engine.stopMusic()
        return (ctx.createOscillator as ReturnType<typeof vi.fn>).mock.calls.length
      }

      expect(countNotesForLevel(3)).toBeGreaterThan(countNotesForLevel(1))
    })
  })

  describe('destroy guard', () => {
    it('startMusic() is a no-op after destroy', () => {
      const ctx = makeMockCtx()
      const engine = new AudioEngine(ctx)
      engine.destroy()
      ;(ctx.createGain as ReturnType<typeof vi.fn>).mockClear()
      engine.startMusic()
      expect(ctx.createGain).not.toHaveBeenCalled()
    })
  })
})

// ── tickAudio ─────────────────────────────────────────────────────────────────

function makeMockAudio(): AudioEngine {
  return {
    resume:             vi.fn(),
    playShoot:          vi.fn(),
    playExplosion:      vi.fn(),
    playShipDeath:      vi.fn(),
    playUfoAppear:      vi.fn(),
    playUfoShoot:       vi.fn(),
    playPickup:         vi.fn(),
    playLevelUp:        vi.fn(),
    playMenuSelect:     vi.fn(),
    startMusic:         vi.fn(),
    stopMusic:          vi.fn(),
    pauseMusic:         vi.fn(),
    resumeMusic:        vi.fn(),
    setMusicIntensity:  vi.fn(),
    destroy:            vi.fn(),
  } as unknown as AudioEngine
}

const silent = { fired: false, explosions: [] as import('../types').AsteroidSize[], shipHit: false, waveCleared: false, gameStarted: false }

describe('tickAudio', () => {
  it('plays shoot when a bullet is fired', () => {
    const audio = makeMockAudio()
    tickAudio({ ...silent, fired: true }, audio)
    expect(audio.playShoot).toHaveBeenCalledOnce()
  })

  it('does not play shoot when no bullet is fired', () => {
    const audio = makeMockAudio()
    tickAudio(silent, audio)
    expect(audio.playShoot).not.toHaveBeenCalled()
  })

  it('plays explosion for each destroyed asteroid, with correct size', () => {
    const audio = makeMockAudio()
    tickAudio({ ...silent, explosions: ['large', 'small'] }, audio)
    expect(audio.playExplosion).toHaveBeenCalledWith('large')
    expect(audio.playExplosion).toHaveBeenCalledWith('small')
    expect(audio.playExplosion).toHaveBeenCalledTimes(2)
  })

  it('plays ship death when ship is hit', () => {
    const audio = makeMockAudio()
    tickAudio({ ...silent, shipHit: true }, audio)
    expect(audio.playShipDeath).toHaveBeenCalledOnce()
  })

  it('plays level-up when the wave is cleared', () => {
    const audio = makeMockAudio()
    tickAudio({ ...silent, waveCleared: true }, audio)
    expect(audio.playLevelUp).toHaveBeenCalledOnce()
  })

  it('plays menu-select when a new game is started', () => {
    const audio = makeMockAudio()
    tickAudio({ ...silent, gameStarted: true }, audio)
    expect(audio.playMenuSelect).toHaveBeenCalledOnce()
  })
})
