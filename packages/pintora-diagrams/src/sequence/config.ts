import { MarkAttrs } from '@pintora/core'
import { PALETTE } from '../util/theme'
import { configApi, safeAssign } from '@pintora/core'
import { DiagramsConf } from '../type'

// export {
//   PALETTE
// }

// export interface ITheme {
//   textColor: string
//   primaryColor: string
// }

// export const THEME: ITheme = {
//   textColor: PALETTE.normalDark,
//   primaryColor: PALETTE.orange,
// }

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
  actorLineColor: string

  noteTextColor: string

  activationBackground: string

  dividerFontWeight: MarkAttrs['fontWeight']

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
    fill: PALETTE.orange,
    stroke: PALETTE.normalDark,
  },
  actorTextColor: PALETTE.normalDark,
  actorLineColor: PALETTE.normalDark,

  noteTextColor: PALETTE.normalDark,

  activationBackground: PALETTE.neutralGray,

  dividerFontWeight: 600,

  showSequenceNumbers: false,
}

export const conf: SequenceConf = {
  ...defaultConfig,
}

export function getConf() {
  const globalConfig: DiagramsConf = configApi.getConfig()
  const t = globalConfig.core.themeVariables
  safeAssign(conf, {
    actorStyle: {
      fill: t.primaryColor,
      stroke: t.primaryBorderColor,
    },
    messageTextColor: t.textColor,
    loopLineColor: t.primaryColor,
    actorTextColor: t.textColor,
    actorLineColor: t.primaryLineColor,
    noteTextColor: t.noteTextColor || t.textColor,
    activationBackground: t.background1,
  })
  Object.assign(conf, globalConfig.sequence || {})
  return conf
}
