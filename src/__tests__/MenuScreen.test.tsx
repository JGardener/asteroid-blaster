import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { useGameStore } from '../store'
import * as touchInput from '../touchInput'
import MenuScreen from '../screens/MenuScreen'

afterEach(cleanup)

beforeEach(() => {
  useGameStore.setState({ phase: 'menu' })
})

describe('MenuScreen — touch text', () => {
  it('shows "Tap to play" when isTouchDevice is true', () => {
    render(<MenuScreen isTouchDevice={true} />)
    expect(screen.getByText(/tap to play/i)).toBeInTheDocument()
  })

  it('shows "Press Enter or Space to play" when isTouchDevice is false', () => {
    render(<MenuScreen isTouchDevice={false} />)
    expect(screen.getByText(/press enter or space to play/i)).toBeInTheDocument()
  })
})

describe('MenuScreen — keyboard cheatsheet', () => {
  it('hides the cheatsheet when isTouchDevice is true', () => {
    render(<MenuScreen isTouchDevice={true} />)
    expect(screen.queryByText(/thrust/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/rotate/i)).not.toBeInTheDocument()
  })

  it('shows the cheatsheet when isTouchDevice is false', () => {
    render(<MenuScreen isTouchDevice={false} />)
    expect(screen.getByText(/thrust/i)).toBeInTheDocument()
    expect(screen.getByText(/rotate/i)).toBeInTheDocument()
  })
})

describe('MenuScreen — confirm pulse', () => {
  it('pointerdown on the overlay calls setTouch confirm true then false', () => {
    const spy = vi.spyOn(touchInput, 'setTouch')
    render(<MenuScreen isTouchDevice={true} />)
    fireEvent.pointerDown(screen.getByTestId('menu-screen-overlay'))
    expect(spy).toHaveBeenNthCalledWith(1, 'confirm', true)
    expect(spy).toHaveBeenNthCalledWith(2, 'confirm', false)
    spy.mockRestore()
  })
})
