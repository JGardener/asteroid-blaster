import * as PIXI from 'pixi.js'
import { useGameLoop } from './useGameLoop'

interface GameLoopProps {
  app: PIXI.Application
  onError?: (err: Error) => void
}

export default function GameLoop({ app, onError }: GameLoopProps) {
  useGameLoop(app, onError)
  return null
}
