import { MarkAttrs } from '@pintora/core'
import { PALETTE } from '../util/theme'
import { configApi, safeAssign } from '@pintora/core'
import { DiagramsConf } from '../type'

export type SequenceConf = {
  noteWidth: number
  noteHeight: number
  noteMargin: number
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

  /** color of loop box's border */
  loopLineColor: string

  /** if the actor should also appear in the bottom of the diagram, default is true */
  mirrorActors: boolean
  actorWidth: number
  actorHeight: number
  actorMargin: number

  actorBackground: string
  actorBorderColor: string
  actorTextColor: string
  actorLineColor: string

  noteTextColor: string

  activationBackground: string

  dividerFontWeight: MarkAttrs['fontWeight']
  dividerTextColor: string

  showSequenceNumbers: boolean
}

export const defaultConfig: SequenceConf = {
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

  mirrorActors: true,
  actorWidth: 80,
  actorHeight: 50,
  actorMargin: 10,
  actorBackground: PALETTE.orange,
  actorBorderColor: PALETTE.normalDark,
  actorTextColor: PALETTE.normalDark,
  actorLineColor: PALETTE.normalDark,

  noteTextColor: PALETTE.normalDark,

  activationBackground: PALETTE.neutralGray,

  dividerFontWeight: 600,
  dividerTextColor: PALETTE.normalDark,

  showSequenceNumbers: false,
}

export const conf: SequenceConf = {
  ...defaultConfig,
}

export function getConf() {
  const globalConfig: DiagramsConf = configApi.getConfig()
  const t = globalConfig.themeConfig.themeVariables
  safeAssign(conf, {
    actorBackground: t.primaryColor,
    actorBorderColor: t.primaryBorderColor,
    messageTextColor: t.textColor,
    loopLineColor: t.primaryColor,
    actorTextColor: t.primaryTextColor,
    actorLineColor: t.primaryLineColor,
    noteTextColor: t.noteTextColor || t.textColor,
    activationBackground: t.background1,
    dividerTextColor: t.secondaryTextColor,
  })
  Object.assign(conf, globalConfig.sequence || {})
  return conf
}
