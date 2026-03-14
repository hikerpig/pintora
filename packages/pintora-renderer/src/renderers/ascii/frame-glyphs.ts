import { FrameSemantic } from '@pintora/core'

export type NoteFrameGlyphs = {
  topLeft: string
  topRight: string
  top: string
  sideLeft: string
  sideRight: string
  bottomLeft: string
  bottomRight: string
  bottom: string
  foldTop?: string
  foldSide?: string
  foldBottom?: string
}

export type DecisionFrameGlyphs = {
  topLeft: string
  topRight: string
  top: string
  sideLeft: string
  sideRight: string
  bottomLeft: string
  bottomRight: string
  bottom: string
  bottomCenter: string
}

export function getNoteFrameGlyphs(frame: FrameSemantic): NoteFrameGlyphs | null {
  if (frame.kind !== 'note') return null

  return {
    topLeft: '╭',
    topRight: '╮',
    top: '─',
    sideLeft: '│',
    sideRight: '│',
    bottomLeft: '╰',
    bottomRight: '╯',
    bottom: '─',
    foldTop: '┬',
    foldSide: '│',
    foldBottom: '╰',
  }
}

export function getDecisionFrameGlyphs(frame: FrameSemantic): DecisionFrameGlyphs | null {
  if (frame.kind !== 'decision') return null

  return {
    topLeft: '◇',
    topRight: '◇',
    top: '─',
    sideLeft: '│',
    sideRight: '│',
    bottomLeft: '◇',
    bottomRight: '◇',
    bottom: '─',
    bottomCenter: '┬',
  }
}
