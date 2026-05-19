import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AsteroidBlaster from './AsteroidBlaster'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ width: '100vw', height: '100vh' }}>
      <AsteroidBlaster onClose={() => console.log('onClose called')} />
    </div>
  </StrictMode>
)
