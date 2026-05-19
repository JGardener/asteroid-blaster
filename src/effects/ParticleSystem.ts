import { Graphics, Container } from 'pixi.js'
import { ObjectPool } from '../ObjectPool'
import type { Vec2 } from '../types'
import { PARTICLE_POOL_SIZE } from '../constants'

class PixiParticle {
  active:  boolean = false
  pos:     Vec2    = { x: 0, y: 0 }
  vel:     Vec2    = { x: 0, y: 0 }
  radius:  number  = 2
  alpha:   number  = 1
  decay:   number  = 0.04
  color:   number  = 0x4f8cff
  readonly gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    this.gfx.visible = false
    stage.addChild(this.gfx)
  }

  init(pos: Vec2, vel: Vec2, color: number): void {
    this.pos   = { ...pos }
    this.vel   = { ...vel }
    this.alpha = 1
    this.color = color
    this.decay = 0.035 + Math.random() * 0.025
    this.gfx.clear()
    this.gfx.circle(0, 0, this.radius).fill({ color: this.color })
    this.gfx.alpha   = 1
    this.gfx.visible = true
  }

  update(): boolean {
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.vel.x *= 0.96
    this.vel.y *= 0.96
    this.alpha -= this.decay

    if (this.alpha <= 0) {
      this.active      = false
      this.gfx.visible = false
      return false
    }

    this.gfx.x     = this.pos.x
    this.gfx.y     = this.pos.y
    this.gfx.alpha = this.alpha
    return true
  }

  destroy() { this.gfx.destroy() }
}

export class ParticleSystem {
  private pool: ObjectPool<PixiParticle>

  constructor(stage: Container) {
    this.pool = new ObjectPool(() => new PixiParticle(stage), PARTICLE_POOL_SIZE)
  }

  burst(pos: Vec2, count: number, color: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire()
      if (!p) break
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 3 + 1
      p.init(pos, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, color)
    }
  }

  update(): void {
    this.pool.forEach(p => p.update())
  }
}
