import { MarkAttrs, tinycolor } from '@pintora/core'
import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { DEFAULT_FONT_FAMILY } from '../util/text'
import { PALETTE } from '../util/theme'

export type ClassConf = {
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

  fontSize: number
  fontWeight: MarkAttrs['fontWeight']
  fontFamily: string
}

export const defaultConfig: ClassConf = {
  diagramPadding: 15,

  layoutDirection: 'TB',
  ranksep: 20,
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

  fontSize: 14,
  fontWeight: 'normal',
  fontFamily: DEFAULT_FONT_FAMILY,
} as const

export const CLASS_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
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
