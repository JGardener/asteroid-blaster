import { describe, it, expect, beforeEach } from 'vitest'
import { InputState } from '../input'
import { setTouch } from '../touchInput'
import type { TouchAction } from '../touchInput'

const ALL_ACTIONS: TouchAction[] = ['thrust', 'left', 'right', 'fire', 'pause', 'confirm']

let input: InputState

beforeEach(() => {
  ALL_ACTIONS.forEach(a => setTouch(a, false))
  input = new InputState()
})

describe('InputState.snapshot() OR merge', () => {
  it('keyboard ArrowUp makes thrust true', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(input.snapshot().thrust).toBe(true)
  })

  it('touch thrust with no key held makes thrust true', () => {
    setTouch('thrust', true)
    expect(input.snapshot().thrust).toBe(true)
  })

  it('keyboard and touch both active for the same action still returns true', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    setTouch('thrust', true)
    expect(input.snapshot().thrust).toBe(true)
  })

  it('neither keyboard nor touch active returns false', () => {
    expect(input.snapshot().thrust).toBe(false)
  })
})
