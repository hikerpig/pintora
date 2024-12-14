import { PALETTE } from '../util/theme'
import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { BaseFontConfig, defaultFontConfig, getFontConfigRules } from '../util/font-config'

export type ErConf = BaseFontConfig & {
  diagramPadding: number

  layoutDirection: string
  ranksep: number
  edgesep: number

  edgeType: EdgeType
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
}

export const defaultConfig: ErConf = {
  ...defaultFontConfig,
  diagramPadding: 15,

  layoutDirection: 'TB',
  ranksep: 100,
  edgesep: 80,

  edgeType: 'polyline',
  useMaxWidth: false,

  minEntityWidth: 80,
  minEntityHeight: 50,

  entityPaddingX: 15,
  entityPaddingY: 15,

  borderRadius: 2,

  stroke: PALETTE.normalDark,
  fill: PALETTE.orange,
  edgeColor: PALETTE.normalDark,
  attributeFill: '#fffbf9',

  textColor: PALETTE.normalDark,

  labelBackground: PALETTE.white,
} as const

export const ER_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
  ...getFontConfigRules(),
  useMaxWidth: { valueType: 'boolean' },
  layoutDirection: { valueType: 'string' },
  borderRadius: { valueType: 'size' },
  stroke: { valueType: 'color' },
  fill: { valueType: 'color' },
  edgeColor: { valueType: 'color' },
  attributeFill: { valueType: 'color' },
  textColor: { valueType: 'color' },
  labelBackground: { valueType: 'color' },
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
      // fill: 'transparent', // for debugging markers
      edgeColor: t.primaryLineColor,
      textColor: t.textColor,
      labelBackground: t.canvasBackground || t.background1,
      attributeFill: t.lightestBackground || conf.attributeFill,
    }
  },
})

export const getConf = configurator.getConfig
