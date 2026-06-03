import { useGameStore } from '../store'
import { setTouch } from '../touchInput'

export default function MenuScreen({ isTouchDevice = false }: { isTouchDevice?: boolean } = {}) {
  const phase = useGameStore(s => s.phase)
  const show  = phase === 'menu'

  function handlePointerDown() {
    setTouch('confirm', true)
    setTouch('confirm', false)
  }

  return (
    <div
      data-testid="menu-screen-overlay"
      onPointerDown={isTouchDevice && show ? handlePointerDown : undefined}
      style={{
        position:        'absolute',
        inset:           0,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        fontFamily:      'var(--ab-mono)',
        backgroundColor: 'rgba(10,10,15,0.88)',
        opacity:         show ? 1 : 0,
        pointerEvents:   isTouchDevice && show ? 'auto' : 'none',
        transition:      'opacity 300ms var(--ab-ease-out)',
        zIndex:          2,
      }}
    >
      <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ab-dim)', marginBottom: 16 }}>
        // James Gardener · 2026
      </p>

      <h1 style={{ fontFamily: 'var(--ab-display)', fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ab-text)', margin: '0 0 8px' }}>
        Asteroid Blaster
      </h1>

      <p style={{ fontSize: 12, color: 'var(--ab-dim)', marginBottom: 48 }}>
        PixiJS · TypeScript · React · Object pooling
      </p>

      <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ab-accent)', marginBottom: 32 }}>
        {isTouchDevice ? 'Tap to play' : 'Press Enter or Space to play'}
      </p>

      {!isTouchDevice && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ab-muted)', letterSpacing: '0.06em' }}>
          <span>↑ / W · Thrust</span>
          <span>← → / A D · Rotate</span>
          <span>Space · Fire</span>
          <span>Esc · Pause</span>
        </div>
      )}
    </div>
  )
}
