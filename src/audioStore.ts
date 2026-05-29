import { create } from 'zustand'

const SFX_KEY   = 'ab-sfx-vol'
const MUSIC_KEY = 'ab-music-vol'
const MUTED_KEY = 'ab-muted'

interface AudioStore {
  sfxVolume:      number
  musicVolume:    number
  isMuted:        boolean
  setSfxVolume:   (v: number) => void
  setMusicVolume: (v: number) => void
  toggleMute:     () => void
}

export const useAudioStore = create<AudioStore>((set) => ({
  sfxVolume:   Number(localStorage.getItem(SFX_KEY)   ?? 1),
  musicVolume: Number(localStorage.getItem(MUSIC_KEY) ?? 1),
  isMuted:     localStorage.getItem(MUTED_KEY) === 'true',

  setSfxVolume: (v) => {
    localStorage.setItem(SFX_KEY, String(v))
    set({ sfxVolume: v })
  },

  setMusicVolume: (v) => {
    localStorage.setItem(MUSIC_KEY, String(v))
    set({ musicVolume: v })
  },

  toggleMute: () => set((s) => {
    const next = !s.isMuted
    localStorage.setItem(MUTED_KEY, String(next))
    return { isMuted: next }
  }),
}))
