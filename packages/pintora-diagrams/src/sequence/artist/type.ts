import { Message } from '../db'

export type ActivationData = {
  startx: number
  starty: number
  stopx: number
  stopy: number
  actor: string
  startEventIndex?: number
  endEventIndex?: number
  level?: number
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
  kind?: 'loop' | 'opt' | 'alt' | 'par'
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

export type MessageModel = {
  width: number
  height: number
  startx: number
  stopx: number
  starty: number
  stopy: number
  text: Message['text']
  type: Message['type']
  itemId: string
  sequenceIndex?: number
  fromBound?: number
  toBound?: number
}

export type NoteModel = {
  width: number
  height: number
  startx: number
  stopx: number
  starty: number
  stopy: number
  text: Message['text']
  sequenceIndex?: number
  fromBound?: number
  toBound?: number
}

export type SequenceArtistLayoutState = {
  actorAttrsMap: Map<string, { x: number; width: number }>
  msgModelMap: Map<string, MessageModel>
  noteModelMap: Map<string, NoteModel>
  dividerMap: Map<string, MessageModel>
  activations: ActivationData[]
  completedActivations: ActivationData[]
  loops: LoopModel[]
}
