import { MarkAttrs, tinycolor } from '@pintora/core'
import { getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { PALETTE } from '../util/theme'
import { BaseFontConfig, defaultFontConfig, getFontConfigRules } from '../util/font-config'

function getColorsByPrimary(primary: string) {
  const t = tinycolor(primary)
  const l1NodeBgColor = t.clone().lighten(10).toString()
  const l2NodeBgColor = t.clone().lighten(20).toString()
  const nodeBgColor = t.clone().lighten(30).toString()
  return {
    nodeBgColor,
    l1NodeBgColor,
    l2NodeBgColor,
  }
}

const DEFAULT_COLORS = getColorsByPrimary(PALETTE.orange)

export type MindmapConf = BaseFontConfig & {
  diagramPadding: number
  layoutDirection: string

  useMaxWidth: boolean

  borderRadius: number

  nodeBgColor: string
  nodePadding: number
  nodeFontWeight: MarkAttrs['fontWeight']

  textColor: string
  edgeColor: string

  maxFontSize: number
  minFontSize: number

  levelDistance: number

  l1NodeBgColor: string
  l1NodeTextColor: string
  l2NodeBgColor: string
  l2NodeTextColor: string
}

export const defaultConfig: MindmapConf = {
  ...defaultFontConfig,
  diagramPadding: 15,
  layoutDirection: 'LR',

  useMaxWidth: false,

  borderRadius: 4,

  nodeBgColor: DEFAULT_COLORS.nodeBgColor,
  nodePadding: 10,
  nodeFontWeight: 'normal',

  textColor: PALETTE.normalDark,
  edgeColor: PALETTE.normalDark,

  maxFontSize: 18,
  minFontSize: 12,

  levelDistance: 40,

  l1NodeBgColor: DEFAULT_COLORS.l1NodeBgColor,
  l1NodeTextColor: PALETTE.normalDark,
  l2NodeBgColor: DEFAULT_COLORS.l2NodeBgColor,
  l2NodeTextColor: PALETTE.normalDark,
} as const

export const MINDMAP_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
  ...getFontConfigRules(),
  useMaxWidth: { valueType: 'boolean' },
  diagramPadding: { valueType: 'size' },
  layoutDirection: { valueType: 'layoutDirection' },
  borderRadius: { valueType: 'size' },
  nodeBgColor: { valueType: 'color' },
  nodePadding: { valueType: 'size' },
  textColor: { valueType: 'color' },
  edgeColor: { valueType: 'color' },
  maxFontSize: { valueType: 'size' },
  minFontSize: { valueType: 'size' },
  levelDistance: { valueType: 'size' },
  l1NodeBgColor: { valueType: 'color' },
  l1NodeTextColor: { valueType: 'color' },
  l2NodeBgColor: { valueType: 'color' },
  l2NodeTextColor: { valueType: 'color' },
} as const

export const configKey = 'mindmap'

const configurator = makeConfigurator<MindmapConf>({
  defaultConfig,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(MINDMAP_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t) {
    const { nodeBgColor, l1NodeBgColor, l2NodeBgColor } = getColorsByPrimary(t.primaryColor)
    const nodeBgColorInstance = tinycolor(nodeBgColor)
    const bgIsLight = nodeBgColorInstance.isLight()
    const textColorIsLight = tinycolor(t.textColor).isLight()
    const normalNodeTextColor = bgIsLight !== textColorIsLight ? t.textColor : t.canvasBackground
    return {
      nodeBgColor,
      textColor: normalNodeTextColor,
      edgeColor: t.primaryLineColor,
      l1NodeBgColor,
      l1NodeTextColor: t.textColor,
      l2NodeBgColor,
      l2NodeTextColor: t.textColor,
    }
  },
})

export const getConf = configurator.getConfig
