import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { DEFAULT_FONT_FAMILY } from '../util/text'
import { PALETTE } from '../util/theme'

export type DOTConf = {
  diagramPadding: number

  layoutDirection: string
  ranksep: number
  nodesep: number
  edgesep: number
  edgeType: EdgeType

  nodePadding: number
  nodeBorderRadius: number

  labelTextColor: string
  edgeColor: string

  fontSize: number
  fontFamily: string
}

export const defaultConfig: DOTConf = {
  diagramPadding: 15,

  layoutDirection: 'TB',
  ranksep: 20,
  nodesep: 20,
  edgesep: 10,
  edgeType: 'polyline',

  nodePadding: 8,
  nodeBorderRadius: 2,

  labelTextColor: PALETTE.normalDark,
  edgeColor: PALETTE.normalDark,

  fontSize: 14,
  fontFamily: DEFAULT_FONT_FAMILY,
} as const

export const DOT_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
} as const

export const configKey = 'dot'

const configurator = makeConfigurator<DOTConf>({
  defaultConfig,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(DOT_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t) {
    return {}
  },
})

export const getConf = configurator.getConfig
