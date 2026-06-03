import { describe, it, expect, beforeEach } from 'vitest'
import { setTouch, getTouchSnapshot } from '../touchInput'
import type { TouchAction } from '../touchInput'

const ALL_ACTIONS: TouchAction[] = ['thrust', 'left', 'right', 'fire', 'pause', 'confirm']

beforeEach(() => {
  ALL_ACTIONS.forEach(a => setTouch(a, false))
})

describe('touchInput', () => {
  it('setTouch true makes getTouchSnapshot return true for that action', () => {
    setTouch('thrust', true)
    expect(getTouchSnapshot().thrust).toBe(true)
  })

  it('setTouch false reverts the action to false', () => {
    setTouch('thrust', true)
    setTouch('thrust', false)
    expect(getTouchSnapshot().thrust).toBe(false)
  })

  it.each(ALL_ACTIONS)('each action "%s" is independently settable', (action) => {
    setTouch(action, true)
    expect(getTouchSnapshot()[action]).toBe(true)
  })

  it('setting one action does not affect another', () => {
    setTouch('thrust', true)
    expect(getTouchSnapshot().left).toBe(false)
  })

  it('two actions set simultaneously are both true', () => {
    setTouch('left', true)
    setTouch('fire', true)
    const snap = getTouchSnapshot()
    expect(snap.left).toBe(true)
    expect(snap.fire).toBe(true)
  })
})
