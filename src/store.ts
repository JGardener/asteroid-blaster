import { create } from 'zustand'
import type { GamePhase } from './types'

interface GameStore {
  phase:            GamePhase
  score:            number
  lives:            number
  level:            number
  hiScore:          number
  restartRequested: boolean

  setPhase:           (phase: GamePhase) => void
  addScore:           (points: number) => void
  loseLife:           () => void
  nextLevel:          () => void
  resetGame:          () => void
  requestRestart:     () => void
  clearRestartRequest:() => void
}

const HI_KEY = 'ab-hiscore'

export const useGameStore = create<GameStore>((set, get) => ({
  phase:            'menu',
  score:            0,
  lives:            3,
  level:            1,
  hiScore:          Number(localStorage.getItem(HI_KEY) ?? 0),
  restartRequested: false,

  setPhase: (phase) => set({ phase }),

  addScore: (points) => {
    const next = get().score + points
    set({ score: next })
    if (next > get().hiScore) {
      localStorage.setItem(HI_KEY, String(next))
      set({ hiScore: next })
    }
  },

  loseLife: () => {
    const lives = get().lives - 1
    set({ lives })
    if (lives <= 0) set({ phase: 'gameover' })
  },

  nextLevel: () => set((s) => ({ level: s.level + 1 })),

  resetGame:           () => set({ phase: 'playing', score: 0, lives: 3, level: 1 }),
  requestRestart:      () => set({ phase: 'playing', score: 0, lives: 3, level: 1, restartRequested: true }),
  clearRestartRequest: () => set({ restartRequested: false }),
}))
