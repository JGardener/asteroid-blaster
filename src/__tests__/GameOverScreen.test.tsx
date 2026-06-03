import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { useGameStore } from '../store'
import * as touchInput from '../touchInput'
import GameOverScreen from '../screens/GameOverScreen'

afterEach(cleanup)

beforeEach(() => {
  useGameStore.setState({ phase: 'gameover', score: 0, hiScore: 0 })
})

describe('GameOverScreen — touch text', () => {
  it('shows "Tap to play again" when isTouchDevice is true', () => {
    render(<GameOverScreen isTouchDevice={true} />)
    expect(screen.getByText(/tap to play again/i)).toBeInTheDocument()
  })

  it('shows "Press Enter or Space to play again" when isTouchDevice is false', () => {
    render(<GameOverScreen isTouchDevice={false} />)
    expect(screen.getByText(/press enter or space to play again/i)).toBeInTheDocument()
  })
})

describe('GameOverScreen — confirm pulse', () => {
  it('pointerdown on the overlay calls setTouch confirm true then false', () => {
    const spy = vi.spyOn(touchInput, 'setTouch')
    render(<GameOverScreen isTouchDevice={true} />)
    fireEvent.pointerDown(screen.getByTestId('game-over-screen-overlay'))
    expect(spy).toHaveBeenNthCalledWith(1, 'confirm', true)
    expect(spy).toHaveBeenNthCalledWith(2, 'confirm', false)
    spy.mockRestore()
  })
})
