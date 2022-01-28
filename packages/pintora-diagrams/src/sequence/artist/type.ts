import { Message } from '../db'

export type ActivationData = {
  startx: number
  starty: number
  stopx: number
  stopy: number
  actor: string
}

export type LoopModel = {
  startx: number
  stopx: number
  starty: number
  stopy: number
  width: number
  height: number
  title: string
  wrap?: boolean
  sections?: LoopSection[]
  fill?: string | null
}

export type LoopSection = {
  y: number
  width: number
  height: number
  fill: string | undefined
  message: Message
}

export type SequenceDiagramBounds = {
  startx: number
  stopx: number
  starty: number
  stopy: number
}
