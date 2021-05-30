import { MarkAttrs } from '@pintora/core'

export const PALETTE = {
  normalDark: '#282a36',
  neutralGray: '#f8f8f2',
  cyan: '#8be9fd',
  green: '#50fa7b',
  orange: '#ffb86c',
  pink: '#ff79c6',
  purple: '#bd93f9',
  red: '#ff5555',
  yellow: '#f1fa8c'
}

export type SequenceConf = {
  actorWidth: number
  actorHeight: number
  actorMargin: number
  noteWidth: number
  noteHeight: number
  noteMargin: number
  mirrorActors: boolean
  boxMargin: number
  activationWidth: number
  diagramMarginX: number
  diagramMarginY: number
  boxTextMargin: number;

  messageFontFamily: string
  messageFontSize: number
  messageFontWeight: MarkAttrs['fontWeight']
  messageTextColor: string
  wrapPadding: number
  labelBoxWidth: number
  labelBoxHeight: number

  actorStyle: Partial<MarkAttrs>
  actorTextColor: string


  showSequenceNumbers: boolean
}

export const defaultConfig: SequenceConf = {
  mirrorActors: true,
  actorWidth: 80,
  actorHeight: 50,
  actorMargin: 10,
  noteWidth: 80,
  noteHeight: 50,
  noteMargin: 10,
  boxMargin: 10,
  activationWidth: 10,
  diagramMarginX: 10,
  diagramMarginY: 10,
  boxTextMargin: 5,

  messageFontSize: 16,
  messageFontFamily: 'menlo, sans-serif',
  messageFontWeight: 400,
  messageTextColor: PALETTE.normalDark,
  wrapPadding: 10,
  labelBoxWidth: 50,
  labelBoxHeight: 20,

  actorStyle: {
    fill: PALETTE.pink,
    stroke: PALETTE.normalDark,
  },
  actorTextColor: PALETTE.normalDark,

  showSequenceNumbers: false,
}

