import { render, screen, cleanup, act } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import LandscapeGuard from '../LandscapeGuard'

afterEach(cleanup)

function setWindowSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth',  { writable: true, configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height })
}

describe('LandscapeGuard', () => {
  it('shows rotate prompt and hides children in portrait orientation', () => {
    setWindowSize(400, 800)
    render(<LandscapeGuard><div>game content</div></LandscapeGuard>)
    expect(screen.getByTestId('landscape-guard-prompt')).toBeInTheDocument()
    expect(screen.getByText('game content')).not.toBeVisible()
  })

  it('renders children and hides prompt in landscape orientation', () => {
    setWindowSize(800, 400)
    render(<LandscapeGuard><div>game content</div></LandscapeGuard>)
    expect(screen.queryByTestId('landscape-guard-prompt')).not.toBeInTheDocument()
    expect(screen.getByText('game content')).toBeVisible()
  })

  it('dismisses prompt and renders children when resizing portrait to landscape', () => {
    setWindowSize(400, 800)
    render(<LandscapeGuard><div>game content</div></LandscapeGuard>)
    expect(screen.getByTestId('landscape-guard-prompt')).toBeInTheDocument()
    expect(screen.getByText('game content')).not.toBeVisible()

    setWindowSize(800, 400)
    act(() => { window.dispatchEvent(new Event('resize')) })

    expect(screen.queryByTestId('landscape-guard-prompt')).not.toBeInTheDocument()
    expect(screen.getByText('game content')).toBeVisible()
  })

  it('shows prompt and hides children when resizing landscape to portrait', () => {
    setWindowSize(800, 400)
    render(<LandscapeGuard><div>game content</div></LandscapeGuard>)
    expect(screen.getByText('game content')).toBeVisible()

    setWindowSize(400, 800)
    act(() => { window.dispatchEvent(new Event('resize')) })

    expect(screen.getByTestId('landscape-guard-prompt')).toBeInTheDocument()
    expect(screen.getByText('game content')).not.toBeVisible()
  })

  it('responds to orientationchange events', () => {
    setWindowSize(400, 800)
    render(<LandscapeGuard><div>game content</div></LandscapeGuard>)
    expect(screen.getByText('game content')).not.toBeVisible()

    setWindowSize(800, 400)
    act(() => { window.dispatchEvent(new Event('orientationchange')) })

    expect(screen.queryByTestId('landscape-guard-prompt')).not.toBeInTheDocument()
    expect(screen.getByText('game content')).toBeVisible()
  })

  it('rotate prompt contains no keyboard key references', () => {
    setWindowSize(400, 800)
    render(<LandscapeGuard><div>game content</div></LandscapeGuard>)
    const prompt = screen.getByTestId('landscape-guard-prompt')
    const text = (prompt.textContent ?? '').toLowerCase()
    expect(text).not.toMatch(/\bkey\b|keyboard|press|ctrl|alt|shift|enter|space/)
  })
})
