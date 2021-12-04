import { DiagramsConf } from '../type'
import { PALETTE } from '../util/theme'
import { configApi, safeAssign } from '@pintora/core'
import { interpreteStyles, StyleParam } from '../util/style'

export type ActivityConf = {
  diagramPadding: number
  layoutDirection: string

  actionPaddingX: number
  actionPaddingY: number

  actionBackground: string
  actionBorderColor: string

  groupBackground: string
  groupBorderColor: string

  textColor: string
  edgeColor: string

  keywordBgColor: string

  noteTextColor: string
  noteMargin: number

  fontSize: number
}

export const defaultConfig: ActivityConf = {
  diagramPadding: 15,
  layoutDirection: 'TB',

  actionPaddingX: 10,
  actionPaddingY: 10,
  actionBackground: PALETTE.orange,
  actionBorderColor: PALETTE.normalDark,

  groupBackground: PALETTE.white,
  groupBorderColor: PALETTE.normalDark,

  textColor: PALETTE.normalDark,
  edgeColor: PALETTE.normalDark,

  keywordBgColor: PALETTE.normalDark,

  noteTextColor: PALETTE.normalDark,
  noteMargin: 10,

  fontSize: 14,
}

export const ACTIVITY_STYLE_RULES = {
  textColor: { valueType: 'color' },
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
      keywordBgColor: t.textColor,
    })
  }
  Object.assign(conf, globalConfig.er || {})
  Object.assign(conf, interpreteStyles(ACTIVITY_STYLE_RULES, styleParams))
  return conf
}
