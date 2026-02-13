import { tinycolor } from '@pintora/core'
import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { PALETTE } from '../util/theme'
import { BaseFontConfig, defaultFontConfig, getFontConfigRules } from '../util/font-config'

export type ClassConf = BaseFontConfig & {
  diagramPadding: number

  layoutDirection: string
  ranksep: number
  nodesep: number
  edgesep: number
  edgeType: EdgeType

  entityBackground: string
  entityBorderColor: string
  entityBodyBackground: string
  entityTextColor: string
  labelBackground: string
  relationLineColor: string
  relationTextColor: string

  entityRadius: number

  noteMargin: number
  noteTextColor: string
}

export const defaultConfig: ClassConf = {
  ...defaultFontConfig,
  diagramPadding: 15,

  layoutDirection: 'TB',
  ranksep: 10,
  nodesep: 20,
  edgesep: 10,
  edgeType: 'polyline',

  entityBackground: PALETTE.orange,
  entityBorderColor: PALETTE.normalDark,
  entityBodyBackground: PALETTE.white,
  entityTextColor: PALETTE.normalDark,
  labelBackground: PALETTE.white,
  relationLineColor: PALETTE.normalDark,
  relationTextColor: PALETTE.normalDark,

  entityRadius: 2,

  noteMargin: 10,
  noteTextColor: PALETTE.normalDark,
} as const

export const CLASS_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
  ...getFontConfigRules(),
} as const

export const configKey = 'class'

const configurator = makeConfigurator<ClassConf>({
  defaultConfig,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(CLASS_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t) {
    const primaryCorlorInstance = tinycolor(t.primaryColor)
    const canvasBgInstance = tinycolor(t.canvasBackground || PALETTE.white)
    const isBgLight = canvasBgInstance.isLight()
    let relationLineColor: string
    if (isBgLight) {
      relationLineColor = PALETTE.normalDark
    } else {
      relationLineColor = PALETTE.white
    }

    const entityBodyBackground = primaryCorlorInstance.brighten(60).toHexString()
    return {
      entityBackground: t.primaryColor,
      entityBodyBackground,
      relationLineColor,
    }
  },
})

export const getConf = configurator.getConfig
