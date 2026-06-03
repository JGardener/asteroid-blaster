import { useGameStore } from '../store'
import { setTouch } from '../touchInput'

export default function GameOverScreen({ isTouchDevice = false }: { isTouchDevice?: boolean } = {}) {
  const { phase, score, hiScore } = useGameStore()
  const show = phase === 'gameover'

  function handlePointerDown() {
    setTouch('confirm', true)
    setTouch('confirm', false)
  }

  return (
    <div
      data-testid="game-over-screen-overlay"
      onPointerDown={isTouchDevice && show ? handlePointerDown : undefined}
      style={{
        position:        'absolute',
        inset:           0,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        fontFamily:      'var(--ab-mono)',
        color:           'var(--ab-text)',
        backgroundColor: 'rgba(10,10,15,0.88)',
        opacity:         show ? 1 : 0,
        pointerEvents:   isTouchDevice && show ? 'auto' : 'none',
        transition:      'opacity 400ms var(--ab-ease-out)',
        zIndex:          2,
      }}
    >
      <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ab-dim)', marginBottom: 16 }}>
        // Game over
      </p>

      <p style={{ fontFamily: 'var(--ab-display)', fontSize: 64, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ab-text)', margin: '0 0 8px', fontVariantNumeric: 'tabular-nums' }}>
        {String(score).padStart(6, '0')}
      </p>

      {score > 0 && score >= hiScore && (
        <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ab-accent)', marginBottom: 8 }}>
          // New high score
        </p>
      )}

      <p style={{ fontSize: 12, color: 'var(--ab-dim)', marginBottom: 40 }}>
        Best · {String(hiScore).padStart(6, '0')}
      </p>

      <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ab-accent)' }}>
        {isTouchDevice ? 'Tap to play again' : 'Press Enter or Space to play again'}
      </p>
    </div>
  )
}
