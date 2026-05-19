export class ObjectPool<T extends { active: boolean }> {
  private pool: T[]
  private lastFreeIdx = 0

  constructor(factory: () => T, size: number) {
    this.pool = Array.from({ length: size }, factory)
    this.pool.forEach(o => (o.active = false))
  }

  acquire(): T | null {
    for (let i = 0; i < this.pool.length; i++) {
      const idx = (this.lastFreeIdx + i) % this.pool.length
      if (!this.pool[idx].active) {
        this.lastFreeIdx = (idx + 1) % this.pool.length
        this.pool[idx].active = true
        return this.pool[idx]
      }
    }
    console.warn('ObjectPool exhausted — increase pool size')
    return null
  }

  release(obj: T): void {
    obj.active = false
  }

  forEach(cb: (obj: T) => void): void {
    for (const obj of this.pool) {
      if (obj.active) cb(obj)
    }
  }

  releaseAll(onRelease?: (obj: T) => void): void {
    this.pool.forEach(o => {
      onRelease?.(o)
      o.active = false
    })
    this.lastFreeIdx = 0
  }
}
