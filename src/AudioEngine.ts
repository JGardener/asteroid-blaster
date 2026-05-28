import type { AsteroidSize } from './types'

const NOTES = [220, 277, 330, 370, 440, 494]
const SCHEDULE_AHEAD = 0.1
const TICK_MS = 25

export class AudioEngine {
  private ctx: AudioContext
  private dead = false

  private musicInterval: ReturnType<typeof setInterval> | null = null
  private masterGain: GainNode | null = null
  private nextNoteTime = 0
  private noteInterval = 0.25
  private noteIndex = 0

  constructor(ctx?: AudioContext) {
    this.ctx = ctx ?? new AudioContext()
  }

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  playShoot(): void {
    if (this.dead) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(880, t)
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.1)
    gain.gain.setValueAtTime(0.25, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + 0.1)
  }

  playExplosion(size: AsteroidSize): void {
    if (this.dead) return
    const t = this.ctx.currentTime
    const freq   = size === 'large' ? 80  : size === 'medium' ? 160 : 280
    const dur    = size === 'large' ? 0.8 : size === 'medium' ? 0.5 : 0.25
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(20, t + dur)
    gain.gain.setValueAtTime(0.4, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + dur)
  }

  playShipDeath(): void {
    if (this.dead) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(55, t)
    osc.frequency.exponentialRampToValueAtTime(18, t + 1.5)
    gain.gain.setValueAtTime(0.5, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + 1.5)
  }

  playUfoAppear(): void {
    if (this.dead) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(200, t)
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.3)
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.6)
    gain.gain.setValueAtTime(0.2, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + 0.6)
  }

  playUfoShoot(): void {
    if (this.dead) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(440, t)
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.12)
    gain.gain.setValueAtTime(0.2, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + 0.12)
  }

  playPickup(): void {
    if (this.dead) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523, t)
    osc.frequency.setValueAtTime(659, t + 0.08)
    osc.frequency.setValueAtTime(784, t + 0.16)
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + 0.3)
  }

  playLevelUp(): void {
    if (this.dead) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(330, t)
    osc.frequency.setValueAtTime(440, t + 0.1)
    osc.frequency.setValueAtTime(554, t + 0.2)
    osc.frequency.setValueAtTime(659, t + 0.3)
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + 0.5)
  }

  playMenuSelect(): void {
    if (this.dead) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, t)
    gain.gain.setValueAtTime(0.15, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(t)
    osc.stop(t + 0.05)
  }

  startMusic(): void {
    if (this.dead || this.musicInterval !== null) return
    this.masterGain = this.ctx.createGain() as unknown as GainNode
    this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime)
    this.masterGain.connect(this.ctx.destination)
    this.nextNoteTime = this.ctx.currentTime
    this.musicInterval = setInterval(() => this.scheduleTick(), TICK_MS)
  }

  private scheduleTick(): void {
    while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
      this.scheduleNote(this.nextNoteTime)
      this.nextNoteTime += this.noteInterval
    }
  }

  private scheduleNote(time: number): void {
    const freq = NOTES[this.noteIndex % NOTES.length]
    this.noteIndex++
    const osc = this.ctx.createOscillator()
    const noteGain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)
    noteGain.gain.setValueAtTime(0.12, time)
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + this.noteInterval * 0.85)
    osc.connect(noteGain as unknown as AudioNode)
    noteGain.connect(this.masterGain as unknown as AudioNode)
    osc.start(time)
    osc.stop(time + this.noteInterval)
  }

  stopMusic(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval)
      this.musicInterval = null
    }
    if (this.masterGain) {
      const t = this.ctx.currentTime
      this.masterGain.gain.linearRampToValueAtTime(0.001, t + 0.2)
      this.masterGain = null
    }
  }

  pauseMusic(): void {
    if (!this.masterGain || this.dead) return
    const t = this.ctx.currentTime
    this.masterGain.gain.linearRampToValueAtTime(0.001, t + 0.1)
  }

  resumeMusic(): void {
    if (!this.masterGain || this.dead) return
    const t = this.ctx.currentTime
    this.masterGain.gain.linearRampToValueAtTime(1, t + 0.1)
  }

  setMusicIntensity(level: number): void {
    this.noteInterval = Math.max(0.1, 0.3 - (level - 1) * 0.05)
  }

  destroy(): void {
    this.dead = true
    this.stopMusic()
    this.ctx.close()
  }
}
