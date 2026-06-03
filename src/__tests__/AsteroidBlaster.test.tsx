import { render, screen, cleanup, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import AsteroidBlaster from '../AsteroidBlaster'

vi.mock('../PixiCanvas', () => ({
  default: ({ onAppReady }: { onAppReady: (app: unknown) => void; onError: (e: Error) => void }) => {
    // Simulate async app-ready so the GameLoop branch renders
    return null
  },
}))
vi.mock('../GameLoop', () => ({ default: () => null }))
vi.mock('../VirtualControls', () => ({
  default: () => <div data-testid="virtual-controls-mock" />,
}))

function setMaxTouchPoints(n: number) {
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: n,
  })
}

afterEach(cleanup)

describe('AsteroidBlaster touch detection', () => {
  beforeEach(() => setMaxTouchPoints(0))

  it('renders VirtualControls when maxTouchPoints > 0', () => {
    setMaxTouchPoints(1)
    render(<AsteroidBlaster onClose={() => {}} />)
    expect(screen.getByTestId('virtual-controls-mock')).toBeInTheDocument()
  })

  it('does not render VirtualControls when maxTouchPoints === 0', () => {
    setMaxTouchPoints(0)
    render(<AsteroidBlaster onClose={() => {}} />)
    expect(screen.queryByTestId('virtual-controls-mock')).not.toBeInTheDocument()
  })
})

describe('AsteroidBlaster isTouchDevice prop threading', () => {
  it('GameHUD accepts isTouchDevice prop without error', async () => {
    const { default: GameHUD } = await import('../GameHUD')
    expect(() => render(<GameHUD isTouchDevice={true} />)).not.toThrow()
    cleanup()
    expect(() => render(<GameHUD isTouchDevice={false} />)).not.toThrow()
  })

  it('MenuScreen accepts isTouchDevice prop without error', async () => {
    const { default: MenuScreen } = await import('../screens/MenuScreen')
    expect(() => render(<MenuScreen isTouchDevice={true} />)).not.toThrow()
    cleanup()
    expect(() => render(<MenuScreen isTouchDevice={false} />)).not.toThrow()
  })

  it('GameOverScreen accepts isTouchDevice prop without error', async () => {
    const { default: GameOverScreen } = await import('../screens/GameOverScreen')
    expect(() => render(<GameOverScreen isTouchDevice={true} />)).not.toThrow()
    cleanup()
    expect(() => render(<GameOverScreen isTouchDevice={false} />)).not.toThrow()
  })
})
