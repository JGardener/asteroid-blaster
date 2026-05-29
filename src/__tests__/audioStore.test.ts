import { beforeEach, describe, it, expect, vi } from 'vitest'
import { useAudioStore } from '../audioStore'

const SFX_KEY   = 'ab-sfx-vol'
const MUSIC_KEY = 'ab-music-vol'
const MUTED_KEY = 'ab-muted'

beforeEach(() => {
  localStorage.clear()
  useAudioStore.setState({ sfxVolume: 1, musicVolume: 1, isMuted: false })
})

// ── defaults ──────────────────────────────────────────────────────────────────

describe('defaults', () => {
  it('starts with sfxVolume=1, musicVolume=1, isMuted=false when localStorage is empty', () => {
    const { sfxVolume, musicVolume, isMuted } = useAudioStore.getState()
    expect(sfxVolume).toBe(1)
    expect(musicVolume).toBe(1)
    expect(isMuted).toBe(false)
  })
})

// ── setSfxVolume ──────────────────────────────────────────────────────────────

describe('setSfxVolume', () => {
  it('updates sfxVolume in state', () => {
    useAudioStore.getState().setSfxVolume(0.5)
    expect(useAudioStore.getState().sfxVolume).toBe(0.5)
  })

  it('persists to localStorage', () => {
    useAudioStore.getState().setSfxVolume(0.5)
    expect(localStorage.getItem(SFX_KEY)).toBe('0.5')
  })
})

// ── setMusicVolume ────────────────────────────────────────────────────────────

describe('setMusicVolume', () => {
  it('updates musicVolume in state', () => {
    useAudioStore.getState().setMusicVolume(0.3)
    expect(useAudioStore.getState().musicVolume).toBe(0.3)
  })

  it('persists to localStorage', () => {
    useAudioStore.getState().setMusicVolume(0.3)
    expect(localStorage.getItem(MUSIC_KEY)).toBe('0.3')
  })
})

// ── toggleMute ────────────────────────────────────────────────────────────────

describe('toggleMute', () => {
  it('flips isMuted to true', () => {
    useAudioStore.getState().toggleMute()
    expect(useAudioStore.getState().isMuted).toBe(true)
  })

  it('toggling twice returns isMuted to false', () => {
    useAudioStore.getState().toggleMute()
    useAudioStore.getState().toggleMute()
    expect(useAudioStore.getState().isMuted).toBe(false)
  })

  it('persists isMuted to localStorage', () => {
    useAudioStore.getState().toggleMute()
    expect(localStorage.getItem(MUTED_KEY)).toBe('true')
  })
})

// ── rehydration ───────────────────────────────────────────────────────────────

describe('rehydration', () => {
  it('reads sfxVolume, musicVolume, and isMuted from localStorage on init', async () => {
    localStorage.setItem(SFX_KEY,   '0.5')
    localStorage.setItem(MUSIC_KEY, '0.3')
    localStorage.setItem(MUTED_KEY, 'true')
    vi.resetModules()
    const { useAudioStore: fresh } = await import('../audioStore')
    expect(fresh.getState().sfxVolume).toBe(0.5)
    expect(fresh.getState().musicVolume).toBe(0.3)
    expect(fresh.getState().isMuted).toBe(true)
  })
})
