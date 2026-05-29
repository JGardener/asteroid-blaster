# Error propagation via callback, not React error boundary

AsteroidBlaster is published as an npm package. React error boundaries cannot catch asynchronous errors (PixiJS init, WebGL context loss, game loop tick failures) — the majority of realistic failure modes in a canvas game — so a boundary inside the package would only catch synchronous render throws and leave the rest silent. Rather than bundle a partial solution, the package exposes an optional `onError` prop on `AsteroidBlasterProps`. Each internal catch site calls `console.error` as a floor and then forwards to `onError` if provided. This keeps the package dependency-free and gives consumers (Portfolio2026, or any future host) full control over reporting — today `console.error`, tomorrow Sentry or any other sink — without requiring a package update.

## Considered options

- **Error boundary inside the package** — rejected because it cannot catch async failures (init rejection, context loss, ticker throws), which are the most likely failure modes. Would also require adding `react-error-boundary` as a peer dependency.
- **Re-throw async errors into React state to make them catchable** — rejected because it conflates error state with render state and makes the package harder to reason about from the outside.
