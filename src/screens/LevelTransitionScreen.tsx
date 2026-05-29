import { useGameStore } from '../store'

export default function LevelTransitionScreen() {
  const phase = useGameStore(s => s.phase)
  const level = useGameStore(s => s.level)
  const show  = phase === 'transitioning'

  return (
    <div
      data-testid="level-transition-screen"
      style={{
        position:       'absolute',
        inset:          0,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        opacity:        show ? 1 : 0,
        pointerEvents:  'none',
        transition:     'opacity 200ms var(--ab-ease-out)',
        zIndex:         3,
      }}
    >
      <p style={{ fontFamily: 'var(--ab-display)', fontSize: 64, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ab-text)', margin: 0 }}>
        LEVEL {level}
      </p>
    </div>
  )
}
