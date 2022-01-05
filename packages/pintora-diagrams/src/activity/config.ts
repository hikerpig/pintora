import { DiagramsConf } from '../type'
import { PALETTE } from '../util/theme'
import { configApi, safeAssign } from '@pintora/core'
import { interpreteStyles, StyleParam } from '../util/style'

export type ActivityConf = {
  diagramPadding: number

  edgesep: number
  curvedEdge: boolean

  actionPaddingX: number
  actionPaddingY: number

  actionBackground: string
  actionBorderColor: string

  groupBackground: string
  groupBorderColor: string

  textColor: string
  edgeColor: string

  keywordBackground: string

  noteTextColor: string
  noteMargin: number

  labelTextColor: string
  labelBackground: string

  fontSize: number
}

export const defaultConfig: ActivityConf = {
  diagramPadding: 15,

  edgesep: 60,
  curvedEdge: true,

  actionPaddingX: 10,
  actionPaddingY: 10,
  actionBackground: PALETTE.orange,
  actionBorderColor: PALETTE.normalDark,

  groupBackground: PALETTE.white,
  groupBorderColor: PALETTE.normalDark,

  textColor: PALETTE.normalDark,
  edgeColor: PALETTE.normalDark,

  keywordBackground: PALETTE.normalDark,

  noteTextColor: PALETTE.normalDark,
  noteMargin: 10,

  labelTextColor: PALETTE.normalDark,
  labelBackground: PALETTE.white,

  fontSize: 14,
}

export const ACTIVITY_STYLE_RULES = {
  diagramPadding: { valueType: 'size' },

  curvedEdge: { valueType: 'boolean' },

  actionPaddingX: { valueType: 'size' },
  actionPaddingY: { valueType: 'size' },
  actionBackground: { valueType: 'color' },
  actionBorderColor: { valueType: 'color' },

  groupBackground: { valueType: 'color' },
  groupBorderColor: { valueType: 'color' },

  textColor: { valueType: 'color' },
  edgeColor: { valueType: 'color' },

  keywordBackground: { valueType: 'color' },

  noteTextColor: { valueType: 'color' },
  noteMargin: { valueType: 'size' },

  labelBackground: { valueType: 'color' },
  labelTextColor: { valueType: 'color' },

  fontSize: { valueType: 'size' },
} as const

export function getConf(styleParams: StyleParam[]) {
  const globalConfig: DiagramsConf = configApi.getConfig()
  const t = globalConfig.themeConfig?.themeVariables
  const conf = { ...defaultConfig }
  if (t) {
    safeAssign(conf, {
      actionBackground: t.secondaryColor,
      actionBorderColor: t.primaryBorderColor,
      groupBackground: t.groupBackground,
      groupBorderColor: t.primaryBorderColor,
      textColor: t.textColor,
      edgeColor: t.primaryColor,
      keywordBackground: t.textColor,
      labelBackground: t.canvasBackground || t.background1,
      labelTextColor: t.textColor,
    })
  }
  Object.assign(conf, globalConfig.er || {})
  Object.assign(conf, interpreteStyles(ACTIVITY_STYLE_RULES, styleParams))
  return conf
}
