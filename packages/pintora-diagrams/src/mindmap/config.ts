import { configApi, DEFAULT_FONT_FAMILY, MarkAttrs, PintoraConfig, safeAssign, tinycolor } from '@pintora/core'
import { ConfigParam, interpreteConfigs, makeConfigurator } from '../util/style'
import { PALETTE } from '../util/theme'

export type MindmapConf = {
  diagramPadding: number
  layoutDirection: 'LR' | 'TB'

  // curvedEdge: boolean

  borderRadius: number

  /** default node color */
  nodeBgColor: string
  nodePadding: number
  /** font weight of node label */
  nodeFontWeight: MarkAttrs['fontWeight']

  textColor: string
  edgeColor: string

  maxFontSize: number
  minFontSize: number
  fontFamily: string

  levelDistance: number

  // node config for different levels
  l1NodeBgColor: string
  l1NodeTextColor: string
  l2NodeBgColor: string
  l2NodeTextColor: string
}

function getColorsByPrimary(c: string, isDark = false) {
  const primaryColor = tinycolor(c)
  const hslColor = primaryColor.toHsl()
  let primaryLight1: tinycolor.Instance
  if (isDark) {
    primaryLight1 = primaryColor.clone().brighten(15)
  } else {
    primaryLight1 = primaryColor.clone().brighten(15)
  }
  const primaryLight2 = tinycolor({ h: hslColor.h, s: 20, l: 90 })
  return {
    nodeBgColor: primaryLight2.toHexString(),
    l1NodeBgColor: c,
    l2NodeBgColor: primaryLight1.toHexString(),
  }
}

const DEFAULT_COLORS = getColorsByPrimary(PALETTE.orange)

export const defaultConfig: MindmapConf = {
  diagramPadding: 15,
  layoutDirection: 'LR',

  // curvedEdge: true,

  borderRadius: 4,

  nodeBgColor: DEFAULT_COLORS.nodeBgColor,
  nodePadding: 10,
  nodeFontWeight: 'normal',

  textColor: PALETTE.normalDark,
  edgeColor: PALETTE.normalDark,
  fontFamily: DEFAULT_FONT_FAMILY,

  maxFontSize: 18,
  minFontSize: 12,

  levelDistance: 40,

  l1NodeBgColor: DEFAULT_COLORS.l1NodeBgColor,
  l1NodeTextColor: PALETTE.normalDark,
  l2NodeBgColor: DEFAULT_COLORS.l2NodeBgColor,
  l2NodeTextColor: PALETTE.normalDark,
}

export const MINDMAP_PARAM_DIRECTIVE_RULES = {
  // curvedEdge: { valueType: 'boolean' },
  diagramPadding: { valueType: 'size' },
  layoutDirection: { valueType: 'layoutDirection' },
  borderRadius: { valueType: 'size' },
  nodeBgColor: { valueType: 'color' },
  nodePadding: { valueType: 'size' },
  textColor: { valueType: 'color' },
  edgeColor: { valueType: 'color' },
  maxFontSize: { valueType: 'size' },
  minFontSize: { valueType: 'size' },
  fontFamily: { valueType: 'string' },
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
    const { nodeBgColor, l1NodeBgColor, l2NodeBgColor } = getColorsByPrimary(t.primaryColor, t.isDark)
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
