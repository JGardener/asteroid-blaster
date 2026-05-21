import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { CANVAS_W, CANVAS_H } from './constants'

interface PixiCanvasProps {
  onAppReady: (app: Application) => void
  onError?: (err: Error) => void
}

export default function PixiCanvas({ onAppReady, onError }: PixiCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const app = new Application()
    let initialized = false
    let cleanedUp = false

    const handleContextLost = (e: Event) => {
      e.preventDefault()
      const error = new Error('WebGL context lost')
      console.error('[AsteroidBlaster] WebGL context lost', error)
      onErrorRef.current?.(error)
    }

    async function init() {
      try {
        await app.init({
          width:           CANVAS_W,
          height:          CANVAS_H,
          backgroundAlpha: 0,
          antialias:       true,
          resolution:      Math.min(window.devicePixelRatio, 2),
          autoDensity:     true,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('[AsteroidBlaster] PixiJS init failed:', error)
        onErrorRef.current?.(error)
        return
      }

      if (cleanedUp) {
        app.destroy(true, { children: true, texture: true })
        return
      }

      initialized = true
      app.canvas.style.width     = '100%'
      app.canvas.style.height    = '100%'
      app.canvas.style.display   = 'block'
      app.canvas.style.objectFit = 'contain'

      app.canvas.addEventListener('webglcontextlost', handleContextLost)

      container.appendChild(app.canvas)
      onAppReady(app)
    }

    init()

    return () => {
      if (initialized) {
        app.canvas.removeEventListener('webglcontextlost', handleContextLost)
        app.destroy(true, { children: true, texture: true })
      } else {
        // Cleanup ran before init finished — safe to destroy now
        cleanedUp = true
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}
