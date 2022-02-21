import { PALETTE } from '../util/theme'
import { DEFAULT_FONT_FAMILY } from '@pintora/core'
import { interpreteConfigs, makeConfigurator } from '../util/config'

export type ErConf = {
  diagramPadding: number
  layoutDirection: string

  curvedEdge: boolean
  useMaxWidth: boolean

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
  useMaxWidth: false,

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

export const ER_PARAM_DIRECTIVE_RULES = {
  curvedEdge: { valueType: 'boolean' },
  useMaxWidth: { valueType: 'boolean' },
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

export const configKey = 'er'

const configurator = makeConfigurator<ErConf>({
  defaultConfig,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(ER_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t, conf) {
    return {
      stroke: t.primaryBorderColor,
      fill: t.primaryColor,
      edgeColor: t.primaryLineColor,
      textColor: t.textColor,
      labelBackground: t.canvasBackground || t.background1,
      attributeFill: t.lightestBackground || conf.attributeFill,
    }
  },
})

export const getConf = configurator.getConfig
