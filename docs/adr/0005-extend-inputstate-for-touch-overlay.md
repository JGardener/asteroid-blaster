# Extend InputState with a touch overlay rather than a parallel input object

Touch input from virtual on-screen buttons is injected into the existing `InputState` class via a `setTouch(action, pressed)` method. `snapshot()` ORs keyboard state and touch state together before returning. There is no separate `TouchInputState` class.

`InputState` owns the `InputSnapshot` contract — it is the single source of truth that `useGameLoop.ts` polls each tick. Splitting touch into a parallel object would require `useGameLoop` to merge two snapshots itself, spreading the OR logic across the call site rather than encapsulating it. Every future consumer of input (a replay system, an AI opponent, a gamepad layer) would also have to know about the merge. Keeping the merge inside `InputState` means callers remain oblivious to how many input sources exist.

The OR semantics are intentional: keyboard and touch are not mutually exclusive. A desktop user with a touchscreen can mix both without either source clobbering the other. This also means the virtual controls work on hybrid devices without any special-casing.

## Considered options

- **Parallel `TouchInputState`, merged in `useGameLoop`** — rejected because it leaks the merge concern into the orchestrator. `useGameLoop` already coordinates PIXI, Zustand, audio, and collision; adding input-source merging increases its responsibility and makes future input sources (gamepad, AI) harder to add cleanly.
- **Replace `InputState` entirely with a unified pointer/keyboard handler** — rejected because it would require rewriting the keyboard path and its tests for no benefit. The existing keyboard handling is correct; touch is purely additive.
