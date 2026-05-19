import { useGameStore } from '../store'

export default function PauseScreen() {
  const phase = useGameStore(s => s.phase)
  const show  = phase === 'paused'

  return (
    <div style={{
      position:        'absolute',
      inset:           0,
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      fontFamily:      'var(--ab-mono)',
      backgroundColor: 'rgba(10,10,15,0.6)',
      backdropFilter:  'blur(4px)',
      opacity:         show ? 1 : 0,
      pointerEvents:   'none',
      transition:      'opacity 200ms var(--ab-ease-out)',
      zIndex:          2,
    }}>
      <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ab-dim)', marginBottom: 12 }}>
        // Paused
      </p>
      <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ab-accent)' }}>
        Press Esc to resume
      </p>
    </div>
  )
}
