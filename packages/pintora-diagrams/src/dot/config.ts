import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { PALETTE } from '../util/theme'
import { BaseFontConfig, defaultFontConfig, getFontConfigRules } from '../util/font-config'

export type DOTConf = BaseFontConfig & {
  diagramPadding: number

  layoutDirection: string
  ranksep: number
  nodesep: number
  edgesep: number
  edgeType: EdgeType

  nodePadding: number
  nodeBorderRadius: number

  backgroundColor: string

  labelTextColor: string
  nodeBorderColor: string
  edgeColor: string
}

export const defaultConfig: DOTConf = {
  ...defaultFontConfig,
  diagramPadding: 15,

  layoutDirection: 'TB',
  ranksep: 20,
  nodesep: 20,
  edgesep: 10,
  edgeType: 'polyline',

  nodePadding: 8,
  nodeBorderRadius: 2,

  backgroundColor: PALETTE.white,

  labelTextColor: PALETTE.normalDark,
  nodeBorderColor: PALETTE.normalDark,
  edgeColor: PALETTE.normalDark,
} as const

export const DOT_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
  ...getFontConfigRules(),
} as const

export const configKey = 'dot'

const configurator = makeConfigurator<DOTConf>({
  defaultConfig,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(DOT_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t) {
    return {
      backgroundColor: t.canvasBackground,
      labelTextColor: t.textColor,
      nodeBorderColor: t.primaryLineColor,
      edgeColor: t.primaryLineColor,
    }
  },
})

export const getConf = configurator.getConfig
