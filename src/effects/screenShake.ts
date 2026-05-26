import { Container, Ticker } from 'pixi.js'

export function screenShake(
  ticker:    Ticker,
  stage:     Container,
  intensity = 8,
  frames    = 12,
): void {
  const origX = stage.pivot.x
  const origY = stage.pivot.y
  let remaining = frames

  function tick(t: { deltaTime: number }): void {
    if (remaining <= 0) {
      stage.pivot.x = origX
      stage.pivot.y = origY
      ticker.remove(tick)
      return
    }
    const scale   = remaining / frames
    stage.pivot.x = origX + (Math.random() - 0.5) * intensity * scale * 2
    stage.pivot.y = origY + (Math.random() - 0.5) * intensity * scale * 2
    remaining -= t.deltaTime
  }

  ticker.add(tick)
}
