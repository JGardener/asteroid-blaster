import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { useGameStore } from '../store'
import GameHUD from '../GameHUD'

afterEach(cleanup)

beforeEach(() => {
  useGameStore.setState({ phase: 'playing', score: 0, lives: 3, level: 1 })
})

describe('GameHUD — touch pause button', () => {
  it('shows pause button when isTouchDevice and phase is playing', () => {
    render(<GameHUD isTouchDevice={true} />)
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
  })

  it('tapping pause button sets phase to paused', () => {
    render(<GameHUD isTouchDevice={true} />)
    fireEvent.click(screen.getByRole('button', { name: /pause/i }))
    expect(useGameStore.getState().phase).toBe('paused')
  })

  it('does not show pause button when isTouchDevice is false', () => {
    render(<GameHUD isTouchDevice={false} />)
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument()
  })

  it('does not show pause button when phase is not playing', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<GameHUD isTouchDevice={true} />)
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument()
  })
})

describe('GameHUD — Esc hint', () => {
  it('hides Esc · Pause hint when isTouchDevice is true', () => {
    render(<GameHUD isTouchDevice={true} />)
    expect(screen.queryByText(/esc.*pause/i)).not.toBeInTheDocument()
  })

  it('shows Esc · Pause hint when isTouchDevice is false', () => {
    render(<GameHUD isTouchDevice={false} />)
    expect(screen.getByText(/esc.*pause/i)).toBeInTheDocument()
  })
})
