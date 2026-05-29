import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { useGameStore } from '../store'
import { useAudioStore } from '../audioStore'
import PauseScreen from '../screens/PauseScreen'

afterEach(cleanup)

beforeEach(() => {
  useGameStore.setState({ phase: 'playing', restartRequested: false })
  useAudioStore.setState({ sfxVolume: 1, musicVolume: 1, isMuted: false })
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

describe('PauseScreen audio controls', () => {
  it('shows SFX slider, Music slider, and Mute toggle when paused', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByLabelText(/sfx/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/music/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument()
  })

  it('SFX slider reflects sfxVolume from audioStore', () => {
    useAudioStore.setState({ sfxVolume: 0.75, musicVolume: 1, isMuted: false })
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByLabelText(/sfx/i)).toHaveValue('0.75')
  })

  it('Music slider reflects musicVolume from audioStore', () => {
    useAudioStore.setState({ sfxVolume: 1, musicVolume: 0.3, isMuted: false })
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByLabelText(/music/i)).toHaveValue('0.3')
  })

  it('Mute button label says Unmute when isMuted is true', () => {
    useAudioStore.setState({ sfxVolume: 1, musicVolume: 1, isMuted: true })
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^mute$/i })).not.toBeInTheDocument()
  })

  it('Mute button label says Mute when isMuted is false', () => {
    useAudioStore.setState({ sfxVolume: 1, musicVolume: 1, isMuted: false })
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /^mute$/i })).toBeInTheDocument()
  })

  it('SFX slider change calls setSfxVolume', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText(/sfx/i), { target: { value: '0.5' } })
    expect(useAudioStore.getState().sfxVolume).toBe(0.5)
  })

  it('Music slider change calls setMusicVolume', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText(/music/i), { target: { value: '0.2' } })
    expect(useAudioStore.getState().musicVolume).toBe(0.2)
  })

  it('Mute toggle click flips isMuted', () => {
    useAudioStore.setState({ sfxVolume: 1, musicVolume: 1, isMuted: false })
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^mute$/i }))
    expect(useAudioStore.getState().isMuted).toBe(true)
  })

  it('SFX slider label displays value as percentage', () => {
    useAudioStore.setState({ sfxVolume: 0.75, musicVolume: 1, isMuted: false })
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByText(/sfx.*75%/i)).toBeInTheDocument()
  })

  it('Music slider label displays value as percentage', () => {
    useAudioStore.setState({ sfxVolume: 1, musicVolume: 0.3, isMuted: false })
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    expect(screen.getByText(/music.*30%/i)).toBeInTheDocument()
  })

  it('audio controls remain visible in confirm mode', () => {
    useGameStore.setState({ phase: 'paused' })
    render(<PauseScreen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /restart/i }))
    expect(screen.getByLabelText(/sfx/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/music/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument()
  })
})
