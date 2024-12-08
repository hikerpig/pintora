import { PALETTE } from '../util/theme'
import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { defaultFontConfig, getFontConfigRules, type BaseFontConfig } from '../util/font-config'

export type ActivityConf = BaseFontConfig & {
  diagramPadding: number

  edgesep: number
  edgeType: EdgeType
  useMaxWidth: boolean

  actionPaddingX: number
  actionPaddingY: number

  actionBackground: string
  actionBorderColor: string

  groupBackground: string
  groupBorderColor: string

  textColor: string
  edgeColor: string

  keywordBackground: string

  noteTextColor: string
  noteMargin: number

  labelTextColor: string
  labelBackground: string
}

export const defaultConfig: ActivityConf = {
  ...defaultFontConfig,
  diagramPadding: 15,

  edgesep: 30,
  edgeType: 'polyline',
  useMaxWidth: false,

  actionPaddingX: 10,
  actionPaddingY: 10,
  actionBackground: PALETTE.orange,
  actionBorderColor: PALETTE.normalDark,

  groupBackground: PALETTE.white,
  groupBorderColor: PALETTE.normalDark,

  textColor: PALETTE.normalDark,
  edgeColor: PALETTE.normalDark,

  keywordBackground: PALETTE.normalDark,

  noteTextColor: PALETTE.normalDark,
  noteMargin: 10,

  labelTextColor: PALETTE.normalDark,
  labelBackground: PALETTE.white,
} as const

export const ACTIVITY_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
  ...getFontConfigRules(),

  actionPaddingX: { valueType: 'size' },
  actionPaddingY: { valueType: 'size' },
  actionBackground: { valueType: 'color' },
  actionBorderColor: { valueType: 'color' },

  groupBackground: { valueType: 'color' },
  groupBorderColor: { valueType: 'color' },

  textColor: { valueType: 'color' },
  edgeColor: { valueType: 'color' },

  keywordBackground: { valueType: 'color' },

  noteTextColor: { valueType: 'color' },
  noteMargin: { valueType: 'size' },

  labelBackground: { valueType: 'color' },
  labelTextColor: { valueType: 'color' },
} as const

export const configKey = 'activity'

const configurator = makeConfigurator<ActivityConf>({
  defaultConfig,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(ACTIVITY_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t) {
    return {
      actionBackground: t.primaryColor,
      actionBorderColor: t.primaryBorderColor,
      groupBackground: t.groupBackground,
      groupBorderColor: t.primaryBorderColor,
      textColor: t.textColor,
      edgeColor: t.primaryColor,
      keywordBackground: t.textColor,
      labelBackground: t.canvasBackground || t.background1,
      labelTextColor: t.textColor,
    }
  },
})

export const getConf = configurator.getConfig
