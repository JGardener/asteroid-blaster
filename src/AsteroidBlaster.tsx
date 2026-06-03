import { useState, useCallback, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import rawCss from './styles.css?inline'
import PixiCanvas from './PixiCanvas'
import GameHUD from './GameHUD'
import GameLoop from './GameLoop'
import MenuScreen             from './screens/MenuScreen'
import PauseScreen            from './screens/PauseScreen'
import GameOverScreen         from './screens/GameOverScreen'
import LevelTransitionScreen  from './screens/LevelTransitionScreen'
import LandscapeGuard         from './LandscapeGuard'
import VirtualControls        from './VirtualControls'

export interface AsteroidBlasterProps {
  onClose: () => void
  onError?: (err: Error) => void
}

export default function AsteroidBlaster({ onClose, onError }: AsteroidBlasterProps) {
  const [app, setApp] = useState<PIXI.Application | null>(null)
  const [initError, setInitError] = useState<Error | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = rawCss
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [])

  const handleAppReady = useCallback((readyApp: PIXI.Application) => {
    setApp(readyApp)
  }, [])

  const handleError = useCallback((err: Error) => {
    setInitError(err)
    onError?.(err)
  }, [onError])

  if (initError) {
    return (
      <div
        className="ab-root"
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '12px',
        }}
      >
        <p
          style={{
            color:      'var(--ab-dim)',
            fontFamily: 'var(--ab-mono)',
            fontSize:   13,
            margin:     0,
          }}
        >
          Game failed to load
        </p>
        <button
          onClick={onClose}
          aria-label="Close game"
          style={{
            background:    'none',
            border:        '1px solid var(--ab-muted)',
            borderRadius:  4,
            padding:       '4px 10px',
            color:         'var(--ab-dim)',
            fontFamily:    'var(--ab-mono)',
            fontSize:      10,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor:        'pointer',
          }}
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <LandscapeGuard>
    <div className="ab-root">
      <PixiCanvas onAppReady={handleAppReady} onError={handleError} />
      {app && <GameLoop app={app} onError={handleError} />}
      <GameHUD isTouchDevice={isTouchDevice} />
      <MenuScreen isTouchDevice={isTouchDevice} />
      <PauseScreen onClose={onClose} />
      <GameOverScreen isTouchDevice={isTouchDevice} />
      <LevelTransitionScreen />
      {isTouchDevice && <VirtualControls />}

      <button
        onClick={onClose}
        aria-label="Close game"
        style={{
          position:      'absolute',
          top:           16,
          right:         16,
          zIndex:        10,
          background:    'none',
          border:        '1px solid var(--ab-muted)',
          borderRadius:  4,
          padding:       '4px 10px',
          color:         'var(--ab-dim)',
          fontFamily:    'var(--ab-mono)',
          fontSize:      10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor:        'pointer',
          transition:    'border-color 150ms, color 150ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--ab-accent)'
          e.currentTarget.style.color = 'var(--ab-text)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--ab-muted)'
          e.currentTarget.style.color = 'var(--ab-dim)'
        }}
      >
        Esc ×
      </button>
    </div>
    </LandscapeGuard>
  )
}
