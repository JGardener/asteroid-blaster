import { setTouch } from './touchInput'
import type { TouchAction } from './touchInput'

interface VirtualButtonProps {
  action: TouchAction
  label: string
  style?: React.CSSProperties
}

function VirtualButton({ action, label, style }: VirtualButtonProps) {
  return (
    <button
      aria-label={label}
      onPointerDown={() => setTouch(action, true)}
      onPointerUp={() => setTouch(action, false)}
      onPointerLeave={() => setTouch(action, false)}
      style={{
        pointerEvents:   'auto',
        touchAction:     'none',
        background:      'var(--ab-surface)',
        border:          '2px solid var(--ab-muted)',
        borderRadius:    '50%',
        color:           'var(--ab-text)',
        fontFamily:      'var(--ab-mono)',
        fontSize:        11,
        letterSpacing:   '0.06em',
        textTransform:   'uppercase',
        cursor:          'pointer',
        userSelect:      'none',
        WebkitUserSelect: 'none',
        ...style,
      }}
    >
      {label}
    </button>
  )
}

export default function VirtualControls() {
  return (
    <div
      data-testid="virtual-controls-overlay"
      style={{
        position:       'absolute',
        inset:          0,
        pointerEvents:  'none',
        zIndex:         5,
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-end',
        padding:        '20px 24px',
      }}
    >
      {/* Left thumb: Thrust on top, Left+Right on bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <VirtualButton action="thrust" label="Thrust" style={{ width: 72, height: 72 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <VirtualButton action="left" label="Left" style={{ width: 64, height: 64 }} />
          <VirtualButton action="right" label="Right" style={{ width: 64, height: 64 }} />
        </div>
      </div>

      {/* Right thumb: large Fire button */}
      <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 20 }}>
        <VirtualButton action="fire" label="Fire" style={{ width: 96, height: 96 }} />
      </div>
    </div>
  )
}
