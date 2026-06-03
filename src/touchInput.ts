import type { InputSnapshot } from './input'

export type TouchAction = keyof InputSnapshot

const state: InputSnapshot = {
  thrust: false,
  left:   false,
  right:  false,
  fire:   false,
  pause:  false,
  confirm: false,
}

export function setTouch(action: TouchAction, pressed: boolean): void {
  state[action] = pressed
}

export function getTouchSnapshot(): Readonly<InputSnapshot> {
  return { ...state }
}
