import { render, screen, cleanup, act } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
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

// Touch detection uses window.matchMedia('(pointer: coarse)'). Stub it so
// only that query reports `coarse`; any other query reports no match.
function stubCoarsePointer(coarse: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: coarse && query === '(pointer: coarse)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AsteroidBlaster touch detection', () => {
  it('renders VirtualControls when the primary pointer is coarse', () => {
    stubCoarsePointer(true)
    render(<AsteroidBlaster onClose={() => {}} />)
    expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse)')
    expect(screen.getByTestId('virtual-controls-mock')).toBeInTheDocument()
  })

  it('does not render VirtualControls when the primary pointer is fine', () => {
    stubCoarsePointer(false)
    render(<AsteroidBlaster onClose={() => {}} />)
    expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse)')
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
