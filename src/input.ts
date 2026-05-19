export interface InputSnapshot {
  thrust:  boolean
  left:    boolean
  right:   boolean
  fire:    boolean
  pause:   boolean
  confirm: boolean
}

export class InputState {
  private keys = new Set<string>()

  constructor() {
    this.onDown = this.onDown.bind(this)
    this.onUp   = this.onUp.bind(this)
    window.addEventListener('keydown', this.onDown)
    window.addEventListener('keyup',   this.onUp)
  }

  private onDown(e: KeyboardEvent) {
    if (['ArrowUp', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault()
    }
    this.keys.add(e.key)
  }

  private onUp(e: KeyboardEvent) {
    this.keys.delete(e.key)
  }

  snapshot(): InputSnapshot {
    return {
      thrust:  this.keys.has('ArrowUp')    || this.keys.has('w') || this.keys.has('W'),
      left:    this.keys.has('ArrowLeft')  || this.keys.has('a') || this.keys.has('A'),
      right:   this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D'),
      fire:    this.keys.has(' '),
      pause:   this.keys.has('Escape'),
      confirm: this.keys.has('Enter') || this.keys.has(' '),
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.onDown)
    window.removeEventListener('keyup',   this.onUp)
  }
}
