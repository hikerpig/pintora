import { MarkAttrs, tinycolor, TLayoutDirection } from '@pintora/core'
import { getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { PALETTE } from '../util/theme'
import { BaseFontConfig, defaultFontConfig, getFontConfigRules } from '../util/font-config'

/**
 * Configuration for mindmap diagram
 */
export type MindmapConf = BaseFontConfig & {
  /**
   * Padding for the whole diagram
   */
  diagramPadding: number
  /**
   * The direction of the diagram's layout
   */
  layoutDirection: TLayoutDirection

  /**
   * Whether to use the maximum possible width for the diagram
   */
  useMaxWidth: boolean

  /**
   * The border radius for the diagram
   */
  borderRadius: number

  /**
   * The background color for nodes
   */
  nodeBgColor: string
  /**
   * The padding for nodes
   */
  nodePadding: number
  /** font weight of node label */
  nodeFontWeight: MarkAttrs['fontWeight']

  /**
   * The text color for nodes
   */
  textColor: string
  /**
   * The color for edges
   */
  edgeColor: string

  /**
   * The maximum font size for nodes
   */
  maxFontSize: number
  /**
   * The minimum font size for nodes
   */
  minFontSize: number

  /**
   * The distance between levels
   */
  levelDistance: number

  /**
   * The background color for level 1 nodes
   */
  l1NodeBgColor: string
  /**
   * The text color for level 1 nodes
   */
  l1NodeTextColor: string
  /**
   * The background color for level 2 nodes
   */
  l2NodeBgColor: string
  /**
   * The text color for level 2 nodes
   */
  l2NodeTextColor: string
}

function getColorsByPrimary(c: string) {
  const primaryColor = tinycolor(c)
  const hslColor = primaryColor.toHsl()
  const primaryLight1 = primaryColor.clone().brighten(15)
  const primaryLight2 = tinycolor({ h: hslColor.h, s: 20, l: 90 })
  return {
    nodeBgColor: primaryLight2.toHexString(),
    l1NodeBgColor: c,
    l2NodeBgColor: primaryLight1.toHexString(),
  }
}

const DEFAULT_COLORS = getColorsByPrimary(PALETTE.orange)

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
