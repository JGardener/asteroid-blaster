import { useState, useEffect } from 'react'

function isLandscape() {
  return window.innerWidth >= window.innerHeight
}

export default function LandscapeGuard({ children }: { children: React.ReactNode }) {
  const [landscape, setLandscape] = useState(isLandscape)

  useEffect(() => {
    const update = () => setLandscape(isLandscape())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return (
    <>
      {!landscape && (
        <div
          data-testid="landscape-guard-prompt"
          style={{
            position:        'fixed',
            inset:           0,
            zIndex:          9999,
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'center',
            background:      'var(--ab-bg)',
            color:           'var(--ab-text)',
            fontFamily:      'var(--ab-display)',
            gap:             '12px',
            textAlign:       'center',
            padding:         '24px',
            boxSizing:       'border-box',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect x="6" y="10" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
            <rect x="14" y="6" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M6 20 L2 24 L6 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
          </svg>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--ab-text)' }}>
            Rotate your device
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ab-dim)' }}>
            This game requires landscape orientation
          </p>
        </div>
      )}
      <div
        aria-hidden={!landscape}
        style={{ width: '100%', height: '100%', ...(landscape ? {} : { visibility: 'hidden' }) }}
      >
        {children}
      </div>
    </>
  )
}
