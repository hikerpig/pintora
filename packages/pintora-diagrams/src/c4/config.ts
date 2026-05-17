import { tinycolor } from '@pintora/core'
import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { BaseFontConfig, defaultFontConfig, getFontConfigRules } from '../util/font-config'
import { PALETTE } from '../util/theme'

export type C4Conf = BaseFontConfig & {
  diagramPadding: number
  layoutDirection: 'TB' | 'BT' | 'LR' | 'RL'
  edgeType: EdgeType
  nodesep: number
  edgesep: number
  ranksep: number
  elementPadding: number
  boundaryPadding: number
  personBackground: string
  systemBackground: string
  containerBackground: string
  componentBackground: string
  externalBackground: string
  boundaryBackground: string
  boundaryBorderColor: string
  relationLineColor: string
  labelBackground: string
  textColor: string
  lineWidth: number
  useMaxWidth: boolean
}

export const defaultConfig: C4Conf = {
  ...defaultFontConfig,
  diagramPadding: 15,
  layoutDirection: 'TB',
  edgeType: 'polyline',
  nodesep: 30,
  edgesep: 24,
  ranksep: 30,
  elementPadding: 12,
  boundaryPadding: 24,
  personBackground: PALETTE.orange,
  systemBackground: PALETTE.cyan,
  containerBackground: PALETTE.yellow,
  componentBackground: PALETTE.green,
  externalBackground: PALETTE.neutralGray,
  boundaryBackground: PALETTE.white,
  boundaryBorderColor: PALETTE.normalDark,
  relationLineColor: PALETTE.normalDark,
  labelBackground: PALETTE.white,
  textColor: PALETTE.normalDark,
  lineWidth: 1,
  useMaxWidth: false,
}

export const C4_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
  ...getFontConfigRules(),
  layoutDirection: { valueType: 'layoutDirection' },
  edgeType: { valueType: 'string' },
  personBackground: { valueType: 'color' },
  systemBackground: { valueType: 'color' },
  containerBackground: { valueType: 'color' },
  componentBackground: { valueType: 'color' },
  externalBackground: { valueType: 'color' },
  boundaryBackground: { valueType: 'color' },
  boundaryBorderColor: { valueType: 'color' },
  relationLineColor: { valueType: 'color' },
  labelBackground: { valueType: 'color' },
  textColor: { valueType: 'color' },
  useMaxWidth: { valueType: 'boolean' },
} as const

export const configKey = 'c4'

function readableTextOn(background: string, fallback: string) {
  return tinycolor(background).isLight() ? fallback : '#fff'
}

const configurator = makeConfigurator<C4Conf>({
  defaultConfig,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(C4_PARAM_DIRECTIVE_RULES, configParams) as Partial<C4Conf>
  },
  getConfigFromTheme(t) {
    console.log('groupBackground', t.groupBackground)
    return {
      personBackground: t.primaryColor,
      systemBackground: t.primaryColor,
      containerBackground: t.secondaryColor || t.primaryColor,
      componentBackground: t.teritaryColor || t.primaryColor,
      externalBackground: t.groupBackground || t.canvasBackground,
      boundaryBackground: t.canvasBackground || t.background1,
      boundaryBorderColor: t.primaryBorderColor,
      relationLineColor: t.primaryLineColor,
      labelBackground: t.canvasBackground || t.background1,
      textColor: readableTextOn(t.primaryColor, t.textColor),
    }
  },
})

export const getConf = configurator.getConfig
