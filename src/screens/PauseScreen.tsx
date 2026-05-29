import { useState } from 'react'
import { useGameStore } from '../store'
import { useAudioStore } from '../audioStore'

interface PauseScreenProps {
  onClose: () => void
}

const btnStyle: React.CSSProperties = {
  background:    'none',
  border:        '1px solid var(--ab-muted)',
  borderRadius:  4,
  padding:       '6px 24px',
  color:         'var(--ab-text)',
  fontFamily:    'var(--ab-mono)',
  fontSize:      11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor:        'pointer',
  width:         160,
}

export default function PauseScreen({ onClose }: PauseScreenProps) {
  const phase          = useGameStore(s => s.phase)
  const setPhase       = useGameStore(s => s.setPhase)
  const requestRestart = useGameStore(s => s.requestRestart)
  const show           = phase === 'paused'

  const sfxVolume      = useAudioStore(s => s.sfxVolume)
  const musicVolume    = useAudioStore(s => s.musicVolume)
  const isMuted        = useAudioStore(s => s.isMuted)
  const setSfxVolume   = useAudioStore(s => s.setSfxVolume)
  const setMusicVolume = useAudioStore(s => s.setMusicVolume)
  const toggleMute     = useAudioStore(s => s.toggleMute)

  const [confirmMode, setConfirmMode] = useState<'restart' | 'quit' | null>(null)

  const confirmActions = {
    restart: requestRestart,
    quit:    onClose,
  }

  return (
    <div
      data-testid="pause-screen"
      style={{
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
        pointerEvents:   show ? 'auto' : 'none',
        transition:      'opacity 200ms var(--ab-ease-out)',
        zIndex:          2,
      }}
    >
      <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ab-dim)', marginBottom: 24 }}>
        // Paused
      </p>

      {confirmMode === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={btnStyle} onClick={() => setPhase('playing')}>Resume</button>
          <button style={btnStyle} onClick={() => setConfirmMode('restart')}>Restart</button>
          <button style={btnStyle} onClick={() => setConfirmMode('quit')}>Quit</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 11, color: 'var(--ab-dim)', marginBottom: 8, letterSpacing: '0.06em' }}>
            {confirmMode === 'restart' ? 'Reset game to level 1?' : 'Quit the game?'}
          </p>
          <button style={btnStyle} onClick={() => { confirmActions[confirmMode](); setConfirmMode(null) }}>Confirm</button>
          <button style={btnStyle} onClick={() => setConfirmMode(null)}>Cancel</button>
        </div>
      )}

      <hr style={{ width: 160, borderColor: 'var(--ab-muted)', margin: '20px 0 16px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 160 }}>
        <div>
          <label htmlFor="ab-sfx" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ab-dim)' }}>
            SFX {Math.round(sfxVolume * 100)}%
          </label>
          <input
            id="ab-sfx"
            type="range"
            min={0} max={1} step={0.01}
            value={sfxVolume}
            onChange={e => setSfxVolume(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label htmlFor="ab-music" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ab-dim)' }}>
            Music {Math.round(musicVolume * 100)}%
          </label>
          <input
            id="ab-music"
            type="range"
            min={0} max={1} step={0.01}
            value={musicVolume}
            onChange={e => setMusicVolume(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <button style={btnStyle} onClick={toggleMute}>
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </div>
  )
}
