# Separate Zustand store for persistent player preferences

Player preferences (audio volumes, mute state) live in a dedicated `useAudioStore`, separate from the game-session state in `useGameStore`.

`useGameStore` holds transient game-session data: score, lives, level, phase. Only `hiScore` persists to `localStorage`. Player preferences are a different concern — they survive across sessions and have no relationship to an active game run. Mixing persistence models in one store blurs that boundary and makes future additions harder to place correctly.

The pattern established here is the expected home for all future persistent preference slices (visual themes, meta-progression unlocks). Each new concern gets its own store rather than extending `useGameStore`.

The Zustand bridge rule from CLAUDE.md applies within this pattern: the game loop reads preference state via `useAudioStore.subscribe()` and calls AudioEngine setters — React components write, the game loop reads, the two worlds never reference each other directly.

## Considered options

- **Add audio fields to `useGameStore`** — rejected because it conflates session-transient state (`score`, `lives`) with persistent preferences (`sfxVolume`, `musicVolume`), and would require splitting them apart later when meta-progression arrives.
- **React context holding the AudioEngine instance** — rejected because it creates a second coupling path between the PIXI world and the React world, violating the single-bridge rule in CLAUDE.md.
