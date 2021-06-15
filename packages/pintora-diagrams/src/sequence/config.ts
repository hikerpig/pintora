import { MarkAttrs } from '@pintora/core'
import { PALETTE } from '../util/theme'

export {
  PALETTE
}

export interface ITheme {
  textColor: string
  primaryColor: string
}

export const THEME: ITheme = {
  textColor: PALETTE.normalDark,
  primaryColor: PALETTE.orange,
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

  loopLineColor: string

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

  loopLineColor: PALETTE.orange,

  actorStyle: {
    fill: THEME.primaryColor,
    stroke: THEME.textColor,
  },
  actorTextColor: PALETTE.normalDark,

  showSequenceNumbers: false,
}

