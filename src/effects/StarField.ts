import { Container, Graphics } from 'pixi.js'
import { STAR_COUNT, CANVAS_W, CANVAS_H } from '../constants'

// Drawn once at init — zero per-frame cost.
export function createStarField(stage: Container): Graphics {
  const gfx = new Graphics()

  for (let i = 0; i < STAR_COUNT; i++) {
    const layer = i < STAR_COUNT * 0.7 ? 0 : 1
    const x     = Math.random() * CANVAS_W
    const y     = Math.random() * CANVAS_H
    const r     = layer === 0 ? 0.8 : 1.2
    const alpha = layer === 0 ? 0.2 : 0.45
    gfx.circle(x, y, r).fill({ color: 0xe8e8f0, alpha })
  }

  stage.addChildAt(gfx, 0)
  return gfx
}
