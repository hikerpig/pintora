import { PALETTE } from '../util/theme'
import { configApi, safeAssign, PintoraConfig } from '@pintora/core'
import { interpreteStyles, StyleParam } from '../util/style'

export type ComponentConf = {
  diagramPadding: number

  componentPadding: number
  componentBackground: string
  componentBorderColor: string

  groupBackground: string
  groupBorderColor: string
  groupBorderWidth: number

  relationLineColor: string
  textColor: string
  fontSize: number
  lineWidth: number

  labelBackground: string

  interfaceSize: number
}

export const defaultConfig: ComponentConf = {
  diagramPadding: 15,

  componentPadding: 15,
  componentBackground: PALETTE.yellow,
  componentBorderColor: PALETTE.orange,

  groupBackground: PALETTE.white,
  groupBorderColor: PALETTE.normalDark,
  groupBorderWidth: 2,

  relationLineColor: PALETTE.orange,
  textColor: PALETTE.normalDark,
  fontSize: 14,
  lineWidth: 1,

  labelBackground: PALETTE.white,

  interfaceSize: 16,
}

export const COMPONENT_STYLE_RULES = {
  diagramPadding: { valueType: 'size' },
  componentPadding: { valueType: 'size' },
  componentBackground: { valueType: 'color' },
  componentBorderColor: { valueType: 'color' },
  groupBackground: { valueType: 'color' },
  groupBorderColor: { valueType: 'color' },
  groupBorderWidth: { valueType: 'size' },
  relationLineColor: { valueType: 'color' },
  textColor: { valueType: 'color' },
  lineWidth: { valueType: 'size' },
  labelBackground: { valueType: 'color' },
  interfaceSize: { valueType: 'size' },
} as const

export function getConf(styleParams: StyleParam[]) {
  const conf = { ...defaultConfig }
  const globalConfig: PintoraConfig = configApi.getConfig()
  const t = globalConfig.themeConfig.themeVariables
  safeAssign(conf, {
    componentBackground: t.primaryColor,
    componentBorderColor: t.primaryBorderColor,
    groupBackground: t.groupBackground,
    groupBorderColor: t.primaryBorderColor,
    relationLineColor: t.primaryColor,
    labelBackground: t.canvasBackground || t.background1,
    textColor: t.textColor,
  })
  Object.assign(conf, globalConfig.component || {})
  Object.assign(conf, interpreteStyles(COMPONENT_STYLE_RULES, styleParams))
  return conf
}
