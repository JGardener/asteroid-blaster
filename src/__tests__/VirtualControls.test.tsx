import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { setTouch, getTouchSnapshot } from '../touchInput'
import type { TouchAction } from '../touchInput'
import VirtualControls from '../VirtualControls'

const ALL_ACTIONS: TouchAction[] = ['thrust', 'left', 'right', 'fire', 'pause', 'confirm']

afterEach(cleanup)
beforeEach(() => {
  ALL_ACTIONS.forEach(a => setTouch(a, false))
})

describe('VirtualControls', () => {
  it('renders thrust, left, right, and fire buttons', () => {
    render(<VirtualControls />)
    expect(screen.getByRole('button', { name: /thrust/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /left/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /right/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fire/i })).toBeInTheDocument()
  })

  it('pointerdown on Thrust sets thrust to true', () => {
    render(<VirtualControls />)
    fireEvent.pointerDown(screen.getByRole('button', { name: /thrust/i }))
    expect(getTouchSnapshot().thrust).toBe(true)
  })

  it('pointerdown on Left sets left to true', () => {
    render(<VirtualControls />)
    fireEvent.pointerDown(screen.getByRole('button', { name: /left/i }))
    expect(getTouchSnapshot().left).toBe(true)
  })

  it('pointerdown on Right sets right to true', () => {
    render(<VirtualControls />)
    fireEvent.pointerDown(screen.getByRole('button', { name: /right/i }))
    expect(getTouchSnapshot().right).toBe(true)
  })

  it('pointerdown on Fire sets fire to true', () => {
    render(<VirtualControls />)
    fireEvent.pointerDown(screen.getByRole('button', { name: /fire/i }))
    expect(getTouchSnapshot().fire).toBe(true)
  })

  it('pointerup on a button reverts its action to false', () => {
    render(<VirtualControls />)
    const btn = screen.getByRole('button', { name: /thrust/i })
    fireEvent.pointerDown(btn)
    fireEvent.pointerUp(btn)
    expect(getTouchSnapshot().thrust).toBe(false)
  })

  it('pointerleave on a button reverts its action to false', () => {
    render(<VirtualControls />)
    const btn = screen.getByRole('button', { name: /thrust/i })
    fireEvent.pointerDown(btn)
    fireEvent.pointerLeave(btn)
    expect(getTouchSnapshot().thrust).toBe(false)
  })

  it('holding two buttons simultaneously sets both actions to true', () => {
    render(<VirtualControls />)
    fireEvent.pointerDown(screen.getByRole('button', { name: /thrust/i }))
    fireEvent.pointerDown(screen.getByRole('button', { name: /fire/i }))
    const snap = getTouchSnapshot()
    expect(snap.thrust).toBe(true)
    expect(snap.fire).toBe(true)
  })

  it('releasing one button does not clear another held button', () => {
    render(<VirtualControls />)
    const thrust = screen.getByRole('button', { name: /thrust/i })
    const fire = screen.getByRole('button', { name: /fire/i })
    fireEvent.pointerDown(thrust)
    fireEvent.pointerDown(fire)
    fireEvent.pointerUp(thrust)
    const snap = getTouchSnapshot()
    expect(snap.thrust).toBe(false)
    expect(snap.fire).toBe(true)
  })

  it('overlay container has pointerEvents none', () => {
    render(<VirtualControls />)
    const overlay = screen.getByTestId('virtual-controls-overlay')
    expect(overlay).toHaveStyle({ pointerEvents: 'none' })
  })

  it('buttons have pointerEvents auto', () => {
    render(<VirtualControls />)
    for (const btn of screen.getAllByRole('button')) {
      expect(btn).toHaveStyle({ pointerEvents: 'auto' })
    }
  })

  it('buttons do not use hardcoded colour values', () => {
    render(<VirtualControls />)
    for (const btn of screen.getAllByRole('button')) {
      const style = btn.getAttribute('style') ?? ''
      expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}/)
      expect(style).not.toMatch(/rgba?\(/)
    }
  })
})
