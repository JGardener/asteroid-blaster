import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { CANVAS_W, CANVAS_H } from './constants'

interface PixiCanvasProps {
  onAppReady: (app: Application) => void
}

export default function PixiCanvas({ onAppReady }: PixiCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const app = new Application()
    let initialized = false
    let cleanedUp = false

    async function init() {
      await app.init({
        width:           CANVAS_W,
        height:          CANVAS_H,
        backgroundAlpha: 0,
        antialias:       true,
        resolution:      Math.min(window.devicePixelRatio, 2),
        autoDensity:     true,
      })
      if (cleanedUp) {
        // Cleanup ran before init finished — safe to destroy now
        app.destroy(true, { children: true, texture: true })
        return
      }
      initialized = true
      app.canvas.style.width     = '100%'
      app.canvas.style.height    = '100%'
      app.canvas.style.display   = 'block'
      app.canvas.style.objectFit = 'contain'
      container.appendChild(app.canvas)
      onAppReady(app)
    }

    init()

    return () => {
      if (initialized) {
        app.destroy(true, { children: true, texture: true })
      } else {
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
