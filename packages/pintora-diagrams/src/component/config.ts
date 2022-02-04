import { PALETTE } from '../util/theme'
import { DEFAULT_FONT_FAMILY } from '@pintora/core'
import { interpreteConfigs, makeConfigurator } from '../util/style'

export type ComponentConf = {
  diagramPadding: number

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
}

export const defaultConfig: ComponentConf = {
  diagramPadding: 15,

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
}

export const COMPONENT_PARAM_DIRECTIVE_RULES = {
  diagramPadding: { valueType: 'size' },
  componentPadding: { valueType: 'size' },
  componentBackground: { valueType: 'color' },
  componentBorderColor: { valueType: 'color' },
  groupBackground: { valueType: 'color' },
  groupBorderColor: { valueType: 'color' },
  groupBorderWidth: { valueType: 'size' },
  relationLineColor: { valueType: 'color' },
  textColor: { valueType: 'color' },
  fontFamily: { valueType: 'string' },
  lineWidth: { valueType: 'size' },
  labelBackground: { valueType: 'color' },
  interfaceSize: { valueType: 'size' },
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
