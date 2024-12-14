import { PALETTE } from '../util/theme'
import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { BaseFontConfig, defaultFontConfig, getFontConfigRules } from '../util/font-config'

export type ComponentConf = BaseFontConfig & {
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
  lineWidth: number

  labelBackground: string

  interfaceSize: number

  useMaxWidth: boolean
  /**
   * By default there is a label in bottom-left of group to show its type, set this to true make the label disappear
   */
  hideGroupType: boolean
}

export const defaultConfig: ComponentConf = {
  ...defaultFontConfig,
  diagramPadding: 15,

  edgeType: 'polyline',
  edgesep: 20,
  ranksep: 40, // at least twice of bold fontsize + linewidth

  componentPadding: 15,
  componentBackground: PALETTE.yellow,
  componentBorderColor: PALETTE.orange,

  groupBackground: PALETTE.white,
  groupBorderColor: PALETTE.normalDark,
  groupBorderWidth: 2,

  relationLineColor: PALETTE.orange,
  textColor: PALETTE.normalDark,
  lineWidth: 1,

  labelBackground: PALETTE.white,

  interfaceSize: 16,

  useMaxWidth: false,

  hideGroupType: false,
}

export const COMPONENT_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
  ...getFontConfigRules(),
  componentBackground: { valueType: 'color' },
  componentBorderColor: { valueType: 'color' },
  groupBackground: { valueType: 'color' },
  groupBorderColor: { valueType: 'color' },
  relationLineColor: { valueType: 'color' },
  textColor: { valueType: 'color' },
  labelBackground: { valueType: 'color' },
  hideGroupType: { valueType: 'boolean' },
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
