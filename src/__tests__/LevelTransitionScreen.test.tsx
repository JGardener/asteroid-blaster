import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { useGameStore } from '../store'
import LevelTransitionScreen from '../screens/LevelTransitionScreen'

afterEach(cleanup)

beforeEach(() => {
  useGameStore.setState({ phase: 'playing', level: 1 })
})

describe('LevelTransitionScreen', () => {
  it('is visible when phase is transitioning', () => {
    useGameStore.setState({ phase: 'transitioning' })
    render(<LevelTransitionScreen />)
    expect(screen.getByTestId('level-transition-screen')).toHaveStyle({ opacity: '1' })
  })

  it('is hidden when phase is not transitioning', () => {
    render(<LevelTransitionScreen />)  // phase is 'playing'
    expect(screen.getByTestId('level-transition-screen')).toHaveStyle({ opacity: '0' })
  })

  it('displays the current level number from the store', () => {
    useGameStore.setState({ phase: 'transitioning', level: 4 })
    render(<LevelTransitionScreen />)
    expect(screen.getByText('LEVEL 4')).toBeInTheDocument()
  })
})
