import type { AudioEngine } from './AudioEngine'
import type { AsteroidSize } from './types'

export interface AudioTickInput {
  fired:            boolean
  explosions:       AsteroidSize[]
  shipHit:          boolean
  waveCleared:      boolean
  gameStarted:      boolean
  pickupCollected:  boolean
  ufoAppeared:      boolean
  ufoShot:          boolean
}

export function tickAudio(input: AudioTickInput, audio: AudioEngine): void {
  if (input.fired)            audio.playShoot()
  input.explosions.forEach(size => audio.playExplosion(size))
  if (input.shipHit)          audio.playShipDeath()
  if (input.waveCleared)      audio.playLevelUp()
  if (input.gameStarted)      audio.playMenuSelect()
  if (input.pickupCollected)  audio.playPickup()
  if (input.ufoAppeared)      audio.playUfoAppear()
  if (input.ufoShot)          audio.playUfoShoot()
}
