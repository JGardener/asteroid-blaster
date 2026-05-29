import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { useGameStore } from '../store'
import PauseScreen from '../screens/PauseScreen'

afterEach(cleanup)

beforeEach(() => {
  useGameStore.setState({ phase: 'playing' })
})

describe('PauseScreen', () => {
  it('is hidden when phase is not paused', () => {
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByTestId('pause-screen')).toHaveStyle({ opacity: '0', pointerEvents: 'none' })
  })

  it('is visible and interactive when phase is paused', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByTestId('pause-screen')).toHaveStyle({ opacity: '1', pointerEvents: 'auto' })
  })

  it('shows Resume, Restart, and Quit buttons when paused', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quit/i })).toBeInTheDocument()
  })

  it('Resume button sets phase to playing', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    expect(useGameStore.getState().phase).toBe('playing')
  })

  it('Restart button shows a confirmation sub-view', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /restart/i }))
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument()
  })

  it('Restart → Confirm resets the game', () => {
    useGameStore.setState({ phase: 'paused', score: 1000, lives: 1, level: 5 })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /restart/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    const { phase, score, lives, level } = useGameStore.getState()
    expect(phase).toBe('playing')
    expect(score).toBe(0)
    expect(lives).toBe(3)
    expect(level).toBe(1)
  })

  it('Restart → Cancel returns to main pause menu', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /restart/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument()
  })

  it('Quit button shows a confirmation sub-view', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /quit/i }))
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument()
  })

  it('Quit → Confirm calls onClose', () => {
    useGameStore.setState({ phase: 'paused' })
    const onClose = vi.fn()
    render(<PauseScreen onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /quit/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Quit → Cancel returns to main pause menu', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /quit/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument()
  })
})
