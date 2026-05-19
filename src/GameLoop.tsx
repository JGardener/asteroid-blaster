import * as PIXI from 'pixi.js'
import { useGameLoop } from './useGameLoop'

interface GameLoopProps {
  app: PIXI.Application
}

export default function GameLoop({ app }: GameLoopProps) {
  useGameLoop(app)
  return null
}
