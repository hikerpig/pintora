import { FrameSemantic } from '@pintora/core'
import { Charset } from './types'

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

export function getNoteFrameGlyphs(frame: FrameSemantic, charset: Charset): NoteFrameGlyphs | null {
  if (frame.kind !== 'note') return null
  if (charset === 'ascii') {
    return {
      topLeft: '.',
      topRight: '.',
      top: '-',
      sideLeft: ':',
      sideRight: ':',
      bottomLeft: "'",
      bottomRight: "'",
      bottom: '-',
    }
  }

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

export function getDecisionFrameGlyphs(frame: FrameSemantic, charset: Charset): DecisionFrameGlyphs | null {
  if (frame.kind !== 'decision') return null
  if (charset === 'ascii') {
    return {
      topLeft: '<',
      topRight: '>',
      top: '-',
      sideLeft: '|',
      sideRight: '|',
      bottomLeft: '<',
      bottomRight: '>',
      bottom: '-',
      bottomCenter: '+',
    }
  }

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
