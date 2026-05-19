import type { Vec2 } from './types'

export function circlesOverlap(
  aPos: Vec2, aRadius: number,
  bPos: Vec2, bRadius: number,
): boolean {
  const dx = aPos.x - bPos.x
  const dy = aPos.y - bPos.y
  return (dx * dx + dy * dy) < (aRadius + bRadius) * (aRadius + bRadius)
}
