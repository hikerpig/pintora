import { PALETTE } from '../util/theme'
import { configApi, safeAssign, PintoraConfig, DEFAULT_FONT_FAMILY } from '@pintora/core'
import { interpreteConfigs, ConfigParam } from '../util/style'

export type ErConf = {
  diagramPadding: number
  layoutDirection: string

  curvedEdge: boolean

  minEntityWidth: number
  minEntityHeight: number

  entityPaddingX: number
  entityPaddingY: number
  borderRadius: number

  stroke: string
  fill: string
  edgeColor: string
  attributeFill: string

  textColor: string

  labelBackground: string

  fontSize: number
  fontFamily: string
}

export const defaultConfig: ErConf = {
  diagramPadding: 15,
  layoutDirection: 'TB',

  curvedEdge: true,

  minEntityWidth: 90,

  minEntityHeight: 50,

  entityPaddingX: 15,
  entityPaddingY: 15,

  borderRadius: 2,

  stroke: PALETTE.normalDark,
  fill: PALETTE.orange,
  // fill: 'transparent', // for debugging markers
  edgeColor: PALETTE.normalDark,
  attributeFill: '#fffbf9',

  textColor: PALETTE.normalDark,

  labelBackground: PALETTE.white,

  fontSize: 14,
  fontFamily: DEFAULT_FONT_FAMILY,
}

export const ER_CONFIG_DIRECTIVE_RULES = {
  curvedEdge: { valueType: 'boolean' },
  layoutDirection: { valueType: 'string' },
  borderRadius: { valueType: 'size' },
  stroke: { valueType: 'color' },
  fill: { valueType: 'color' },
  edgeColor: { valueType: 'color' },
  attributeFill: { valueType: 'color' },
  textColor: { valueType: 'color' },
  labelBackground: { valueType: 'color' },
  fontSize: { valueType: 'size' },
  fontFamily: { valueType: 'string' },
} as const

export function getConf(configParams: ConfigParam[]) {
  const globalConfig: PintoraConfig = configApi.getConfig()
  const t = globalConfig.themeConfig?.themeVariables
  const conf = { ...defaultConfig }
  if (t) {
    safeAssign(conf, {
      stroke: t.primaryBorderColor,
      fill: t.primaryColor,
      edgeColor: t.primaryLineColor,
      textColor: t.textColor,
      labelBackground: t.canvasBackground || t.background1,
      attributeFill: t.lightestBackground || conf.attributeFill,
    })
  }
  safeAssign(conf, { fontFamily: globalConfig.core.defaultFontFamily }, globalConfig.er || {})
  safeAssign(conf, interpreteConfigs(ER_CONFIG_DIRECTIVE_RULES, configParams))
  return conf
}
