import { useGameStore } from './store'
import { STARTING_LIVES } from './constants'

export default function GameHUD({ isTouchDevice: _isTouchDevice }: { isTouchDevice?: boolean } = {}) {
  const { score, lives, level, phase } = useGameStore()

  if (phase === 'menu' || phase === 'gameover') return null

  return (
    <div
      aria-live="polite"
      style={{
        position:       'absolute',
        inset:          0,
        pointerEvents:  'none',
        zIndex:         1,
        fontFamily:     'var(--ab-mono)',
        color:          'var(--ab-text)',
      }}
    >
      {/* Score — top left */}
      <div style={{ position: 'absolute', top: 20, left: 24 }}>
        <div style={{ fontSize: 10, color: 'var(--ab-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
          Score
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--ab-text)', fontVariantNumeric: 'tabular-nums' }}>
          {String(score).padStart(6, '0')}
        </div>
      </div>

      {/* Level — top centre */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ab-dim)' }}>
        // Level {level}
      </div>

      {/* Lives — bottom right */}
      <div style={{ position: 'absolute', bottom: 20, right: 24, display: 'flex', gap: 6 }}>
        {Array.from({ length: STARTING_LIVES }).map((_, i) => (
          <span
            key={i}
            style={{
              fontSize:   16,
              color:      i < lives ? 'var(--ab-accent)' : 'var(--ab-muted)',
              transition: 'color 200ms',
            }}
          >
            ▲
          </span>
        ))}
      </div>

      {/* Pause hint — bottom centre */}
      {phase === 'playing' && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ab-muted)' }}>
          Esc · Pause
        </div>
      )}
    </div>
  )
}
