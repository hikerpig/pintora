import { PALETTE } from '../util/theme'
import { DEFAULT_FONT_FAMILY } from '@pintora/core'
import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'

export type ComponentConf = {
  diagramPadding: number

  edgeType: EdgeType
  edgesep: number
  ranksep: number

  componentPadding: number
  componentBackground: string
  componentBorderColor: string

  groupBackground: string
  groupBorderColor: string
  groupBorderWidth: number

  relationLineColor: string
  textColor: string
  fontSize: number
  fontFamily: string
  lineWidth: number

  labelBackground: string

  interfaceSize: number

  useMaxWidth: boolean
}

export const defaultConfig: ComponentConf = {
  diagramPadding: 15,

  edgeType: 'polyline',
  edgesep: 20,
  ranksep: 40, // at leat twice of bold fontsize + linewidth

  componentPadding: 15,
  componentBackground: PALETTE.yellow,
  componentBorderColor: PALETTE.orange,

  groupBackground: PALETTE.white,
  groupBorderColor: PALETTE.normalDark,
  groupBorderWidth: 2,

  relationLineColor: PALETTE.orange,
  textColor: PALETTE.normalDark,
  fontSize: 14,
  fontFamily: DEFAULT_FONT_FAMILY,
  lineWidth: 1,

  labelBackground: PALETTE.white,

  interfaceSize: 16,

  useMaxWidth: false,
}

export const COMPONENT_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
  componentBackground: { valueType: 'color' },
  componentBorderColor: { valueType: 'color' },
  groupBackground: { valueType: 'color' },
  groupBorderColor: { valueType: 'color' },
  relationLineColor: { valueType: 'color' },
  textColor: { valueType: 'color' },
  labelBackground: { valueType: 'color' },
} as const

export const configKey = 'component'

const configurator = makeConfigurator<ComponentConf>({
  defaultConfig,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(COMPONENT_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t) {
    return {
      componentBackground: t.primaryColor,
      componentBorderColor: t.primaryBorderColor,
      groupBackground: t.groupBackground,
      groupBorderColor: t.primaryBorderColor,
      relationLineColor: t.primaryColor,
      labelBackground: t.canvasBackground || t.background1,
      textColor: t.textColor,
    }
  },
})

export const getConf = configurator.getConfig
